import math
from dataclasses import dataclass
from enum import StrEnum


class InsightSeverity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True)
class InsightPolicy:
    version: str = "1.0.0"
    minimum_sample_size: int = 30
    minimum_absolute_change: float = 0.03
    significance_z_score: float = 1.96
    high_change: float = 0.10
    critical_change: float = 0.20
    maximum_drivers: int = 5


@dataclass(frozen=True)
class ChangeAssessment:
    current_rate: float
    baseline_rate: float
    absolute_change: float
    relative_change: float | None
    confidence: float
    is_actionable: bool


def assess_rate_change(
    *,
    current_successes: int,
    current_total: int,
    baseline_successes: int,
    baseline_total: int,
    policy: InsightPolicy,
) -> ChangeAssessment:
    current_rate = _safe_rate(current_successes, current_total)
    baseline_rate = _safe_rate(baseline_successes, baseline_total)
    absolute_change = current_rate - baseline_rate
    relative_change = absolute_change / baseline_rate if baseline_rate else None
    z_score = _two_proportion_z_score(
        current_successes, current_total, baseline_successes, baseline_total
    )
    confidence = math.erf(abs(z_score) / math.sqrt(2))
    has_sample = min(current_total, baseline_total) >= policy.minimum_sample_size
    is_actionable = (
        has_sample
        and abs(absolute_change) >= policy.minimum_absolute_change
        and abs(z_score) >= policy.significance_z_score
    )
    return ChangeAssessment(
        current_rate, baseline_rate, absolute_change, relative_change, confidence, is_actionable
    )


def determine_severity(
    absolute_change: float, financial_impact: int, baseline_amount: int
) -> InsightSeverity:
    magnitude = abs(absolute_change)
    impact_ratio = financial_impact / baseline_amount if baseline_amount else 0.0
    if magnitude >= 0.20 or impact_ratio >= 0.25:
        return InsightSeverity.CRITICAL
    if magnitude >= 0.10 or impact_ratio >= 0.15:
        return InsightSeverity.HIGH
    if magnitude >= 0.05 or impact_ratio >= 0.05:
        return InsightSeverity.MEDIUM
    return InsightSeverity.LOW


def estimate_financial_impact(
    *,
    expected_success_rate: float,
    actual_successes: int,
    current_sessions: int,
    average_successful_amount: float,
) -> int:
    expected_successes = max(expected_success_rate * current_sessions - actual_successes, 0.0)
    return round(expected_successes * average_successful_amount)


def _safe_rate(successes: int, total: int) -> float:
    return successes / total if total else 0.0


def _two_proportion_z_score(
    first_successes: int, first_total: int, second_successes: int, second_total: int
) -> float:
    if not first_total or not second_total:
        return 0.0
    pooled = (first_successes + second_successes) / (first_total + second_total)
    standard_error = math.sqrt(pooled * (1 - pooled) * (1 / first_total + 1 / second_total))
    if standard_error == 0:
        return 0.0
    return (first_successes / first_total - second_successes / second_total) / standard_error
