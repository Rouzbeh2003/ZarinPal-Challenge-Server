from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class SessionStatus(StrEnum):
    SUCCESSFUL = "successful"
    UNSUCCESSFUL = "unsuccessful"
    REVERSED = "reversed"
    EXCLUDED = "excluded"


SUCCESS_STATUSES = frozenset({"verified", "paid"})


@dataclass(frozen=True)
class Attempt:
    try_seq: int
    try_status: str
    session_status: str
    amount: int
    try_created_at: datetime | None = None

    @property
    def is_real_attempt(self) -> bool:
        return self.try_seq > 0 and self.try_status.casefold() != "noattempt"


@dataclass(frozen=True)
class SessionSummary:
    amount: int
    final_status: SessionStatus
    is_successful: bool
    is_reversed: bool
    attempts_count: int
    has_real_attempt: bool
    has_retry: bool
    recovered_after_retry: bool


def summarize_session(attempts: list[Attempt]) -> SessionSummary:
    """Resolve attempts into one session without ever summing repeated amounts."""
    if not attempts:
        raise ValueError("A session must contain at least one attempt")

    ordered_attempts = sorted(attempts, key=lambda attempt: attempt.try_seq)
    amounts = {attempt.amount for attempt in ordered_attempts}
    if len(amounts) != 1:
        raise ValueError("Amount must remain constant inside a session")

    real_attempts = [attempt for attempt in ordered_attempts if attempt.is_real_attempt]
    final_status = resolve_final_status(ordered_attempts)
    has_retry = len(real_attempts) > 1
    recovered = has_retry and _failed_before_success(real_attempts)
    return SessionSummary(
        amount=ordered_attempts[0].amount,
        final_status=final_status,
        is_successful=final_status is SessionStatus.SUCCESSFUL,
        is_reversed=final_status is SessionStatus.REVERSED,
        attempts_count=len(real_attempts),
        has_real_attempt=bool(real_attempts),
        has_retry=has_retry,
        recovered_after_retry=recovered,
    )


def resolve_final_status(attempts: list[Attempt]) -> SessionStatus:
    statuses = {attempt.session_status.casefold() for attempt in attempts}
    if "reversed" in statuses:
        return SessionStatus.REVERSED
    if statuses & SUCCESS_STATUSES:
        return SessionStatus.SUCCESSFUL
    if all(attempt.amount <= 0 for attempt in attempts):
        return SessionStatus.EXCLUDED
    return SessionStatus.UNSUCCESSFUL


def _failed_before_success(attempts: list[Attempt]) -> bool:
    successful_positions = [
        index
        for index, attempt in enumerate(attempts)
        if attempt.try_status.casefold() in SUCCESS_STATUSES
    ]
    if not successful_positions:
        return False
    first_success = min(successful_positions)
    return any(
        attempt.try_status.casefold() not in SUCCESS_STATUSES
        for attempt in attempts[:first_success]
    )
