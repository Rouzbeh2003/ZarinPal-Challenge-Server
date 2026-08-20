from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import duckdb
from django.conf import settings


class DuckDbRepository:
    def __init__(self, database_path: Path | None = None) -> None:
        self.database_path = database_path or settings.ANALYTICS_DATABASE_PATH

    @contextmanager
    def connect(self, *, read_only: bool = True) -> Iterator[duckdb.DuckDBPyConnection]:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        connection = duckdb.connect(str(self.database_path), read_only=read_only)
        connection.execute(f"SET memory_limit = '{settings.ANALYTICS_MEMORY_LIMIT}'")
        connection.execute(f"SET threads = {settings.ANALYTICS_THREADS}")
        try:
            yield connection
        finally:
            connection.close()

    def fetch_all(self, query: str, parameters: Sequence[Any] = ()) -> list[dict[str, Any]]:
        with self.connect() as connection:
            cursor = connection.execute(query, parameters)
            columns = [item[0] for item in cursor.description]
            return [dict(zip(columns, row, strict=True)) for row in cursor.fetchall()]

    def fetch_one(self, query: str, parameters: Sequence[Any] = ()) -> dict[str, Any] | None:
        rows = self.fetch_all(query, parameters)
        return rows[0] if rows else None
