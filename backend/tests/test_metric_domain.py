from apps.analytics.domain.metrics import assign_amount_bucket, calculate_ratio


def test_ratio_preserves_numerator_and_denominator_for_traceability() -> None:
    ratio = calculate_ratio(2, 5)
    assert ratio.value == 0.4
    assert ratio.numerator == 2
    assert ratio.denominator == 5


def test_ratio_is_none_when_denominator_is_zero() -> None:
    assert calculate_ratio(0, 0).value is None


def test_amount_bucket_boundaries_are_explicit() -> None:
    assert assign_amount_bucket(999_999) == "under_1m"
    assert assign_amount_bucket(1_000_000) == "1m_to_10m"
    assert assign_amount_bucket(10_000_000) == "10m_to_100m"
    assert assign_amount_bucket(100_000_000) == "100m_and_above"
