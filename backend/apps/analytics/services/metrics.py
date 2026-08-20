from dataclasses import dataclass
from datetime import date
from typing import Any

from apps.analytics.metrics.registry import METRIC_VERSION
from apps.analytics.repositories.duckdb_repository import DuckDbRepository


@dataclass(frozen=True)
class MetricQuery:
    merchant_key: str
    date_from: date
    date_to: date
    terminal_key: str | None = None
    psp_code: str | None = None
    issuer_bank_code: str | None = None
    amount_bucket: str | None = None


class MetricsService:
    def __init__(self, repository: DuckDbRepository | None = None) -> None:
        self.repository = repository or DuckDbRepository()

    def overview(self, metric_query: MetricQuery) -> dict[str, Any]:
        where_sql, parameters = _build_filters(metric_query)
        query = f"""
        -- Grain: one result row; source has one row per session_key.
        SELECT count(*) FILTER (WHERE final_status != 'excluded') AS valid_sessions,
               count(*) AS input_sessions,
               count(*) FILTER (WHERE final_status = 'excluded') AS excluded_sessions,
               count(*) FILTER (WHERE is_successful) AS successful_sessions,
               coalesce(sum(amount) FILTER (WHERE is_successful), 0)::BIGINT AS successful_amount,
               coalesce(sum(amount) FILTER (WHERE final_status = 'unsuccessful'), 0)::BIGINT AS potential_lost_amount,
               count(*) FILTER (WHERE NOT has_real_attempt) AS no_attempt_sessions
        FROM session_fact WHERE {where_sql}
        """
        row = self.repository.fetch_one(query, parameters) or {}
        valid = int(row.get("valid_sessions", 0))
        successful = int(row.get("successful_sessions", 0))
        return {
            **row,
            "success_rate": _safe_ratio(successful, valid),
            "no_attempt_rate": _safe_ratio(int(row.get("no_attempt_sessions", 0)), valid),
            "currency": "IRR",
            "metric_version": METRIC_VERSION,
        }

    def funnel(self, metric_query: MetricQuery) -> dict[str, Any]:
        where_sql, parameters = _build_filters(metric_query)
        query = f"""
        SELECT count(*) AS created_sessions,
               count(*) FILTER (WHERE has_real_attempt) AS attempted_sessions,
               count(*) FILTER (WHERE has_bank_entry) AS bank_entry_sessions,
               count(*) FILTER (WHERE is_successful) AS successful_sessions
        FROM session_fact WHERE {where_sql}
        """
        return self.repository.fetch_one(query, parameters) or {}

    def retry_analysis(self, metric_query: MetricQuery) -> dict[str, Any]:
        where_sql, parameters = _build_filters(metric_query)
        query = f"""
        SELECT count(*) FILTER (WHERE has_real_attempt) AS sessions_with_attempt,
               count(*) FILTER (WHERE has_retry) AS retried_sessions,
               count(*) FILTER (WHERE recovered_after_retry) AS recovered_sessions,
               coalesce(sum(amount) FILTER (WHERE recovered_after_retry), 0)::BIGINT AS recovered_amount
        FROM session_fact WHERE {where_sql}
        """
        row = self.repository.fetch_one(query, parameters) or {}
        attempted = int(row.get("sessions_with_attempt", 0))
        retried = int(row.get("retried_sessions", 0))
        return {
            **row,
            "retry_rate": _safe_ratio(retried, attempted),
            "retry_recovery_rate": _safe_ratio(int(row.get("recovered_sessions", 0)), retried),
            "currency": "IRR",
            "metric_version": METRIC_VERSION,
        }


def _build_filters(metric_query: MetricQuery) -> tuple[str, list[object]]:
    clauses = ["merchant_key = ?", "metric_date BETWEEN ? AND ?"]
    parameters: list[object] = [
        metric_query.merchant_key,
        metric_query.date_from,
        metric_query.date_to,
    ]
    optional_filters = {
        "terminal_key": metric_query.terminal_key,
        "final_psp_code": metric_query.psp_code,
        "final_issuer_bank_code": metric_query.issuer_bank_code,
        "amount_bucket": metric_query.amount_bucket,
    }
    for column, value in optional_filters.items():
        if value is not None:
            clauses.append(f"{column} = ?")
            parameters.append(value)
    return " AND ".join(clauses), parameters


def _safe_ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None
