from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from django.db import transaction

from apps.analytics.insights.domain import (
    InsightPolicy,
    assess_rate_change,
    determine_severity,
    estimate_financial_impact,
)
from apps.analytics.metrics.registry import METRIC_VERSION, METRICS
from apps.analytics.models import IngestionRun, Insight
from apps.analytics.repositories.duckdb_repository import DuckDbRepository
from apps.analytics.services.metrics import MetricQuery, MetricsService, _build_filters


@dataclass(frozen=True)
class InsightQuery:
    merchant_key: str
    date_from: date
    date_to: date
    terminal_key: str | None = None
    psp_code: str | None = None
    issuer_bank_code: str | None = None
    amount_bucket: str | None = None

    def as_metric_query(self, date_from: date, date_to: date) -> MetricQuery:
        return MetricQuery(
            merchant_key=self.merchant_key,
            date_from=date_from,
            date_to=date_to,
            terminal_key=self.terminal_key,
            psp_code=self.psp_code,
            issuer_bank_code=self.issuer_bank_code,
            amount_bucket=self.amount_bucket,
        )


class InsightService:
    def __init__(
        self, repository: DuckDbRepository | None = None, policy: InsightPolicy | None = None
    ) -> None:
        self.repository = repository or DuckDbRepository()
        self.policy = policy or InsightPolicy()
        self.metrics = MetricsService(self.repository)

    def generate(self, query: InsightQuery) -> Insight | None:
        baseline_start, baseline_end = _previous_equal_period(query.date_from, query.date_to)
        current_query = query.as_metric_query(query.date_from, query.date_to)
        baseline_query = query.as_metric_query(baseline_start, baseline_end)
        current = self.metrics.overview(current_query)
        baseline = self.metrics.overview(baseline_query)
        assessment = assess_rate_change(
            current_successes=int(current["successful_sessions"]),
            current_total=int(current["valid_sessions"]),
            baseline_successes=int(baseline["successful_sessions"]),
            baseline_total=int(baseline["valid_sessions"]),
            policy=self.policy,
        )
        if not assessment.is_actionable:
            return None

        average_amount = _average_successful_amount(current)
        is_drop = assessment.absolute_change < 0
        financial_impact = (
            estimate_financial_impact(
                expected_success_rate=assessment.baseline_rate,
                actual_successes=int(current["successful_sessions"]),
                current_sessions=int(current["valid_sessions"]),
                average_successful_amount=average_amount,
            )
            if is_drop
            else 0
        )
        drivers = self._find_drivers(current_query, baseline_query, is_drop=is_drop)
        quality = self._analysis_quality(current_query, baseline_query)
        adjusted = self._adjusted_analysis(current_query, baseline_query)
        dataset_version = self._dataset_version()
        insight_type = "payment_success_drop" if is_drop else "payment_success_improvement"
        severity = determine_severity(
            assessment.absolute_change, financial_impact, int(baseline["successful_amount"])
        )
        payload = self._build_payload(
            query,
            baseline_start,
            baseline_end,
            assessment,
            financial_impact,
            drivers,
            quality,
            adjusted,
        )
        trace = self._build_trace(
            query,
            baseline_start,
            baseline_end,
            current,
            baseline,
            drivers,
            dataset_version,
            quality,
            adjusted,
        )
        title, summary = _narrative(assessment.absolute_change, drivers, is_drop)
        with transaction.atomic():
            Insight.objects.filter(
                merchant_key=query.merchant_key,
                insight_type=insight_type,
                period_start=query.date_from,
                period_end=query.date_to,
            ).delete()
            insight = Insight.objects.create(
                merchant_key=query.merchant_key,
                insight_type=insight_type,
                severity=severity.value,
                title=title,
                summary=summary,
                payload=payload,
                trace=trace,
                dataset_version=dataset_version,
                metric_version=METRIC_VERSION,
                period_start=query.date_from,
                period_end=query.date_to,
                baseline_start=baseline_start,
                baseline_end=baseline_end,
            )
        return insight

    def evidence(self, insight: Insight, *, page: int, page_size: int) -> dict[str, Any]:
        filters = insight.trace["filters"]
        metric_query = MetricQuery(
            merchant_key=insight.merchant_key,
            date_from=insight.period_start,
            date_to=insight.period_end,
            terminal_key=filters.get("terminal_key"),
            psp_code=filters.get("psp_code"),
            issuer_bank_code=filters.get("issuer_bank_code"),
            amount_bucket=filters.get("amount_bucket"),
        )
        where_sql, parameters = _build_filters(metric_query)
        where_sql += " AND dataset_version = ?"
        parameters.append(insight.dataset_version)
        count_row = self.repository.fetch_one(
            f"SELECT count(*) AS total FROM session_fact WHERE {where_sql}", parameters
        ) or {"total": 0}
        parameters.extend([page_size, (page - 1) * page_size])
        rows = self.repository.fetch_all(
            f"""
            SELECT session_key, metric_date, amount, final_status, attempts_count,
                   final_psp_code, final_issuer_bank_code,
                   CASE WHEN payer_card_key IS NULL THEN NULL
                        ELSE concat('***', right(payer_card_key, 4)) END AS payer_card_masked
            FROM session_fact WHERE {where_sql}
            ORDER BY metric_date, session_key LIMIT ? OFFSET ?
            """,
            parameters,
        )
        return {"items": rows, "page": page, "page_size": page_size, "total": count_row["total"]}

    def _find_drivers(
        self, current: MetricQuery, baseline: MetricQuery, *, is_drop: bool
    ) -> list[dict[str, Any]]:
        dimensions = {
            "psp": "final_psp_code",
            "issuer_bank": "final_issuer_bank_code",
            "terminal": "terminal_key",
            "amount_bucket": "amount_bucket",
            "attempts_count": "attempts_count",
            "hour": "extract(hour FROM first_attempt_at)",
            "day_of_week": "extract(dow FROM first_attempt_at)",
        }
        drivers: list[dict[str, Any]] = []
        for dimension, expression in dimensions.items():
            current_rows = self._breakdown(current, expression)
            baseline_rows = self._breakdown(baseline, expression)
            baseline_by_value = {str(row["value"]): row for row in baseline_rows}
            for row in current_rows:
                comparison = baseline_by_value.get(str(row["value"]))
                if comparison is None:
                    continue
                current_rate = _row_rate(row)
                baseline_rate = _row_rate(comparison)
                change = current_rate - baseline_rate
                if (is_drop and change >= 0) or (not is_drop and change <= 0):
                    continue
                contribution = abs(change) * int(row["total"])
                drivers.append(
                    {
                        "dimension": dimension,
                        "value": str(row["value"] or "unknown"),
                        "current_rate": current_rate,
                        "baseline_rate": baseline_rate,
                        "absolute_change": change,
                        "current_sessions": int(row["total"]),
                        "contribution_score": contribution,
                        "claim": "associated_with_change",
                    }
                )
        drivers.sort(key=lambda item: item["contribution_score"], reverse=True)
        return drivers[: self.policy.maximum_drivers]

    def _breakdown(self, query: MetricQuery, expression: str) -> list[dict[str, Any]]:
        where_sql, parameters = _build_filters(query)
        return self.repository.fetch_all(
            f"""SELECT {expression} AS value, count(*) AS total,
                       count(*) FILTER (WHERE is_successful) AS successful
                FROM session_fact WHERE {where_sql} AND final_status != 'excluded'
                GROUP BY {expression}""",
            parameters,
        )

    def _dataset_version(self) -> str:
        row = self.repository.fetch_one("SELECT max(dataset_version) AS version FROM session_fact")
        if not row or not row["version"]:
            raise RuntimeError("No active analytics dataset is available")
        return str(row["version"])

    def _analysis_quality(
        self, current: MetricQuery, baseline: MetricQuery
    ) -> dict[str, Any]:
        counts = {
            "input_records": 0,
            "excluded_records": 0,
            "metric_analyzed_records": 0,
            "metric_null_records": 0,
            "adjusted_analyzed_records": 0,
            "adjusted_null_records": 0,
        }
        for metric_query in (current, baseline):
            where_sql, parameters = _build_filters(metric_query)
            row = self.repository.fetch_one(
                f"""SELECT count(*) AS input_records,
                           count(*) FILTER (WHERE final_status = 'excluded') AS excluded_records,
                           count(*) FILTER (WHERE final_status IS DISTINCT FROM 'excluded'
                               AND final_status IS NOT NULL AND is_successful IS NOT NULL)
                               AS metric_analyzed_records,
                           count(*) FILTER (WHERE final_status IS DISTINCT FROM 'excluded' AND
                               (final_status IS NULL OR is_successful IS NULL))
                               AS metric_null_records,
                           count(*) FILTER (WHERE final_status IS DISTINCT FROM 'excluded'
                               AND final_status IS NOT NULL AND is_successful IS NOT NULL
                               AND amount IS NOT NULL AND final_psp_code IS NOT NULL
                               AND amount_bucket IS NOT NULL) AS adjusted_analyzed_records,
                           count(*) FILTER (WHERE final_status IS DISTINCT FROM 'excluded' AND
                               (final_status IS NULL OR is_successful IS NULL OR amount IS NULL
                                OR final_psp_code IS NULL OR amount_bucket IS NULL))
                               AS adjusted_null_records
                    FROM session_fact WHERE {where_sql}""",
                parameters,
            ) or {}
            for key in counts:
                counts[key] += int(row.get(key, 0))
        return {
            **counts,
            "metric_coverage": (
                counts["metric_analyzed_records"] / counts["input_records"]
                if counts["input_records"] else 0.0
            ),
            "adjusted_coverage": (
                counts["adjusted_analyzed_records"] / counts["input_records"]
                if counts["input_records"] else 0.0
            ),
        }

    def _adjusted_analysis(
        self, current: MetricQuery, baseline: MetricQuery
    ) -> dict[str, Any]:
        """Directly standardize period rates to the baseline PSP/amount mix."""
        current_rows = self._breakdown(current, "concat(final_psp_code, '|', amount_bucket)")
        baseline_rows = self._breakdown(baseline, "concat(final_psp_code, '|', amount_bucket)")
        current_by_stratum = {str(row["value"]): row for row in current_rows if row["value"]}
        baseline_by_stratum = {str(row["value"]): row for row in baseline_rows if row["value"]}
        shared = set(current_by_stratum) & set(baseline_by_stratum)
        shared_baseline_sessions = sum(int(baseline_by_stratum[key]["total"]) for key in shared)
        all_baseline_sessions = sum(int(row["total"]) for row in baseline_rows)
        if not shared_baseline_sessions:
            return {
                "method": "direct_standardization_psp_amount_bucket",
                "raw_effect": None,
                "adjusted_effect": None,
                "current_adjusted_rate": None,
                "baseline_adjusted_rate": None,
                "common_support_coverage": 0.0,
                "strata_count": 0,
            }
        current_adjusted = sum(
            _row_rate(current_by_stratum[key]) * int(baseline_by_stratum[key]["total"])
            for key in shared
        ) / shared_baseline_sessions
        baseline_adjusted = sum(
            _row_rate(baseline_by_stratum[key]) * int(baseline_by_stratum[key]["total"])
            for key in shared
        ) / shared_baseline_sessions
        current_total = sum(int(row["total"]) for row in current_rows)
        baseline_total = sum(int(row["total"]) for row in baseline_rows)
        current_raw = sum(int(row["successful"]) for row in current_rows) / current_total
        baseline_raw = sum(int(row["successful"]) for row in baseline_rows) / baseline_total
        return {
            "method": "direct_standardization_psp_amount_bucket",
            "raw_effect": current_raw - baseline_raw,
            "adjusted_effect": current_adjusted - baseline_adjusted,
            "current_adjusted_rate": current_adjusted,
            "baseline_adjusted_rate": baseline_adjusted,
            "common_support_coverage": shared_baseline_sessions / all_baseline_sessions
            if all_baseline_sessions else 0.0,
            "strata_count": len(shared),
        }

    def _build_payload(
        self,
        query: InsightQuery,
        baseline_start: date,
        baseline_end: date,
        assessment: Any,
        financial_impact: int,
        drivers: list[dict[str, Any]],
        quality: dict[str, Any],
        adjusted: dict[str, Any],
    ) -> dict[str, Any]:
        is_drop = assessment.absolute_change < 0
        return {
            "metric": {
                "name": "success_rate",
                "current": assessment.current_rate,
                "baseline": assessment.baseline_rate,
                "absolute_change": assessment.absolute_change,
                "relative_change": assessment.relative_change,
            },
            "financial_impact": {
                "amount": financial_impact,
                "currency": "IRR",
                "method": "Estimated missing successful sessions at baseline rate multiplied by current average successful session amount; potential impact, not confirmed loss.",
            },
            "drivers": drivers,
            "recommended_actions": _recommended_actions(
                drivers,
                is_drop,
                assessment,
                financial_impact,
                query,
                self.policy.target_gap_recovery_fraction,
            ),
            "confidence": assessment.confidence,
            "coverage": quality["metric_coverage"],
            "coverage_details": quality,
            "adjusted_analysis": adjusted,
            "action_plan": {
                "potential_financial_impact": round(
                    financial_impact * self.policy.target_gap_recovery_fraction
                ),
                "currency": "IRR",
                "impact_is_additive": False,
                "note": "اقدام‌ها مسیرهای جایگزین یا هم‌پوشان برای بازیابی یک ظرفیت مالی مشترک‌اند و اثر آن‌ها قابل جمع نیست.",
            },
            "period": {
                "date_from": query.date_from.isoformat(),
                "date_to": query.date_to.isoformat(),
            },
            "baseline_period": {
                "date_from": baseline_start.isoformat(),
                "date_to": baseline_end.isoformat(),
                "method": "previous_equal_length_period",
            },
        }

    def _build_trace(
        self,
        query: InsightQuery,
        baseline_start: date,
        baseline_end: date,
        current: dict[str, Any],
        baseline: dict[str, Any],
        drivers: list[dict[str, Any]],
        dataset_version: str,
        quality: dict[str, Any],
        adjusted: dict[str, Any],
    ) -> dict[str, Any]:
        definition = METRICS["success_rate"]
        return {
            "metric_name": definition.name,
            "metric_definition_version": definition.version,
            "metric_definition": definition.definition,
            "grain": definition.grain,
            "dataset_version": dataset_version,
            "ingestion_run_id": _ingestion_run_id(dataset_version),
            "merchant_key": query.merchant_key,
            "period": {
                "date_from": query.date_from.isoformat(),
                "date_to": query.date_to.isoformat(),
            },
            "baseline": {
                "definition": "previous_equal_length_period",
                "date_from": baseline_start.isoformat(),
                "date_to": baseline_end.isoformat(),
            },
            "filters": {
                "terminal_key": query.terminal_key,
                "psp_code": query.psp_code,
                "issuer_bank_code": query.issuer_bank_code,
                "amount_bucket": query.amount_bucket,
            },
            "current_calculation": {
                "numerator": current["successful_sessions"],
                "denominator": current["valid_sessions"],
                "input_records": current["input_sessions"],
                "excluded_records": current["excluded_sessions"],
            },
            "baseline_calculation": {
                "numerator": baseline["successful_sessions"],
                "denominator": baseline["valid_sessions"],
                "input_records": baseline["input_sessions"],
                "excluded_records": baseline["excluded_sessions"],
            },
            "missing_data_coverage": quality["metric_coverage"],
            "coverage_details": quality,
            "adjusted_analysis": adjusted,
            "breakdowns": drivers,
            "calculation_id": "success-rate-change-v1",
            "query_parameters": {"merchant_key": query.merchant_key},
            "policy": self.policy.__dict__,
            "target_policy": {
                "name": "partial_gap_recovery",
                "recovery_fraction": self.policy.target_gap_recovery_fraction,
                "rationale": "هدف میانی محافظه‌کارانه برای برنامه‌ریزی است، نه مقداری استنتاج‌شده از داده.",
                "configurable": True,
                "is_data_derived": False,
                "estimate_is_certain": False,
            },
        }


