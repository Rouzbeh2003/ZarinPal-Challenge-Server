import hashlib
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import cast

from duckdb import DuckDBPyConnection

from apps.analytics.repositories.duckdb_repository import DuckDbRepository

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {
    "session_key",
    "try_seq",
    "terminal_key",
    "merchant_key",
    "category_id",
    "category_title",
    "amount",
    "adjusted_fee",
    "session_status",
    "try_status",
    "switch_response_code",
    "psp_code",
    "issuer_bank_code",
    "payer_card_key",
    "verify_type",
    "init_time_ms",
    "verify_time_ms",
    "created_at",
    "try_created_at",
    "verified_at",
    "settled_at",
    "expire_in",
}


@dataclass(frozen=True)
class IngestionResult:
    dataset_version: str
    rows_read: int
    sessions_created: int
    quality_report: dict[str, object]


class IngestionService:
    def __init__(self, repository: DuckDbRepository | None = None) -> None:
        self.repository = repository or DuckDbRepository()

    def ingest(self, source_path: Path) -> IngestionResult:
        if not source_path.is_file():
            raise FileNotFoundError(f"Input file does not exist: {source_path}")
        dataset_version = _calculate_file_hash(source_path)
        with self.repository.connect(read_only=False) as connection:
            self._load_staging(connection, source_path)
            self._validate_columns(connection)
            self._build_attempt_fact(connection, dataset_version)
            self._build_quality_issues(connection, dataset_version)
            self._build_session_fact(connection, dataset_version)
            self._build_daily_metrics(connection, dataset_version)
            self._export_parquet(connection)
            rows_read = cast(
                int,
                _required_row(
                    connection.execute("SELECT count(*) FROM raw_attempt_staging").fetchone()
                )[0],
            )
            sessions = cast(
                int,
                _required_row(connection.execute("SELECT count(*) FROM session_fact").fetchone())[
                    0
                ],
            )
            quality_report = self._quality_report(connection)
        logger.info(
            "analytics_ingestion_finished",
            extra={
                "dataset_version": dataset_version,
                "rows_read": rows_read,
                "sessions_created": sessions,
            },
        )
        return IngestionResult(dataset_version, rows_read, sessions, quality_report)

    @staticmethod
    def _load_staging(connection: DuckDBPyConnection, source_path: Path) -> None:
        connection.execute("DROP TABLE IF EXISTS raw_attempt_staging")
        connection.execute(
            "CREATE TABLE raw_attempt_staging AS SELECT * FROM read_csv(?, header=true, all_varchar=true, nullstr='')",
            [str(source_path)],
        )

    @staticmethod
    def _validate_columns(connection: DuckDBPyConnection) -> None:
        columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info('raw_attempt_staging')").fetchall()
        }
        missing_columns = sorted(REQUIRED_COLUMNS - columns)
        if missing_columns:
            raise ValueError(f"Required columns are missing: {', '.join(missing_columns)}")

    @staticmethod
    def _build_attempt_fact(connection: DuckDBPyConnection, dataset_version: str) -> None:
        connection.execute("DROP TABLE IF EXISTS attempt_fact")
        connection.execute(
            """
        -- Grain: one source row per payment attempt.
        CREATE TABLE attempt_fact AS
        SELECT session_key,
               try_cast(try_seq AS INTEGER) AS try_seq,
               terminal_key, merchant_key, category_id, category_title,
               try_cast(amount AS BIGINT) AS amount,
               try_cast(adjusted_fee AS BIGINT) AS adjusted_fee,
               session_status, try_status, switch_response_code, psp_code,
               issuer_bank_code, payer_card_key, verify_type,
               try_cast(init_time_ms AS BIGINT) AS init_time_ms,
               try_cast(verify_time_ms AS BIGINT) AS verify_time_ms,
               try_cast(created_at AS TIMESTAMP) AS created_at,
               try_cast(try_created_at AS TIMESTAMP) AS try_created_at,
               try_cast(verified_at AS TIMESTAMP) AS verified_at,
               try_cast(settled_at AS TIMESTAMP) AS settled_at,
               try_cast(expire_in AS TIMESTAMP) AS expire_in,
               ?::VARCHAR AS dataset_version
        FROM raw_attempt_staging
        """,
            [dataset_version],
        )

    @staticmethod
    def _build_quality_issues(connection: DuckDBPyConnection, dataset_version: str) -> None:
        connection.execute("DROP TABLE IF EXISTS data_quality_issue")
        connection.execute(
            """
        CREATE TABLE data_quality_issue AS
        WITH duplicate_keys AS (
            SELECT session_key, try_seq FROM attempt_fact
            GROUP BY session_key, try_seq HAVING count(*) > 1
        ), session_checks AS (
            SELECT session_key,
                   count(DISTINCT merchant_key) > 1 AS inconsistent_merchant,
                   count(DISTINCT terminal_key) > 1 AS inconsistent_terminal,
                   count(DISTINCT amount) > 1 AS inconsistent_amount
            FROM attempt_fact GROUP BY session_key
        )
        SELECT ?::VARCHAR AS dataset_version, attempt.session_key, attempt.try_seq, issue.reason
        FROM attempt_fact AS attempt
        JOIN duplicate_keys USING (session_key, try_seq)
        CROSS JOIN (SELECT 'duplicate_attempt_key' AS reason) AS issue
        UNION ALL
        SELECT ?, session_key, NULL, 'inconsistent_merchant' FROM session_checks WHERE inconsistent_merchant
        UNION ALL
        SELECT ?, session_key, NULL, 'inconsistent_terminal' FROM session_checks WHERE inconsistent_terminal
        UNION ALL
        SELECT ?, session_key, NULL, 'inconsistent_amount' FROM session_checks WHERE inconsistent_amount
        UNION ALL
        SELECT ?, session_key, try_seq, 'malformed_required_value' FROM attempt_fact
        WHERE session_key IS NULL OR merchant_key IS NULL OR try_seq IS NULL OR amount IS NULL OR created_at IS NULL
        UNION ALL
        SELECT ?, session_key, try_seq, 'non_positive_amount' FROM attempt_fact WHERE amount <= 0
        UNION ALL
        SELECT ?, session_key, try_seq, 'impossible_event_order' FROM attempt_fact
        WHERE (try_created_at < created_at) OR (verified_at < created_at) OR (settled_at < created_at)
        UNION ALL
        SELECT ?, session_key, try_seq, 'unknown_status' FROM attempt_fact
        WHERE lower(coalesce(session_status, '')) NOT IN ('verified', 'paid', 'failed', 'reversed', 'expired')
           OR lower(coalesce(try_status, '')) NOT IN ('verified', 'paid', 'failed', 'reversed', 'expired', 'inbank', 'noattempt')
        """,
            [dataset_version] * 8,
        )

    @staticmethod
    def _build_session_fact(connection: DuckDBPyConnection, dataset_version: str) -> None:
        connection.execute("DROP TABLE IF EXISTS session_fact")
        connection.execute(
            """
        -- Grain: exactly one row per session_key. Amount is selected, never summed.
        CREATE TABLE session_fact AS
        WITH invalid_sessions AS (
            SELECT DISTINCT session_key FROM data_quality_issue
            WHERE reason IN ('inconsistent_merchant', 'inconsistent_terminal', 'inconsistent_amount', 'malformed_required_value')
        ), deduplicated AS (
            SELECT * EXCLUDE (row_number_in_key) FROM (
                SELECT *, row_number() OVER (PARTITION BY session_key, try_seq ORDER BY try_created_at NULLS LAST) AS row_number_in_key
                FROM attempt_fact
            ) WHERE row_number_in_key = 1
        ), session_issues AS (
            SELECT session_key, list(DISTINCT reason) AS data_quality_flags
            FROM data_quality_issue
            GROUP BY session_key
        ), grouped AS (
            SELECT session_key,
                   min(merchant_key) AS merchant_key,
                   min(terminal_key) AS terminal_key,
                   min(category_id) AS category_id,
                   min(amount) AS amount,
                   CASE WHEN bool_or(lower(session_status) = 'reversed') THEN 'reversed'
                        WHEN bool_or(lower(session_status) IN ('verified', 'paid')) THEN 'successful'
                        WHEN min(amount) <= 0 OR session_key IN (SELECT session_key FROM invalid_sessions) THEN 'excluded'
                        ELSE 'unsuccessful' END AS final_status,
                   count(*) FILTER (WHERE try_seq > 0 AND lower(try_status) != 'noattempt') AS attempts_count,
                   max(try_seq) AS max_try_seq,
                   bool_or(try_seq > 0 AND lower(try_status) != 'noattempt') AS has_real_attempt,
                   bool_or(lower(try_status) = 'inbank') AS has_bank_entry,
                   count(*) FILTER (WHERE try_seq > 0 AND lower(try_status) != 'noattempt') > 1 AS has_retry,
                   coalesce(
                       min(attempt.try_seq) FILTER (
                           WHERE lower(try_status) IN ('verified', 'paid')
                       ) > min(attempt.try_seq) FILTER (
                           WHERE lower(try_status) NOT IN ('verified', 'paid', 'noattempt')
                       ) AND count(*) FILTER (
                           WHERE attempt.try_seq > 0 AND lower(try_status) != 'noattempt'
                       ) > 1,
                       false
                   ) AS recovered_after_retry,
                   min(coalesce(try_created_at, created_at)) AS first_attempt_at,
                   max(coalesce(try_created_at, created_at)) AS last_attempt_at,
                   max(verified_at) AS verified_at, max(settled_at) AS settled_at,
                   arg_max(psp_code, coalesce(try_created_at, created_at)) AS final_psp_code,
                   arg_max(issuer_bank_code, coalesce(try_created_at, created_at)) AS final_issuer_bank_code,
                   arg_max(payer_card_key, coalesce(try_created_at, created_at)) AS payer_card_key,
                   any_value(issue.data_quality_flags) AS data_quality_flags
            FROM deduplicated AS attempt
            LEFT JOIN session_issues AS issue USING (session_key)
            GROUP BY attempt.session_key
        )
        SELECT *, final_status = 'successful' AS is_successful,
               final_status = 'reversed' AS is_reversed,
               date(first_attempt_at) AS metric_date,
               date_diff('millisecond', first_attempt_at, coalesce(verified_at, last_attempt_at)) AS completion_time_ms,
               CASE WHEN amount < 1000000 THEN 'under_1m'
                    WHEN amount < 10000000 THEN '1m_to_10m'
                    WHEN amount < 100000000 THEN '10m_to_100m'
                    ELSE '100m_and_above' END AS amount_bucket,
               ?::VARCHAR AS dataset_version
        FROM grouped
        """,
            [dataset_version],
        )

    @staticmethod
    def _build_daily_metrics(connection: DuckDBPyConnection, dataset_version: str) -> None:
        connection.execute("DROP TABLE IF EXISTS merchant_daily_metrics")
        connection.execute(
            """
        -- Grain: one row per merchant_key and metric_date.
        CREATE TABLE merchant_daily_metrics AS
        SELECT merchant_key, metric_date,
               count(*) FILTER (WHERE final_status != 'excluded') AS valid_sessions,
               count(*) FILTER (WHERE is_successful) AS successful_sessions,
               sum(amount) FILTER (WHERE is_successful)::HUGEINT AS successful_amount,
               count(*) FILTER (WHERE NOT has_real_attempt) AS no_attempt_sessions,
               count(*) FILTER (WHERE has_retry) AS retried_sessions,
               count(*) FILTER (WHERE recovered_after_retry) AS recovered_sessions,
               sum(amount) FILTER (WHERE recovered_after_retry)::HUGEINT AS recovered_amount,
               ?::VARCHAR AS dataset_version
        FROM session_fact GROUP BY merchant_key, metric_date
        """,
            [dataset_version],
        )

    def _export_parquet(self, connection: DuckDBPyConnection) -> None:
        processed_path = self.repository.database_path.parent.parent / "processed"
        processed_path.mkdir(parents=True, exist_ok=True)
        for table_name in (
            "attempt_fact",
            "session_fact",
            "merchant_daily_metrics",
            "data_quality_issue",
        ):
            output_path = processed_path / f"{table_name}.parquet"
            connection.execute(
                f"COPY {table_name} TO ? (FORMAT PARQUET, COMPRESSION ZSTD)", [str(output_path)]
            )

    @staticmethod
    def _quality_report(connection: DuckDBPyConnection) -> dict[str, object]:
        issues = connection.execute(
            "SELECT reason, count(*) FROM data_quality_issue GROUP BY reason ORDER BY reason"
        ).fetchall()
        null_rates = _required_row(
            connection.execute("""
            SELECT count(*) AS rows,
                   avg((payer_card_key IS NULL)::INTEGER) AS payer_card_key_null_rate,
                   avg((issuer_bank_code IS NULL)::INTEGER) AS issuer_bank_code_null_rate
            FROM attempt_fact
        """).fetchone()
        )
        return {
            "issues": {reason: count for reason, count in issues},
            "rows": null_rates[0],
            "null_rates": {"payer_card_key": null_rates[1], "issuer_bank_code": null_rates[2]},
        }


def _calculate_file_hash(source_path: Path) -> str:
    digest = hashlib.sha256()
    with source_path.open("rb") as source_file:
        while chunk := source_file.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()[:16]


def _required_row(row: tuple[object, ...] | None) -> tuple[object, ...]:
    if row is None:
        raise RuntimeError("Expected the analytics query to return one row")
    return row
