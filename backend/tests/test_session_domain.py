from apps.analytics.domain.sessions import Attempt, SessionStatus, summarize_session


def test_session_amount_is_counted_once_when_payment_has_multiple_attempts() -> None:
    attempts = [
        Attempt(try_seq=1, try_status="Failed", session_status="Failed", amount=5_000_000),
        Attempt(try_seq=2, try_status="Verified", session_status="Verified", amount=5_000_000),
    ]

    session = summarize_session(attempts)

    assert session.amount == 5_000_000
    assert session.attempts_count == 2
    assert session.has_retry is True
    assert session.recovered_after_retry is True
    assert session.final_status is SessionStatus.SUCCESSFUL


def test_no_attempt_is_not_treated_as_real_payment_attempt() -> None:
    session = summarize_session(
        [Attempt(try_seq=0, try_status="NoAttempt", session_status="Failed", amount=1_000_000)]
    )

    assert session.has_real_attempt is False
    assert session.attempts_count == 0
    assert session.final_status is SessionStatus.UNSUCCESSFUL


def test_reversed_takes_precedence_over_success() -> None:
    session = summarize_session(
        [
            Attempt(try_seq=1, try_status="Verified", session_status="Verified", amount=2_000_000),
            Attempt(try_seq=2, try_status="Reversed", session_status="Reversed", amount=2_000_000),
        ]
    )

    assert session.is_successful is False
    assert session.is_reversed is True
    assert session.final_status is SessionStatus.REVERSED


def test_inconsistent_amount_raises_data_quality_error() -> None:
    attempts = [
        Attempt(try_seq=1, try_status="Failed", session_status="Failed", amount=1),
        Attempt(try_seq=2, try_status="Verified", session_status="Verified", amount=2),
    ]

    try:
        summarize_session(attempts)
    except ValueError as error:
        assert "Amount must remain constant" in str(error)
    else:
        raise AssertionError("Expected inconsistent amount to fail")
