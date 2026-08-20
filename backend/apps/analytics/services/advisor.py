from dataclasses import asdict, dataclass
from datetime import date
from enum import StrEnum
from typing import Any, Protocol

from apps.analytics.metrics.registry import METRIC_VERSION
from apps.analytics.repositories.duckdb_repository import DuckDbRepository
from apps.analytics.services.metrics import MetricQuery, MetricsService, _build_filters


class RecommendationPriority(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True)
class AdvisorQuery:
    merchant_key: str
    date_from: date
    date_to: date
    question: str | None = None
    terminal_key: str | None = None
    psp_code: str | None = None
    issuer_bank_code: str | None = None
    amount_bucket: str | None = None

    def as_metric_query(self) -> MetricQuery:
        return MetricQuery(
            merchant_key=self.merchant_key,
            date_from=self.date_from,
            date_to=self.date_to,
            terminal_key=self.terminal_key,
            psp_code=self.psp_code,
            issuer_bank_code=self.issuer_bank_code,
            amount_bucket=self.amount_bucket,
        )


@dataclass(frozen=True)
class Recommendation:
    code: str
    priority: RecommendationPriority
    title: str
    rationale: str
    expected_signal: str
    guardrail: str


class NarrativeGenerator(Protocol):
    def generate(self, *, question: str | None, evidence: dict[str, Any]) -> dict[str, Any]: ...


