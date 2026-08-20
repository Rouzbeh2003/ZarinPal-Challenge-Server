from pathlib import Path
from typing import Any

from django.conf import settings
from django.contrib.auth.models import User
from django.db import connection
from django.http import HttpRequest
from django.utils import timezone
from ninja import Query, Router
from ninja.security import django_auth

from apps.analytics.api.schemas import (
    EvidenceListResponse,
    FunnelResponse,
    HealthResponse,
    IngestionRunResponse,
    InsightListResponse,
    InsightResponse,
    InsightTraceResponse,
    MerchantListResponse,
    MetricFilters,
    OverviewResponse,
    RetryResponse,
)
from apps.analytics.models import IngestionRun, Insight
from apps.analytics.repositories.duckdb_repository import DuckDbRepository
from apps.analytics.services.ingestion import IngestionService
from apps.analytics.services.insights import InsightQuery, InsightService
from apps.analytics.services.metrics import MetricQuery, MetricsService
from apps.merchants.models import Merchant, MerchantMembership

router = Router(tags=["analytics"])


@router.get("/health", response=HealthResponse, auth=None)
def health(request: HttpRequest) -> dict[str, str | None]:
    postgres_status = "up"
    analytic_status = "up"
    dataset_version = None
    try:
        connection.ensure_connection()
    except Exception:  # Health must report infrastructure failure instead of hiding it.
        postgres_status = "down"
    try:
        row = DuckDbRepository().fetch_one(
            "SELECT max(dataset_version) AS version FROM session_fact"
        )
        dataset_version = row["version"] if row else None
    except Exception:
        analytic_status = "not_ready"
    status = "ok" if postgres_status == "up" and analytic_status == "up" else "degraded"
    return {
        "status": status,
        "postgres": postgres_status,
        "analytic_store": analytic_status,
        "dataset_version": dataset_version,
    }


@router.get("/merchants", response=MerchantListResponse, auth=django_auth)
def list_merchants(request: HttpRequest, page: int = 1, page_size: int = 20) -> dict[str, Any]:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    merchants = Merchant.objects.filter(
        memberships__user=_authenticated_user(request), is_active=True
    ).order_by("merchant_key")
    offset = (page - 1) * page_size
    return {
        "items": list(
            merchants[offset : offset + page_size].values(
                "merchant_key", "category_id", "category_title"
            )
        ),
        "page": page,
        "page_size": page_size,
        "total": merchants.count(),
    }


@router.get("/merchants/{merchant_key}/overview", response=OverviewResponse, auth=django_auth)
def overview(
    request: HttpRequest, merchant_key: str, filters: Query[MetricFilters]
) -> dict[str, Any]:
    _require_merchant_access(request, merchant_key)
    return MetricsService().overview(_to_metric_query(merchant_key, filters))


@router.get("/merchants/{merchant_key}/payment-health", response=OverviewResponse, auth=django_auth)
def payment_health(
    request: HttpRequest, merchant_key: str, filters: Query[MetricFilters]
) -> dict[str, Any]:
    _require_merchant_access(request, merchant_key)
    return MetricsService().overview(_to_metric_query(merchant_key, filters))


@router.get("/merchants/{merchant_key}/funnel", response=FunnelResponse, auth=django_auth)
def funnel(
    request: HttpRequest, merchant_key: str, filters: Query[MetricFilters]
) -> dict[str, Any]:
    _require_merchant_access(request, merchant_key)
    return MetricsService().funnel(_to_metric_query(merchant_key, filters))


@router.get("/merchants/{merchant_key}/retry-analysis", response=RetryResponse, auth=django_auth)
def retry_analysis(
    request: HttpRequest, merchant_key: str, filters: Query[MetricFilters]
) -> dict[str, Any]:
    _require_merchant_access(request, merchant_key)
    return MetricsService().retry_analysis(_to_metric_query(merchant_key, filters))


@router.get("/merchants/{merchant_key}/insights", response=InsightListResponse, auth=django_auth)
def list_insights(
    request: HttpRequest, merchant_key: str, page: int = 1, page_size: int = 20
) -> dict[str, Any]:
    _require_merchant_access(request, merchant_key)
    page, page_size = _pagination(page, page_size)
    insights = Insight.objects.filter(merchant_key=merchant_key).order_by("-generated_at")
    offset = (page - 1) * page_size
    return {
        "items": [_serialize_insight(item) for item in insights[offset : offset + page_size]],
        "page": page,
        "page_size": page_size,
        "total": insights.count(),
    }


@router.get("/insights/{insight_id}", response=InsightResponse, auth=django_auth)
def get_insight(request: HttpRequest, insight_id: str) -> dict[str, Any]:
    insight = _accessible_insight(request, insight_id)
    return _serialize_insight(insight)


