from dataclasses import dataclass


@dataclass(frozen=True)
class Ratio:
    value: float | None
    numerator: int
    denominator: int


def calculate_ratio(numerator: int, denominator: int) -> Ratio:
    value = numerator / denominator if denominator else None
    return Ratio(value=value, numerator=numerator, denominator=denominator)


def assign_amount_bucket(amount: int) -> str:
    if amount < 1_000_000:
        return "under_1m"
    if amount < 10_000_000:
        return "1m_to_10m"
    if amount < 100_000_000:
        return "10m_to_100m"
    return "100m_and_above"