class MerchantAdvisorService:
    """Build a broad merchant-health report from session-grain, auditable aggregates."""

    def __init__(
        self,
        repository: DuckDbRepository | None = None,
        narrative_generator: NarrativeGenerator | None = None,
    ) -> None:
        self.repository = repository or DuckDbRepository()
        self.metrics = MetricsService(self.repository)
        self.narrative_generator = narrative_generator

    def analyze(self, query: AdvisorQuery) -> dict[str, Any]:
        metric_query = query.as_metric_query()
        overview = self.metrics.overview(metric_query)
        dimensions = {
            "amount_buckets": self._breakdown(metric_query, "amount_bucket"),
            "hours": self._breakdown(metric_query, "extract(hour FROM first_attempt_at)"),
            "weekdays": self._breakdown(metric_query, "extract(dow FROM first_attempt_at)"),
            "psps": self._breakdown(metric_query, "final_psp_code"),
            "issuer_banks": self._breakdown(metric_query, "final_issuer_bank_code", limit=10),
            "terminals": self._breakdown(metric_query, "terminal_key", limit=10),
            "switch_responses": self._breakdown(
                metric_query, "final_switch_response_code", limit=10
            ),
            "verify_types": self._breakdown(metric_query, "verify_type", limit=10),
        }
        retry = self.metrics.retry_analysis(metric_query)
        trends = self._trend_signals(metric_query)
        needs = _predict_needs(overview, retry, dimensions, trends)
        recommendations = _recommend(overview, retry, dimensions, trends, needs)
        evidence = {
            "overview": _public_overview(overview),
            "retry": {key: value for key, value in retry.items() if key != "breakdown"},
            "dimensions": dimensions,
            "trends": trends,
            "predicted_needs": needs,
            "recommendations": [asdict(item) for item in recommendations],
        }
        narrative, narrative_source = self._narrative(query.question, evidence)
        return {
            "merchant_key": query.merchant_key,
            "period": {"date_from": query.date_from, "date_to": query.date_to},
            "executive_summary": _executive_summary(overview, retry, dimensions),
            "overview": evidence["overview"],
            "dimensions": dimensions,
            "retry": evidence["retry"],
            "trends": trends,
            "predicted_needs": needs,
            "recommendations": evidence["recommendations"],
            "advisor_narrative": narrative,
            "narrative_source": narrative_source,
            "methodology": {
                "grain": "one row per payment session",
                "metric_version": METRIC_VERSION,
                "claims": "forecasted_needs_are_ranked_hypotheses_not_causation",
                "privacy": "only aggregate evidence is shared with the narrative generator",
            },
        }

    def _breakdown(
        self, query: MetricQuery, expression: str, *, limit: int = 24
    ) -> list[dict[str, Any]]:
        where_sql, parameters = _build_filters(query)
        rows = self.repository.fetch_all(
            f"""SELECT coalesce(cast({expression} AS VARCHAR), 'unknown') AS value,
                       count(*) FILTER (WHERE final_status != 'excluded') AS valid_sessions,
                       count(*) FILTER (WHERE is_successful) AS successful_sessions,
                       coalesce(sum(amount) FILTER (WHERE is_successful), 0)::BIGINT AS successful_amount,
                       coalesce(sum(amount) FILTER (WHERE final_status = 'unsuccessful'), 0)::BIGINT AS potential_lost_amount
                FROM session_fact WHERE {where_sql}
                GROUP BY {expression}
                HAVING count(*) FILTER (WHERE final_status != 'excluded') > 0
                ORDER BY valid_sessions DESC LIMIT ?""",
            [*parameters, limit],
        )
        for row in rows:
            valid_sessions = int(row["valid_sessions"])
            row["success_rate"] = int(row["successful_sessions"]) / valid_sessions
        return rows

    def _trend_signals(self, query: MetricQuery) -> dict[str, Any]:
        """Compare equal first/second halves and expose demand, value and reliability direction."""
        where_sql, parameters = _build_filters(query)
        midpoint = query.date_from + (query.date_to - query.date_from) / 2
        rows = self.repository.fetch_all(
            f"""SELECT CASE WHEN metric_date <= ? THEN 'previous' ELSE 'recent' END AS period,
                       count(*) FILTER (WHERE final_status != 'excluded') AS valid_sessions,
                       count(*) FILTER (WHERE is_successful) AS successful_sessions,
                       coalesce(sum(amount) FILTER (WHERE is_successful), 0)::BIGINT AS successful_amount,
                       coalesce(avg(amount) FILTER (WHERE is_successful), 0)::DOUBLE AS average_ticket,
                       count(DISTINCT metric_date) AS active_days
                FROM session_fact WHERE {where_sql}
                GROUP BY period""",
            [midpoint, *parameters],
        )
        periods = {row["period"]: row for row in rows}
        result: dict[str, Any] = {"comparison": "equal_halves", "previous": {}, "recent": {}, "changes": {}}
        for name in ("previous", "recent"):
            row = periods.get(name, {})
            days = max(int(row.get("active_days", 0)), 1)
            valid = int(row.get("valid_sessions", 0))
            successful = int(row.get("successful_sessions", 0))
            result[name] = {
                "valid_sessions": valid,
                "sessions_per_active_day": valid / days,
                "success_rate": successful / valid if valid else None,
                "successful_amount": int(row.get("successful_amount", 0)),
                "average_ticket": float(row.get("average_ticket", 0)),
            }
        for metric in ("sessions_per_active_day", "success_rate", "successful_amount", "average_ticket"):
            old, new = result["previous"].get(metric), result["recent"].get(metric)
            result["changes"][metric] = (
                _relative_change(old, new)
                if result["previous"]["valid_sessions"] and result["recent"]["valid_sessions"]
                else None
            )
        return result

    def _narrative(
        self, question: str | None, evidence: dict[str, Any]
    ) -> tuple[dict[str, Any] | None, str]:
        if self.narrative_generator is None:
            return None, "deterministic_engine"
        try:
            return self.narrative_generator.generate(question=question, evidence=evidence), "llm"
        except (OSError, TimeoutError, ValueError):
            return None, "deterministic_engine_fallback"


