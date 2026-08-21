from datetime import date
from pathlib import Path

import duckdb
import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from apps.analytics.models import Insight
from apps.analytics.repositories.duckdb_repository import DuckDbRepository
from apps.analytics.services.insights import InsightQuery, InsightService
from apps.merchants.jwt import issue_token_pair
from apps.merchants.models import Merchant, MerchantMembership


@pytest.mark.django_db
def test_engine_persists_explainable_insight_and_masks_evidence(tmp_path: Path) -> None:
    database_path = tmp_path / "insights.duckdb"
    _create_session_fact(database_path)
    repository = DuckDbRepository(database_path)

    insight = InsightService(repository).generate(
        InsightQuery("M1", date(2026, 2, 1), date(2026, 2, 1))
    )

    assert insight is not None
    assert insight.insight_type == "payment_success_drop"
    assert insight.payload["metric"]["current"] == 0.5
    assert insight.payload["metric"]["baseline"] == 0.8
    assert insight.payload["financial_impact"]["amount"] == 60_000_000
    assert insight.payload["coverage"] == 1.0
    assert insight.payload["coverage_details"]["metric_analyzed_records"] == 200
    assert insight.payload["coverage_details"]["adjusted_analyzed_records"] == 200
    assert insight.payload["adjusted_analysis"]["raw_effect"] == pytest.approx(-0.3)
    assert insight.payload["adjusted_analysis"]["adjusted_effect"] == pytest.approx(-0.3)
    action = insight.payload["recommended_actions"][0]
    assert action["target_value"] == pytest.approx(0.65)
    assert action["horizon_days"] == 1
    assert action["potential_financial_impact"] == 30_000_000
    assert action["impact_is_additive"] is False
    assert insight.payload["recommended_actions"][1]["potential_financial_impact"] == 0
    assert insight.payload["action_plan"]["impact_is_additive"] is False
    assert insight.trace["target_policy"]["is_data_derived"] is False
    assert insight.trace["target_policy"]["configurable"] is True
    assert insight.trace["current_calculation"]["denominator"] == 100
    evidence = InsightService(repository).evidence(insight, page=1, page_size=1)
    assert evidence["items"][0]["payer_card_masked"] == "***1234"
    assert "payer-card-1234" not in str(evidence)


@pytest.mark.django_db
def test_coverage_counts_null_and_excluded_records(tmp_path: Path) -> None:
    database_path = tmp_path / "coverage.duckdb"
    _create_session_fact(database_path)
    connection = duckdb.connect(str(database_path))
    connection.execute(
        "UPDATE session_fact SET final_psp_code = NULL WHERE session_key = '2026-02-01-0'"
    )
    connection.execute(
        "UPDATE session_fact SET final_status = 'excluded' WHERE session_key = '2026-02-01-1'"
    )
    connection.close()

    insight = InsightService(DuckDbRepository(database_path)).generate(
        InsightQuery("M1", date(2026, 2, 1), date(2026, 2, 1))
    )

    assert insight is not None
    assert insight.payload["coverage"] == pytest.approx(199 / 200)
    assert insight.payload["coverage_details"]["adjusted_coverage"] == pytest.approx(198 / 200)
    assert insight.payload["coverage_details"]["excluded_records"] == 1
    assert insight.payload["coverage_details"]["metric_null_records"] == 0
    assert insight.payload["coverage_details"]["adjusted_null_records"] == 1


@pytest.mark.django_db
def test_insight_detail_enforces_merchant_membership(tmp_path: Path) -> None:
    merchant = Merchant.objects.create(merchant_key="M1")
    other_merchant = Merchant.objects.create(merchant_key="M2")
    user = get_user_model().objects.create_user(username="analyst")
    MerchantMembership.objects.create(user=user, merchant=other_merchant)
    insight = Insight.objects.create(
        merchant_key=merchant.merchant_key,
        insight_type="payment_success_drop",
        severity="high",
        title="title",
        summary="summary",
        payload={
            "metric": {
                "name": "success_rate",
                "current": 0.5,
                "baseline": 0.8,
                "absolute_change": -0.3,
                "relative_change": -0.375,
            },
            "financial_impact": {"amount": 1, "currency": "IRR", "method": "test"},
            "drivers": [],
            "recommended_actions": [],
            "confidence": 0.99,
            "coverage": 1.0,
            "period": {},
            "baseline_period": {},
        },
        trace={},
        dataset_version="v1",
        metric_version="1.0.0",
        period_start=date(2026, 2, 1),
        period_end=date(2026, 2, 1),
        baseline_start=date(2026, 1, 31),
        baseline_end=date(2026, 1, 31),
    )
    client = Client()
    access_token = issue_token_pair(user)["access_token"]

    response = client.get(
        f"/api/v1/insights/{insight.id}", HTTP_AUTHORIZATION=f"Bearer {access_token}"
    )

    assert response.status_code == 403


def _create_session_fact(database_path: Path) -> None:
    connection = duckdb.connect(str(database_path))
    connection.execute("""
        CREATE TABLE session_fact (
            session_key VARCHAR, merchant_key VARCHAR, terminal_key VARCHAR,
            amount BIGINT, final_status VARCHAR, is_successful BOOLEAN,
            has_real_attempt BOOLEAN, has_bank_entry BOOLEAN, has_retry BOOLEAN,
            recovered_after_retry BOOLEAN, metric_date DATE, final_psp_code VARCHAR,
            final_issuer_bank_code VARCHAR, amount_bucket VARCHAR, attempts_count INTEGER,
            first_attempt_at TIMESTAMP, payer_card_key VARCHAR, dataset_version VARCHAR
        )
    """)
    rows = []
    for day, successes in (("2026-01-31", 80), ("2026-02-01", 50)):
        for index in range(100):
            successful = index < successes
            rows.append(
                (
                    f"{day}-{index}",
                    "M1",
                    "T1",
                    2_000_000,
                    "successful" if successful else "unsuccessful",
                    successful,
                    True,
                    True,
                    False,
                    False,
                    day,
                    "PSP-01",
                    "BANK-01",
                    "1m_to_10m",
                    1,
                    f"{day} 10:00:00",
                    "payer-card-1234",
                    "v1",
                )
            )
    connection.executemany(
        "INSERT INTO session_fact VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rows,
    )
    connection.close()
