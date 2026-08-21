import csv
import json
from pathlib import Path
from typing import Any

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import IntegrityError, connection, transaction
from django.http import HttpRequest, StreamingHttpResponse
from django.utils import timezone
from ninja import Query, Router
from ninja.errors import HttpError

from apps.analytics.api.schemas import (
    AccountUpdateRequest,
    AdvisorEvidenceResponse,
    AdvisorRequest,
    AdvisorResponse,
    AuthSessionResponse,
    DemoSessionResponse,
    EvidenceListResponse,
    FunnelResponse,
    HealthResponse,
    IngestionRunResponse,
    InsightListResponse,
    InsightResponse,
    InsightTraceResponse,
    LoginRequest,
    MerchantCredentialListResponse,
    MerchantListResponse,
    MetricFilters,
    OverviewResponse,
    RefreshRequest,
    RetryResponse,
    TokenResponse,
)
from apps.analytics.models import IngestionRun, Insight
from apps.analytics.repositories.duckdb_repository import DuckDbRepository
from apps.analytics.services.advisor import AdvisorQuery, MerchantAdvisorService
from apps.analytics.services.ingestion import IngestionService
from apps.analytics.services.insights import InsightQuery, InsightService
from apps.analytics.services.llm import OpenAiCompatibleNarrativeGenerator
from apps.analytics.services.metrics import MetricQuery, MetricsService
from apps.merchants.jwt import (
    InvalidTokenError,
    issue_token_pair,
    jwt_auth,
    revoke_refresh_token,
    rotate_refresh_token,
)
from apps.merchants.models import Merchant, MerchantMembership

router = Router(tags=["analytics"])


def _can_manage_merchant_credentials(user: Any) -> bool:
    """Grant credential management to real superusers and the local demo admin only."""
    return bool(
        user.is_superuser
        or (settings.ENABLE_DEMO_AUTH and user.is_staff)
    )


@router.get("/health", response=HealthResponse, auth=None)
def health(request: HttpRequest) -> dict[str, Any]:
    postgres_status = "up"
    analytic_status = "up"
    dataset_version = None
    data_date_from = None
    data_date_to = None
    try:
        connection.ensure_connection()
    except Exception:  # Health must report infrastructure failure instead of hiding it.
        postgres_status = "down"
    try:
        row = DuckDbRepository().fetch_one(
            "SELECT max(dataset_version) AS version, min(metric_date) AS data_date_from, "
            "max(metric_date) AS data_date_to FROM session_fact"
        )
        dataset_version = row["version"] if row else None
        data_date_from = row["data_date_from"] if row else None
        data_date_to = row["data_date_to"] if row else None
    except Exception:
        analytic_status = "not_ready"
    status = "ok" if postgres_status == "up" and analytic_status == "up" else "degraded"
    return {
        "status": status,
        "postgres": postgres_status,
        "analytic_store": analytic_status,
        "dataset_version": dataset_version,
        "data_date_from": data_date_from,
        "data_date_to": data_date_to,
    }


@router.post("/auth/demo-session", response=DemoSessionResponse, auth=None)
def demo_session(request: HttpRequest) -> dict[str, Any]:
    """Create a local-only authenticated session for the hackathon dashboard."""
    if not settings.ENABLE_DEMO_AUTH:
        raise FileNotFoundError("Demo authentication is disabled")
    _synchronize_merchants()
    user, _ = User.objects.get_or_create(username="demo-dashboard")
    if not user.is_staff:
        user.is_staff = True
        user.save(update_fields=["is_staff"])
    merchants = Merchant.objects.filter(is_active=True)
    MerchantMembership.objects.bulk_create(
        [MerchantMembership(user=user, merchant=merchant) for merchant in merchants],
        ignore_conflicts=True,
    )
    return {**issue_token_pair(user), "username": user.username, "merchant_count": merchants.count()}


