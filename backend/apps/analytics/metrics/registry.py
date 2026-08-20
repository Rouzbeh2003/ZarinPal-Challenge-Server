from dataclasses import dataclass


@dataclass(frozen=True)
class MetricDefinition:
    name: str
    version: str
    definition: str
    grain: str
    numerator: str
    denominator: str | None
    minimum_sample_size: int


METRIC_VERSION = "2.0.0"
METRICS = {
    "successful_amount": MetricDefinition(
        "successful_amount",
        METRIC_VERSION,
        "Sum of amount for successful sessions; each session is counted once.",
        "session",
        "amount where is_successful",
        None,
        1,
    ),
    "success_rate": MetricDefinition(
        "success_rate",
        METRIC_VERSION,
        "Verified sessions divided by all valid sessions. Paid without merchant verification is reported separately; Reversed is excluded from sales.",
        "session",
        "successful valid sessions",
        "all valid sessions",
        1,
    ),
    "paid_unverified_rate": MetricDefinition(
        "paid_unverified_rate",
        METRIC_VERSION,
        "Sessions debited by the bank but not verified by the merchant, divided by all valid sessions.",
        "session",
        "sessions with final status Paid",
        "all valid sessions",
        1,
    ),
    "no_attempt_rate": MetricDefinition(
        "no_attempt_rate",
        METRIC_VERSION,
        "Sessions without a real attempt divided by all valid sessions.",
        "session",
        "sessions without real attempt",
        "all valid sessions",
        1,
    ),
    "retry_rate": MetricDefinition(
        "retry_rate",
        METRIC_VERSION,
        "Sessions with more than one real attempt divided by sessions with a real attempt.",
        "session",
        "retried sessions",
        "sessions with real attempt",
        1,
    ),
    "retry_recovery_rate": MetricDefinition(
        "retry_recovery_rate",
        METRIC_VERSION,
        "Sessions successful after an earlier failure divided by retried sessions.",
        "session",
        "recovered sessions",
        "retried sessions",
        1,
    ),
}
