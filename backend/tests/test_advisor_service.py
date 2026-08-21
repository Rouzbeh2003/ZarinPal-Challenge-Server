from datetime import date
from pathlib import Path
from typing import Any

import duckdb

from apps.analytics.repositories.duckdb_repository import DuckDbRepository
from apps.analytics.services.advisor import (
    AdvisorQuery,
    MerchantAdvisorService,
    _query_with_question_period,
)


class StubNarrativeGenerator:
    def generate(self, *, question: str | None, evidence: dict[str, Any]) -> dict[str, Any]:
        assert question == "چه چیزی را بهتر کنم؟"
        assert "payer_card_key" not in str(evidence)
        return {"answer": "ابتدا ریزش پیش از تلاش واقعی را بررسی کنید."}


class FailingNarrativeGenerator:
    def generate(self, *, question: str | None, evidence: dict[str, Any]) -> dict[str, Any]:
        raise TimeoutError("provider timeout")


def test_advisor_resolves_persian_month_from_question() -> None:
    query = AdvisorQuery(
        "M1", date(2026, 1, 1), date(2026, 6, 30), "لطفاً ماه اردیبهشت را تحلیل کن"
    )

    resolved = _query_with_question_period(query)

    assert resolved.date_from == date(2026, 4, 21)
    assert resolved.date_to == date(2026, 5, 21)


def test_advisor_resolves_explicit_persian_year_with_persian_digits() -> None:
    query = AdvisorQuery(
        "M1", date(2025, 1, 1), date(2026, 12, 31), "اردیبهشت ۱۴۰۵ را بررسی کن"
    )

    resolved = _query_with_question_period(query)

    assert (resolved.date_from, resolved.date_to) == (date(2026, 4, 21), date(2026, 5, 21))


def test_advisor_builds_aggregate_recommendations_and_grounded_narrative(tmp_path: Path) -> None:
    database_path = tmp_path / "advisor.duckdb"
    _create_session_fact(database_path)

    report = MerchantAdvisorService(
        DuckDbRepository(database_path), StubNarrativeGenerator()
    ).analyze(AdvisorQuery("M1", date(2026, 6, 1), date(2026, 6, 1), "چه چیزی را بهتر کنم؟"))

    assert report["overview"]["valid_sessions"] == 100
    assert report["overview"]["success_rate"] == 0.5
    assert report["narrative_source"] == "llm"
    assert report["advisor_narrative"]["answer"].startswith("ابتدا")
    assert report["recommendations"][0]["code"] == "reduce_no_attempt"
    assert report["methodology"]["claims"] == "forecasted_needs_are_ranked_hypotheses_not_causation"
    assert report["predicted_needs"][0]["code"] == "checkout_experience"
    assert "trends" in report
    assert report["transaction_evidence"]["total"] == 100
    assert report["transaction_evidence"]["page_size"] == 10
    assert len(report["transaction_evidence"]["items"]) == 10
    assert "payer_card" not in str(report["transaction_evidence"])


def test_advisor_returns_complete_deterministic_report_when_llm_fails(tmp_path: Path) -> None:
    database_path = tmp_path / "advisor.duckdb"
    _create_session_fact(database_path)

    report = MerchantAdvisorService(
        DuckDbRepository(database_path), FailingNarrativeGenerator()
    ).analyze(AdvisorQuery("M1", date(2026, 6, 1), date(2026, 6, 1)))

    assert report["advisor_narrative"] is None
    assert report["narrative_source"] == "deterministic_engine_fallback"
    assert len(report["executive_summary"]) >= 3


def test_advisor_peer_comparison_is_aggregate_and_has_no_peer_identifiers(tmp_path: Path) -> None:
    database_path = tmp_path / "advisor.duckdb"
    _create_session_fact(database_path)
    connection = duckdb.connect(str(database_path))
    connection.execute(
        "INSERT INTO session_fact SELECT replace(session_key, 'S', 'P2-'), "
        "'M2', terminal_key, amount, final_status, is_successful, has_real_attempt, "
        "has_bank_entry, has_retry, recovered_after_retry, metric_date, final_psp_code, "
        "final_issuer_bank_code, amount_bucket, attempts_count, first_attempt_at, "
        "dataset_version, final_switch_response_code, verify_type FROM session_fact WHERE merchant_key='M1'"
    )
    connection.execute(
        "INSERT INTO session_fact SELECT replace(session_key, 'S', 'P3-'), "
        "'M3', terminal_key, amount, final_status, is_successful, has_real_attempt, "
        "has_bank_entry, has_retry, recovered_after_retry, metric_date, final_psp_code, "
        "final_issuer_bank_code, amount_bucket, attempts_count, first_attempt_at, "
        "dataset_version, final_switch_response_code, verify_type FROM session_fact WHERE merchant_key='M1'"
    )
    connection.close()

    report = MerchantAdvisorService(DuckDbRepository(database_path)).analyze(
        AdvisorQuery(
            "M1", date(2026, 6, 1), date(2026, 6, 1), category_id="12",
            category_title="فروشگاه", peer_merchant_keys=("M2", "M3"),
        )
    )

    comparison = report["peer_comparison"]
    assert comparison["available"] is True
    assert comparison["peer_count"] == 2
    assert comparison["metrics"][0]["merchant_value"] == comparison["metrics"][0]["peer_value"]
    assert comparison["metrics"][0]["peer_equal_weight_value"] == 0.5
    assert comparison["metrics"][0]["peer_median_value"] == 0.5
    assert comparison["metrics"][0]["merchant_percentile"] == 1.0
    assert "M2" not in str(comparison) and "M3" not in str(comparison)


def _create_session_fact(database_path: Path) -> None:
    connection = duckdb.connect(str(database_path))
    connection.execute("""
        CREATE TABLE session_fact (
            session_key VARCHAR, merchant_key VARCHAR, terminal_key VARCHAR,
            amount BIGINT, final_status VARCHAR, is_successful BOOLEAN,
            has_real_attempt BOOLEAN, has_bank_entry BOOLEAN, has_retry BOOLEAN,
            recovered_after_retry BOOLEAN, metric_date DATE, final_psp_code VARCHAR,
            final_issuer_bank_code VARCHAR, amount_bucket VARCHAR, attempts_count INTEGER,
            first_attempt_at TIMESTAMP, dataset_version VARCHAR
            , final_switch_response_code VARCHAR, verify_type VARCHAR
        )
    """)
    rows = []
    for index in range(100):
        is_successful = index < 50
        has_real_attempt = index >= 10
        is_recovered = 40 <= index < 45
        rows.append(
            (
                f"S{index}",
                "M1",
                "T1",
                2_000_000,
                "successful" if is_successful else "unsuccessful",
                is_successful,
                has_real_attempt,
                has_real_attempt,
                is_recovered,
                is_recovered,
                "2026-06-01",
                "PSP-01",
                "BANK-01",
                "1m_to_10m",
                2 if is_recovered else 1,
                f"2026-06-01 {index % 24:02d}:00:00",
                "v1",
                "PSP-01:00",
                "Automated",
            )
        )
    connection.executemany(
        "INSERT INTO session_fact VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rows,
    )
    connection.close()