@router.post("/auth/login", response=TokenResponse, auth=None)
def token_login(request: HttpRequest, payload: LoginRequest) -> dict[str, Any]:
    user = authenticate(request, username=payload.username, password=payload.password)
    if user is None or not user.is_active:
        raise HttpError(401, "Invalid username or password")
    # Super admins operate across the whole dashboard. Keep explicit memberships
    # in sync as well, so every existing merchant-scoped service recognizes them.
    if user.is_superuser:
        _synchronize_merchants()
        MerchantMembership.objects.bulk_create(
            [
                MerchantMembership(user=user, merchant=merchant)
                for merchant in Merchant.objects.filter(is_active=True)
            ],
            ignore_conflicts=True,
        )
    token_pair = issue_token_pair(user)
    token_pair["is_superuser"] = _can_manage_merchant_credentials(user)
    return token_pair


@router.get("/auth/session", response=AuthSessionResponse, auth=jwt_auth)
def auth_session(request: HttpRequest) -> dict[str, Any]:
    user = _authenticated_user(request)
    return {
        "username": user.username,
        "is_superuser": _can_manage_merchant_credentials(user),
    }


@router.put("/auth/account", response=AuthSessionResponse, auth=jwt_auth)
def update_account(request: HttpRequest, payload: AccountUpdateRequest) -> dict[str, Any]:
    user = _authenticated_user(request)
    if not user.check_password(payload.current_password):
        raise HttpError(400, "Current password is incorrect")

    username = payload.username.strip()
    if not username:
        raise HttpError(422, "Username cannot be empty")

    user.username = username
    if payload.new_password:
        user.set_password(payload.new_password)
    try:
        with transaction.atomic():
            user.save()
    except IntegrityError as error:
        raise HttpError(409, "Username is already in use") from error

    return {
        "username": user.username,
        "is_superuser": _can_manage_merchant_credentials(user),
    }


@router.get(
    "/admin/merchant-credentials",
    response=MerchantCredentialListResponse,
    auth=jwt_auth,
)
def merchant_credentials(request: HttpRequest) -> dict[str, Any]:
    """Return seeded merchant logins to superusers only."""
    if not _can_manage_merchant_credentials(request.user):
        raise PermissionError("Superuser access is required")

    credentials_candidates = (
        Path(settings.BASE_DIR) / "merchant_credentials.csv",  # Docker mount
        Path(settings.BASE_DIR).parent / "merchant_credentials.csv",  # local checkout
    )
    credentials_path = next((path for path in credentials_candidates if path.exists()), None)
    credentials: dict[str, dict[str, str]] = {}
    if credentials_path is not None:
        with credentials_path.open(encoding="utf-8-sig", newline="") as source:
            credentials = {row["merchant_key"]: row for row in csv.DictReader(source)}

    items = []
    for merchant in Merchant.objects.order_by("merchant_key"):
        credential = credentials.get(merchant.merchant_key, {})
        items.append(
            {
                "merchant_key": merchant.merchant_key,
                "category_title": merchant.category_title,
                "username": credential.get("username", ""),
                "password": credential.get("password", ""),
            }
        )
    return {"items": items}


@router.post("/auth/refresh", response=TokenResponse, auth=None)
def token_refresh(request: HttpRequest, payload: RefreshRequest) -> dict[str, Any]:
    try:
        return rotate_refresh_token(payload.refresh_token)
    except InvalidTokenError as error:
        raise HttpError(401, str(error)) from error


@router.post("/auth/logout", response={204: None}, auth=None)
def token_logout(request: HttpRequest, payload: RefreshRequest) -> tuple[int, None]:
    try:
        revoke_refresh_token(payload.refresh_token)
    except InvalidTokenError as error:
        raise HttpError(401, str(error)) from error
    return 204, None


@router.post(
    "/auth/demo-analytics-refresh",
    response={201: InsightResponse, 204: None},
    auth=None,
)
def demo_analytics_refresh(
    request: HttpRequest, merchant_key: str, filters: Query[MetricFilters]
) -> tuple[int, dict[str, Any] | None]:
    """Generate an insight without CSRF only in the local development environment."""
    if not settings.ENABLE_DEMO_AUTH:
        raise FileNotFoundError("Demo analytics refresh is disabled")
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


@router.get("/merchants", response=MerchantListResponse, auth=jwt_auth)
def list_merchants(request: HttpRequest, page: int = 1, page_size: int = 20) -> dict[str, Any]:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    user = _authenticated_user(request)
    merchants = Merchant.objects.filter(is_active=True)
    if not user.is_superuser:
        merchants = merchants.filter(memberships__user=user)
    merchants = merchants.order_by("merchant_key")
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


