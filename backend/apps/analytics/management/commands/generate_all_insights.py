import calendar
import logging
from dataclasses import dataclass
from datetime import date
from typing import cast

from django.core.management.base import BaseCommand, CommandParser

from apps.analytics.insights.domain import InsightPolicy
from apps.analytics.repositories.duckdb_repository import DuckDbRepository
from apps.analytics.services.insights import InsightQuery, InsightService

logger = logging.getLogger(__name__)

# Grain: one row per merchant_key and month_start; source is session_fact,
# where each session_key appears exactly once. Ordered by absolute rate change
# so a demo run can take only the most significant windows.
CANDIDATE_QUERY = """
WITH monthly AS (
    SELECT merchant_key,
           date_trunc('month', metric_date)::DATE AS month_start,
           count(*) FILTER (WHERE final_status != 'excluded') AS total,
           count(*) FILTER (WHERE is_successful) AS successful
    FROM session_fact
    WHERE final_status != 'excluded'
    GROUP BY merchant_key, month_start
)
SELECT a.merchant_key,
       a.month_start,
       b.successful AS baseline_successes,
       b.total AS baseline_total,
       a.successful AS current_successes,
       a.total AS current_total
FROM monthly a
JOIN monthly b ON a.merchant_key = b.merchant_key
             AND b.month_start = a.month_start - INTERVAL '1 month'
WHERE a.total >= ? AND b.total >= ?
ORDER BY abs(a.successful::DOUBLE / a.total - b.successful::DOUBLE / b.total) DESC
"""


@dataclass(frozen=True)
class CandidatePeriod:
    """A merchant month-over-month window that may yield an actionable insight."""

    merchant_key: str
    month_start: date

    def as_insight_query(self) -> InsightQuery:
        last_day = calendar.monthrange(self.month_start.year, self.month_start.month)[1]
        return InsightQuery(
            merchant_key=self.merchant_key,
            date_from=self.month_start,
            date_to=date(self.month_start.year, self.month_start.month, last_day),
        )


class Command(BaseCommand):
    help = (
        "Scan merchants' month-over-month success-rate changes and generate insights "
        "for the most significant periods that meet the configured InsightPolicy."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--merchant-key",
            default=None,
            help="Limit the scan to a single merchant instead of all merchants.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=20,
            help="Generate insights only for the N most significant month-over-month changes.",
        )

    def handle(self, *args: object, **options: object) -> None:
        merchant_filter = cast("str | None", options["merchant_key"])
        limit = int(cast("int", options["limit"]))
        policy = InsightPolicy()
        candidates = self._find_candidates(policy, merchant_filter)[: max(limit, 0)]
        if not candidates:
            self.stdout.write("No candidate periods met the minimum sample size.")
            return

        service = InsightService()
        generated = 0
        for candidate in candidates:
            insight = service.generate(candidate.as_insight_query())
            if insight is None:
                continue
            generated += 1
            self.stdout.write(
                f"Generated {insight.insight_type} ({insight.severity}) for "
                f"{candidate.merchant_key} {candidate.month_start.isoformat()}"
            )
        self.stdout.write(
            self.style.SUCCESS(
                f"{generated} insight(s) generated from {len(candidates)} candidate period(s)."
            )
        )

    def _find_candidates(
        self, policy: InsightPolicy, merchant_filter: str | None
    ) -> list[CandidatePeriod]:
        parameters: list[object] = [policy.minimum_sample_size, policy.minimum_sample_size]
        filter_sql = ""
        if merchant_filter:
            filter_sql = " AND a.merchant_key = ?"
            parameters.append(merchant_filter)
        rows = DuckDbRepository().fetch_all(CANDIDATE_QUERY + filter_sql, parameters)
        # InsightService.generate applies the full InsightPolicy gate (minimum
        # change + z-test); periods below it simply yield no insight.
        return [
            CandidatePeriod(merchant_key=str(row["merchant_key"]), month_start=row["month_start"])
            for row in rows
        ]
