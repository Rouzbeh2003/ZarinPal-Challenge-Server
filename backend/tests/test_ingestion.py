import csv
import gzip
from pathlib import Path

import pytest
from django.test import override_settings

from apps.analytics.repositories.duckdb_repository import DuckDbRepository
from apps.analytics.services.ingestion import REQUIRED_COLUMNS, IngestionService


@pytest.mark.django_db
def test_golden_ingestion_reconciles_session_metrics(tmp_path: Path) -> None:
    source_path = tmp_path / "golden.csv.gz"
    database_path = tmp_path / "golden.duckdb"
    rows = [
        _row("S1", "1", "Failed", "Failed", "5000000"),
        _row("S1", "2", "Verified", "Verified", "5000000"),
        _row("S2", "0", "Failed", "NoAttempt", "3000000"),
        _row("S3", "1", "Verified", "Verified", "2000000"),
        _row("S4", "1", "Reversed", "Reversed", "1000000"),
    ]
    with gzip.open(source_path, "wt", encoding="utf-8", newline="") as source_file:
        writer = csv.DictWriter(source_file, fieldnames=list(REQUIRED_COLUMNS))
        writer.writeheader()
        writer.writerows(rows)

    repository = DuckDbRepository(database_path)
    with override_settings(ANALYTICS_DATABASE_PATH=database_path):
        result = IngestionService(repository).ingest(source_path)
    totals = repository.fetch_one(
        "SELECT count(*) AS sessions, sum(amount) FILTER (WHERE is_successful) AS successful_amount, count(*) FILTER (WHERE recovered_after_retry) AS recovered FROM session_fact"
    )

    assert result.rows_read == 5
    assert result.sessions_created == 4
    assert totals == {"sessions": 4, "successful_amount": 7_000_000, "recovered": 1}


def _row(
    session_key: str, try_seq: str, session_status: str, try_status: str, amount: str
) -> dict[str, str]:
    row = dict.fromkeys(REQUIRED_COLUMNS, "")
    row.update(
        {
            "session_key": session_key,
            "try_seq": try_seq,
            "terminal_key": "T1",
            "merchant_key": "M1",
            "category_id": "1",
            "category_title": "Test",
            "amount": amount,
            "adjusted_fee": "0",
            "session_status": session_status,
            "try_status": try_status,
            "psp_code": "PSP-01",
            "issuer_bank_code": "BANK-01",
            "verify_type": "Automated",
            "created_at": "2026-01-01 10:00:00",
            "try_created_at": f"2026-01-01 10:00:0{try_seq}",
        }
    )
    if session_status == "Verified":
        row["verified_at"] = "2026-01-01 10:01:00"
    return row