@router.get("/merchants/{merchant_key}/overview", response=OverviewResponse, auth=jwt_auth)
def overview(
    request: HttpRequest, merchant_key: str, filters: Query[MetricFilters]
) -> dict[str, Any]:
    _require_merchant_access(request, merchant_key)
    return MetricsService().overview(_to_metric_query(merchant_key, filters))


@router.get("/merchants/{merchant_key}/payment-health", response=OverviewResponse, auth=jwt_auth)
def payment_health(
    request: HttpRequest, merchant_key: str, filters: Query[MetricFilters]
) -> dict[str, Any]:
    _require_merchant_access(request, merchant_key)
    return MetricsService().overview(_to_metric_query(merchant_key, filters))


@router.get("/merchants/{merchant_key}/funnel", response=FunnelResponse, auth=jwt_auth)
def funnel(
    request: HttpRequest, merchant_key: str, filters: Query[MetricFilters]
) -> dict[str, Any]:
    _require_merchant_access(request, merchant_key)
    return MetricsService().funnel(_to_metric_query(merchant_key, filters))


@router.get("/merchants/{merchant_key}/retry-analysis", response=RetryResponse, auth=jwt_auth)
def retry_analysis(
    request: HttpRequest, merchant_key: str, filters: Query[MetricFilters]
) -> dict[str, Any]:
    _require_merchant_access(request, merchant_key)
    return MetricsService().retry_analysis(_to_metric_query(merchant_key, filters))


@router.post("/merchants/{merchant_key}/advisor", response=AdvisorResponse, auth=jwt_auth)
def merchant_advisor(
    request: HttpRequest, merchant_key: str, payload: AdvisorRequest
) -> dict[str, Any]:
    """Return multi-dimensional evidence and optional grounded LLM guidance."""
    _require_merchant_access(request, merchant_key)
    narrative_generator = None
    if settings.LLM_API_URL and settings.LLM_API_KEY and settings.LLM_MODEL:
        narrative_generator = OpenAiCompatibleNarrativeGenerator(
            api_url=settings.LLM_API_URL,
            api_key=settings.LLM_API_KEY,
            model=settings.LLM_MODEL,
            timeout_seconds=settings.LLM_TIMEOUT_SECONDS,
        )
    merchant = Merchant.objects.get(merchant_key=merchant_key, is_active=True)
    peer_keys = list(
        Merchant.objects.filter(
            is_active=True, category_id=merchant.category_id
        ).exclude(merchant_key=merchant_key).values_list("merchant_key", flat=True)
    ) if merchant.category_id else []
    return MerchantAdvisorService(narrative_generator=narrative_generator).analyze(
        AdvisorQuery(
            merchant_key=merchant_key,
            date_from=payload.date_from,
            date_to=payload.date_to,
            question=payload.question,
            terminal_key=payload.terminal_key,
            psp_code=payload.psp_code,
            issuer_bank_code=payload.issuer_bank_code,
            amount_bucket=payload.amount_bucket,
            category_id=merchant.category_id,
            category_title=merchant.category_title,
            peer_merchant_keys=tuple(peer_keys),
        )
    )