def _recommend(
    overview: dict[str, Any], retry: dict[str, Any], dimensions: dict[str, list[dict[str, Any]]],
    trends: dict[str, Any], needs: list[dict[str, Any]],
) -> list[Recommendation]:
    recommendations: list[Recommendation] = []
    if (overview.get("no_attempt_rate") or 0) >= 0.08:
        recommendations.append(
            Recommendation(
                "reduce_no_attempt",
                RecommendationPriority.HIGH,
                "ریزش پیش از ورود واقعی به پرداخت را کاهش دهید",
                f"{overview['no_attempt_rate']:.1%} از سشن‌ها تلاش واقعی ندارند.",
                "کاهش نرخ no-attempt در آزمون کنترل‌شده",
                "فروش بازیابی‌شده را تا مشاهده پرداخت موفق قطعی فرض نکنید.",
            )
        )
    if int(overview.get("paid_unverified_sessions", 0)) > 0:
        recommendations.append(
            Recommendation(
                "complete_payment_verification",
                RecommendationPriority.HIGH,
                "تراکنش‌های Paid بدون verify را سریع بررسی کنید",
                f"{int(overview['paid_unverified_sessions']):,} سشن به مبلغ {int(overview['paid_unverified_amount']):,} ریال برداشت شده اما verify نشده است.",
                "کاهش Paid تأییدنشده و تبدیل معتبر آن‌ها به Verified",
                "Paid را پیش از verify فروش قطعی یا درآمد محقق‌شده محسوب نکنید.",
            )
        )
    weakest_amount = _weakest_eligible(dimensions["amount_buckets"])
    if weakest_amount is not None:
        recommendations.append(
            Recommendation(
                "optimize_amount_segment",
                RecommendationPriority.MEDIUM,
                f"مسیر پرداخت بازه مبلغ {weakest_amount['value']} را بررسی کنید",
                f"نرخ موفقیت این بخش {weakest_amount['success_rate']:.1%} است.",
                "بهبود نرخ موفقیت همان بازه بدون افت سایر بازه‌ها",
                "ترکیب مشتری و کانال را پیش از نسبت‌دادن علت کنترل کنید.",
            )
        )
    weakest_hour = _weakest_eligible(dimensions["hours"])
    if weakest_hour is not None:
        recommendations.append(
            Recommendation(
                "investigate_low_hour",
                RecommendationPriority.MEDIUM,
                f"افت ساعت {weakest_hour['value']} را پایش کنید",
                f"در این ساعت نرخ موفقیت {weakest_hour['success_rate']:.1%} ثبت شده است.",
                "بسته‌شدن فاصله با میانه ساعات مشابه",
                "حجم و روز هفته را در مقایسه ثابت نگه دارید.",
            )
        )
    if int(retry.get("recovered_sessions", 0)) > 0:
        recommendations.append(
            Recommendation(
                "preserve_safe_retry",
                RecommendationPriority.LOW,
                "retry کنترل‌شده را حفظ و بهینه کنید",
                f"retry مبلغ {int(retry['recovered_amount']):,} ریال را بازیابی کرده است.",
                "افزایش بازیابی بدون افزایش تلاش تکراری یا تجربه ضعیف",
                "سقف retry و فاصله زمانی امن اعمال شود.",
            )
        )
    demand_change = trends["changes"].get("sessions_per_active_day")
    if demand_change is not None and demand_change <= -0.15:
        recommendations.append(Recommendation(
            "recover_demand", RecommendationPriority.HIGH,
            "برای بازیابی تقاضا و بازگشت مشتری برنامه آزمایشی اجرا کنید",
            f"تعداد سشن روزانه در نیمه اخیر {abs(demand_change):.1%} کاهش یافته است.",
            "رشد سشن روزانه و نرخ بازگشت بدون افت ارزش متوسط خرید",
            "داده پرداخت رفتار بازاریابی یا رضایت مشتری را مستقیماً اثبات نمی‌کند.",
        ))
    ticket_change = trends["changes"].get("average_ticket")
    if ticket_change is not None and ticket_change <= -0.15:
        recommendations.append(Recommendation(
            "increase_order_value", RecommendationPriority.MEDIUM,
            "پیشنهاد مکمل یا آستانه تشویقی برای افزایش ارزش خرید آزمایش کنید",
            f"میانگین مبلغ خرید موفق در نیمه اخیر {abs(ticket_change):.1%} کاهش یافته است.",
            "رشد میانگین مبلغ و فروش روزانه در گروه آزمون نسبت به کنترل",
            "اثر تخفیف بر حاشیه سود باید جداگانه کنترل شود.",
        ))
    return recommendations[:6]


def _relative_change(old: Any, new: Any) -> float | None:
    if old is None or new is None or float(old) == 0:
        return None
    return (float(new) - float(old)) / float(old)


