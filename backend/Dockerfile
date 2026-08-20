FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.8.13 /uv /uvx /bin/
WORKDIR /app
COPY pyproject.toml ./
RUN uv sync --no-dev
COPY . .
RUN mkdir -p data/raw data/processed data/warehouse
ENV PATH="/app/.venv/bin:$PATH"
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000"]