@router.post("/merchants/{merchant_key}/advisor/stream", auth=jwt_auth)
def merchant_advisor_stream(
    request: HttpRequest, merchant_key: str, payload: AdvisorRequest
) -> StreamingHttpResponse:
    """Stream LLM JSON deltas as NDJSON, followed by the validated narrative."""
    _require_merchant_access(request, merchant_key)
    merchant = Merchant.objects.get(merchant_key=merchant_key, is_active=True)
    peer_keys = list(
        Merchant.objects.filter(is_active=True, category_id=merchant.category_id)
        .exclude(merchant_key=merchant_key)
        .values_list("merchant_key", flat=True)
    ) if merchant.category_id else []
    query = AdvisorQuery(
        merchant_key=merchant_key,
        date_from=payload.date_from,
        date_to=payload.date_to,
        question=payload.question,
        terminal_key=payload.terminal_key,
        psp_code=payload.psp_code,
        issuer_bank_code=payload.issuer_bank_code,
        amount_bucket=payload.amount_bucket,
        category_id=merchant.category_id,
        category_title=merchant.category_title,
        peer_merchant_keys=tuple(peer_keys),
    )

    def events() -> Any:
        if not (settings.LLM_API_URL and settings.LLM_API_KEY and settings.LLM_MODEL):
            yield json.dumps({"type": "error", "message": "LLM is not configured"}) + "\n"
            return
        report = MerchantAdvisorService().analyze(query)
        evidence = {
            key: report[key]
            for key in ("overview", "retry", "dimensions", "trends", "peer_comparison", "predicted_needs", "recommendations")
        }
        generator = OpenAiCompatibleNarrativeGenerator(
            api_url=settings.LLM_API_URL,
            api_key=settings.LLM_API_KEY,
            model=settings.LLM_MODEL,
            timeout_seconds=settings.LLM_TIMEOUT_SECONDS,
        )
        content = ""
        try:
            for delta in generator.generate_stream(question=payload.question, evidence=evidence):
                content += delta
                yield json.dumps({"type": "delta", "content": delta}, ensure_ascii=False) + "\n"
            narrative = generator.validate_streamed_content(content)
            yield json.dumps(
                {"type": "complete", "narrative": narrative, "source": "llm"},
                ensure_ascii=False,
            ) + "\n"
        except (OSError, TimeoutError, ValueError, json.JSONDecodeError) as error:
            yield json.dumps({"type": "error", "message": str(error)}, ensure_ascii=False) + "\n"

    response = StreamingHttpResponse(events(), content_type="application/x-ndjson; charset=utf-8")
    response["Cache-Control"] = "no-cache, no-transform"
    response["X-Accel-Buffering"] = "no"
    return response


@router.get(
    "/merchants/{merchant_key}/advisor/evidence",
    response=AdvisorEvidenceResponse,
    auth=jwt_auth,
)
def merchant_advisor_evidence(
    request: HttpRequest,
    merchant_key: str,
    filters: Query[MetricFilters],
    page: int = 1,
    page_size: int = 10,
) -> dict[str, Any]:
    """Page through all sessions matching the advisor's selected report filters."""
    _require_merchant_access(request, merchant_key)
    page, page_size = _pagination(page, page_size)
    return MerchantAdvisorService().transaction_evidence(
        _to_metric_query(merchant_key, filters), page=page, page_size=page_size
    )


@router.get("/merchants/{merchant_key}/insights", response=InsightListResponse, auth=jwt_auth)
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


@router.get("/insights/{insight_id}", response=InsightResponse, auth=jwt_auth)
def get_insight(request: HttpRequest, insight_id: str) -> dict[str, Any]:
    insight = _accessible_insight(request, insight_id)
    return _serialize_insight(insight)


@router.get("/insights/{insight_id}/trace", response=InsightTraceResponse, auth=jwt_auth)
def get_insight_trace(request: HttpRequest, insight_id: str) -> dict[str, Any]:
    insight = _accessible_insight(request, insight_id)
    return {
        "trace_id": str(insight.id),
        "insight_id": str(insight.id),
        "trace": insight.trace,
        "generated_at": insight.generated_at,
    }


@router.get("/insights/{insight_id}/evidence", response=EvidenceListResponse, auth=jwt_auth)
def get_insight_evidence(
    request: HttpRequest, insight_id: str, page: int = 1, page_size: int = 50
) -> dict[str, Any]:
    insight = _accessible_insight(request, insight_id)
    page, page_size = _pagination(page, page_size)
    return InsightService().evidence(insight, page=page, page_size=page_size)


@router.get("/data-quality/latest", response=IngestionRunResponse, auth=jwt_auth)
def latest_data_quality(request: HttpRequest) -> IngestionRun:
    if not request.user.is_staff:
        raise PermissionError("Staff access is required")
    return IngestionRun.objects.filter(status=IngestionRun.Status.SUCCEEDED).latest("finished_at")


@router.post("/admin/ingestion-runs", response={201: IngestionRunResponse}, auth=jwt_auth)
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
    "/admin/analytics-refresh", response={201: InsightResponse, 204: None}, auth=jwt_auth
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
    user = _authenticated_user(request)
    if user.is_superuser and Merchant.objects.filter(
        merchant_key=merchant_key, is_active=True
    ).exists():
        return
    has_access = MerchantMembership.objects.filter(
        user=user,
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
