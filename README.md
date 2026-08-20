# ZarinPal Merchant Analytics

Backend analytics and explainable Insight Engine for merchant payment attempts.

## What is included

- Django 5.2 and Django Ninja API with OpenAPI at `/api/v1/docs`
- PostgreSQL application data and merchant-level membership authorization
- DuckDB ingestion from the supplied CSV.GZ
- `attempt_fact`, deduplicated `session_fact`, `merchant_daily_metrics`, and Parquet exports
- Data-quality issues with explicit reasons
- Overview, payment health, funnel, retry, merchant list, and latest quality APIs
- Versioned success-rate change detection with equal-period baselines, sample and significance checks
- Financial-impact estimates, associative driver breakdowns, recommendations, trace, and masked evidence
- Unit, authorization, ingestion, golden-number, and reconciliation tests

The code follows a direct path that is easy to inspect:

```text
API -> MetricsService -> DuckDbRepository -> session_fact
CSV.GZ -> IngestionService -> attempt_fact -> session_fact -> daily metrics
```

## Local setup with Docker

1. Copy `.env.example` to `.env`.
2. Keep `other_challenge_data.csv.gz` in the repository root.
3. Start the services:

   ```bash
   docker compose up --build -d
   docker compose exec backend uv run python manage.py migrate
   docker compose exec backend uv run python manage.py createsuperuser
   ```

4. Ingest the dataset:

   ```bash
   docker compose exec backend uv run python manage.py ingest_analytics data/raw/other_challenge_data.csv.gz
   ```

5. Open `http://localhost:8000/api/v1/docs`.

## Local setup without Docker

Python 3.12+, `uv`, and PostgreSQL are required.

```bash
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py ingest_analytics ../other_challenge_data.csv.gz
uv run uvicorn config.asgi:application --reload
```

Set `DATABASE_URL` and `ANALYTICS_DATABASE_PATH` when their defaults are not suitable.

## API authentication and merchant access

Dashboard endpoints use Django session authentication. A user can query a merchant only when a matching `MerchantMembership` exists. Ingestion automatically synchronizes merchant records but does not grant memberships. Create those through Django admin or the shell:

```python
MerchantMembership.objects.create(user=user, merchant=merchant)
```

The ingestion API is additionally restricted to staff. For the 61 MB source file, the management command is preferred because it does not occupy an HTTP request.

## Main endpoints

- `GET /api/v1/health`
- `GET /api/v1/merchants`
- `GET /api/v1/merchants/{merchant_key}/overview`
- `GET /api/v1/merchants/{merchant_key}/payment-health`
- `GET /api/v1/merchants/{merchant_key}/funnel`
- `GET /api/v1/merchants/{merchant_key}/retry-analysis`
- `GET /api/v1/data-quality/latest`
- `GET /api/v1/merchants/{merchant_key}/insights`
- `GET /api/v1/insights/{insight_id}`
- `GET /api/v1/insights/{insight_id}/trace`
- `GET /api/v1/insights/{insight_id}/evidence`
- `POST /api/v1/admin/ingestion-runs`
- `POST /api/v1/admin/analytics-refresh`

Metric endpoints require `date_from` and `date_to` in ISO `YYYY-MM-DD` form and accept allowlisted terminal, PSP, bank, and amount-bucket filters.

Generate an insight after ingestion with either the staff-only refresh API or:

```bash
cd backend
uv run python manage.py refresh_insights MERCHANT_KEY 2026-06-01 2026-06-30
```

The default baseline is the immediately preceding period of equal length. An insight is persisted only when both periods contain at least 30 valid sessions, the absolute change is at least three percentage points, and the two-proportion z-test reaches the configured 95% threshold. Driver language is associative, never causal. Financial impact is explicitly potential rather than confirmed loss.

## Quality checks

```bash
cd backend
uv run ruff format --check .
uv run ruff check .
uv run mypy apps
uv run pytest
```

Metric formulas and assumptions are in [backend/docs/METRICS.md](backend/docs/METRICS.md) and [backend/docs/DECISIONS.md](backend/docs/DECISIONS.md).

## Troubleshooting

- `analytic_store: not_ready`: run ingestion once and verify `ANALYTICS_DATABASE_PATH` is writable.
- PostgreSQL connection failure: confirm the container is healthy and `DATABASE_URL` matches Compose.
- Empty merchant list: ingestion creates merchants, but an administrator must create user memberships.
- Ingestion schema error: check that all 22 required source columns are present; problematic values are retained in the quality report.