def _predict_needs(overview: dict[str, Any], retry: dict[str, Any], dimensions: dict[str, list[dict[str, Any]]], trends: dict[str, Any]) -> list[dict[str, Any]]:
    """Rank evidence-backed merchant needs; these are hypotheses, not asserted facts."""
    candidates: list[dict[str, Any]] = []
    def add(code: str, area: str, confidence: float, evidence: str, validation: str) -> None:
        candidates.append({"code": code, "area": area, "confidence": round(confidence, 2), "evidence": evidence, "validation": validation})
    demand = trends["changes"].get("sessions_per_active_day")
    ticket = trends["changes"].get("average_ticket")
    if demand is not None and demand <= -0.10:
        add("customer_retention", "بازگشت مشتری و تقاضا", min(.9, .55 + abs(demand)), f"سشن روزانه {abs(demand):.1%} افت کرده است.", "نرخ بازگشت مشتری/کانال جذب را با داده CRM یا کمپین بسنجید.")
    if ticket is not None and ticket <= -0.10:
        add("basket_growth", "رشد ارزش سبد خرید", min(.85, .5 + abs(ticket)), f"میانگین خرید موفق {abs(ticket):.1%} افت کرده است.", "آزمون کنترل‌شده باندل یا cross-sell اجرا شود.")
    if (overview.get("no_attempt_rate") or 0) >= .08:
        add("checkout_experience", "تجربه خرید و قیف قبل از پرداخت", .82, f"نرخ بدون تلاش واقعی {overview['no_attempt_rate']:.1%} است.", "رویدادهای صفحه checkout و خطاهای سمت کاربر instrument شوند.")
    if int(overview.get("paid_unverified_sessions", 0)):
        add("operations_reconciliation", "عملیات و تطبیق مالی", .9, f"{int(overview['paid_unverified_sessions']):,} پرداخت verify نشده است.", "SLA تطبیق و علت‌های verify ناموفق بررسی شود.")
    if (retry.get("retry_rate") or 0) >= .15:
        add("friction_control", "کاهش اصطکاک و retry", .75, f"نرخ retry برابر {retry['retry_rate']:.1%} است.", "زمان پاسخ، abandonment و نرخ بازیابی به تفکیک مسیر اندازه‌گیری شود.")
    if not candidates:
        add("growth_experimentation", "رشد و وفادارسازی", .45, "در داده پرداخت مسئله بحرانی برجسته‌ای دیده نشد.", "داده محصول، CRM، حاشیه سود و رضایت مشتری برای تشخیص نیاز بعدی افزوده شود.")
    return sorted(candidates, key=lambda item: item["confidence"], reverse=True)[:5]


def _weakest_eligible(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    eligible = [row for row in rows if int(row["valid_sessions"]) >= 30]
    return min(eligible, key=lambda row: float(row["success_rate"])) if eligible else None


def _public_overview(overview: dict[str, Any]) -> dict[str, Any]:
    excluded = {"daily_trend", "psp_breakdown", "input_sessions", "excluded_sessions"}
    return {key: value for key, value in overview.items() if key not in excluded}


def _executive_summary(
    overview: dict[str, Any], retry: dict[str, Any], dimensions: dict[str, list[dict[str, Any]]]
) -> list[str]:
    messages = [
        f"نرخ موفقیت در بازه انتخابی {(overview.get('success_rate') or 0):.1%} و فروش موفق {int(overview['successful_amount']):,} ریال است.",
        f"{int(overview['no_attempt_sessions']):,} سشن بدون تلاش واقعی ثبت شده است.",
        f"retry تعداد {int(retry['recovered_sessions']):,} سشن و {int(retry['recovered_amount']):,} ریال را بازیابی کرده است.",
    ]
    strongest_hour = max(dimensions["hours"], key=lambda row: row["success_rate"], default=None)
    if strongest_hour:
        messages.append(
            f"بهترین نرخ موفقیت ساعتی در ساعت {strongest_hour['value']} با {strongest_hour['success_rate']:.1%} دیده شده است."
        )
    return messages