def _previous_equal_period(date_from: date, date_to: date) -> tuple[date, date]:
    duration = date_to - date_from + timedelta(days=1)
    return date_from - duration, date_from - timedelta(days=1)


def _average_successful_amount(metrics: dict[str, Any]) -> float:
    count = int(metrics["successful_sessions"])
    return int(metrics["successful_amount"]) / count if count else 0.0


def _row_rate(row: dict[str, Any]) -> float:
    return int(row["successful"]) / int(row["total"]) if row["total"] else 0.0


def _narrative(change: float, drivers: list[dict[str, Any]], is_drop: bool) -> tuple[str, str]:
    direction = "افت" if is_drop else "بهبود"
    title = f"{direction} معنادار نرخ موفقیت پرداخت"
    magnitude = abs(change) * 100
    if drivers:
        driver = drivers[0]
        summary = f"نرخ موفقیت {magnitude:.1f} واحد درصد تغییر کرده و این تغییر عمدتاً با {driver['dimension']}={driver['value']} هم‌زمان بوده است. این رابطه علّی نیست."
    else:
        summary = f"نرخ موفقیت {magnitude:.1f} واحد درصد تغییر کرده است؛ عامل غالب قابل دفاعی در ابعاد موجود پیدا نشد."
    return title, summary


def _recommended_actions(
    drivers: list[dict[str, Any]],
    is_drop: bool,
    assessment: Any,
    financial_impact: int,
    query: InsightQuery,
    recovery_fraction: float,
) -> list[dict[str, Any]]:
    horizon_days = (query.date_to - query.date_from).days + 1
    if not is_drop:
        return [{
            "action": "monitor_change",
            "reason": "پایداری بهبود را در یک دوره هم‌اندازه بررسی کنید.",
            "target_metric": "success_rate",
            "target_value": assessment.current_rate,
            "horizon_days": horizon_days,
            "potential_financial_impact": 0,
            "currency": "IRR",
        }]
    target_rate = assessment.current_rate + (
        assessment.baseline_rate - assessment.current_rate
    ) * recovery_fraction
    recoverable_impact = round(financial_impact * recovery_fraction)
    actions = [
        {
            "action": "inspect_payment_failures",
            "reason": "با رفع خطاهای پرتکرار، نیمی از شکاف نرخ موفقیت تا خط پایه بازیابی شود.",
            "target_metric": "success_rate",
            "target_value": target_rate,
            "horizon_days": horizon_days,
            "potential_financial_impact": recoverable_impact,
            "impact_scope": "shared_action_plan_capacity",
            "impact_is_additive": False,
            "currency": "IRR",
        }
    ]
    if drivers:
        actions.append(
            {
                "action": "review_driver_segment",
                "reason": f"بخش {drivers[0]['dimension']}={drivers[0]['value']} بیشترین ارتباط عددی را با افت دارد.",
                "target_metric": "segment_success_rate",
                "target_value": drivers[0]["current_rate"] + (
                    drivers[0]["baseline_rate"] - drivers[0]["current_rate"]
                ) * 0.5,
                "horizon_days": horizon_days,
                "potential_financial_impact": 0,
                "impact_scope": "overlaps_with_action_plan_capacity",
                "impact_is_additive": False,
                "currency": "IRR",
            }
        )
    return actions


def _ingestion_run_id(dataset_version: str) -> str | None:
    run_id = (
        IngestionRun.objects.filter(
            dataset_version=dataset_version, status=IngestionRun.Status.SUCCEEDED
        )
        .order_by("-finished_at")
        .values_list("id", flat=True)
        .first()
    )
    return str(run_id) if run_id else None