@router.get("/insights/{insight_id}/trace", response=InsightTraceResponse, auth=django_auth)
def get_insight_trace(request: HttpRequest, insight_id: str) -> dict[str, Any]:
    insight = _accessible_insight(request, insight_id)
    return {
        "trace_id": str(insight.id),
        "insight_id": str(insight.id),
        "trace": insight.trace,
        "generated_at": insight.generated_at,
    }


@router.get("/insights/{insight_id}/evidence", response=EvidenceListResponse, auth=django_auth)
def get_insight_evidence(
    request: HttpRequest, insight_id: str, page: int = 1, page_size: int = 50
) -> dict[str, Any]:
    insight = _accessible_insight(request, insight_id)
    page, page_size = _pagination(page, page_size)
    return InsightService().evidence(insight, page=page, page_size=page_size)


@router.get("/data-quality/latest", response=IngestionRunResponse, auth=django_auth)
def latest_data_quality(request: HttpRequest) -> IngestionRun:
    return IngestionRun.objects.filter(status=IngestionRun.Status.SUCCEEDED).latest("finished_at")


@router.post("/admin/ingestion-runs", response={201: IngestionRunResponse}, auth=django_auth)
def create_ingestion_run(request: HttpRequest) -> tuple[int, IngestionRun]:
    if not request.user.is_staff:
        raise PermissionError("Staff access is required")
    source_path = settings.BASE_DIR / "data/raw/other_challenge_data.csv.gz"
    run = IngestionRun.objects.create(source_name=source_path.name)
    try:
        result = IngestionService().ingest(Path(source_path))
        run.dataset_version = result.dataset_version
        run.rows_read = result.rows_read
        run.sessions_created = result.sessions_created
        run.quality_report = result.quality_report
        run.status = IngestionRun.Status.SUCCEEDED
        _synchronize_merchants()
    except Exception as error:
        run.status = IngestionRun.Status.FAILED
        run.error_message = str(error)
        raise
    finally:
        run.finished_at = timezone.now()
        run.save()
    return 201, run


@router.post(
    "/admin/analytics-refresh", response={201: InsightResponse, 204: None}, auth=django_auth
)
def refresh_analytics(
    request: HttpRequest, merchant_key: str, filters: Query[MetricFilters]
) -> tuple[int, dict[str, Any] | None]:
    if not request.user.is_staff:
        raise PermissionError("Staff access is required")
    insight = InsightService().generate(
        InsightQuery(
            merchant_key=merchant_key,
            date_from=filters.date_from,
            date_to=filters.date_to,
            terminal_key=filters.terminal_key,
            psp_code=filters.psp_code,
            issuer_bank_code=filters.issuer_bank_code,
            amount_bucket=filters.amount_bucket,
        )
    )
    return (201, _serialize_insight(insight)) if insight else (204, None)


def _require_merchant_access(request: HttpRequest, merchant_key: str) -> None:
    has_access = MerchantMembership.objects.filter(
        user=_authenticated_user(request),
        merchant__merchant_key=merchant_key,
        merchant__is_active=True,
    ).exists()
    if not has_access:
        raise PermissionError("You do not have access to this merchant")


def _authenticated_user(request: HttpRequest) -> User:
    if not request.user.is_authenticated:
        raise PermissionError("Authentication is required")
    return request.user


def _to_metric_query(merchant_key: str, filters: MetricFilters) -> MetricQuery:
    return MetricQuery(
        merchant_key=merchant_key,
        date_from=filters.date_from,
        date_to=filters.date_to,
        terminal_key=filters.terminal_key,
        psp_code=filters.psp_code,
        issuer_bank_code=filters.issuer_bank_code,
        amount_bucket=filters.amount_bucket,
    )


def _synchronize_merchants() -> None:
    rows = DuckDbRepository().fetch_all(
        "SELECT merchant_key, min(category_id) AS category_id, min(category_title) AS category_title FROM attempt_fact WHERE merchant_key IS NOT NULL GROUP BY merchant_key"
    )
    for row in rows:
        Merchant.objects.update_or_create(
            merchant_key=row["merchant_key"],
            defaults={
                "category_id": row["category_id"] or "",
                "category_title": row["category_title"] or "",
            },
        )


def _accessible_insight(request: HttpRequest, insight_id: str) -> Insight:
    try:
        insight = Insight.objects.get(id=insight_id)
    except (Insight.DoesNotExist, ValueError) as error:
        raise FileNotFoundError("Insight was not found") from error
    _require_merchant_access(request, insight.merchant_key)
    return insight


def _serialize_insight(insight: Insight) -> dict[str, Any]:
    return {
        "id": str(insight.id),
        "merchant_id": insight.merchant_key,
        "type": insight.insight_type,
        "severity": insight.severity,
        "title": insight.title,
        "summary": insight.summary,
        **insight.payload,
        "trace_id": str(insight.id),
        "generated_at": insight.generated_at,
    }


def _pagination(page: int, page_size: int) -> tuple[int, int]:
    return max(page, 1), min(max(page_size, 1), 100)
