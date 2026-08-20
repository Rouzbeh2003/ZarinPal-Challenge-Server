import pytest

from apps.analytics.insights.domain import (
    InsightPolicy,
    assess_rate_change,
    estimate_financial_impact,
)


def test_rate_drop_requires_sample_practical_change_and_statistical_significance() -> None:
    assessment = assess_rate_change(
        current_successes=600,
        current_total=1000,
        baseline_successes=750,
        baseline_total=1000,
        policy=InsightPolicy(),
    )

    assert assessment.current_rate == 0.6
    assert assessment.baseline_rate == 0.75
    assert assessment.absolute_change == pytest.approx(-0.15)
    assert assessment.is_actionable is True
    assert assessment.confidence > 0.99


def test_small_sample_does_not_produce_actionable_change() -> None:
    assessment = assess_rate_change(
        current_successes=1,
        current_total=10,
        baseline_successes=9,
        baseline_total=10,
        policy=InsightPolicy(),
    )

    assert assessment.is_actionable is False


def test_financial_impact_is_potential_missing_successes_not_failed_amount_sum() -> None:
    impact = estimate_financial_impact(
        expected_success_rate=0.8,
        actual_successes=60,
        current_sessions=100,
        average_successful_amount=2_000_000,
    )

    assert impact == 40_000_000
