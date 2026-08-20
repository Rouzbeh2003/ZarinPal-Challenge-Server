from datetime import date, datetime
from typing import Any

from ninja import Schema
from pydantic import Field, model_validator


class ErrorResponse(Schema):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    request_id: str


class MetricFilters(Schema):
    date_from: date
    date_to: date
    timezone: str = "Asia/Tehran"
    terminal_key: str | None = None
    psp_code: str | None = None
    issuer_bank_code: str | None = None
    amount_bucket: str | None = None

    @model_validator(mode="after")
    def validate_range(self) -> "MetricFilters":
        if self.date_from > self.date_to:
            raise ValueError("date_from must be before or equal to date_to")
        if (self.date_to - self.date_from).days > 366:
            raise ValueError("date range cannot exceed 366 days")
        return self


class AdvisorRequest(MetricFilters):
    question: str | None = Field(default=None, max_length=1000)


class AdvisorResponse(Schema):
    merchant_key: str
    period: dict[str, date]
    executive_summary: list[str]
    overview: dict[str, Any]
    dimensions: dict[str, list[dict[str, Any]]]
    retry: dict[str, Any]
    trends: dict[str, Any]
    predicted_needs: list[dict[str, Any]]
    recommendations: list[dict[str, Any]]
    advisor_narrative: dict[str, Any] | None
    narrative_source: str
    methodology: dict[str, str]


class HealthResponse(Schema):
    status: str
    postgres: str
    analytic_store: str
    dataset_version: str | None
    data_date_from: date | None = None
    data_date_to: date | None = None


class LoginRequest(Schema):
    username: str
    password: str


class RefreshRequest(Schema):
    refresh_token: str


class TokenResponse(Schema):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int


class DemoSessionResponse(TokenResponse):
    username: str
    merchant_count: int


class MerchantResponse(Schema):
    merchant_key: str
    category_id: str
    category_title: str


class MerchantListResponse(Schema):
    items: list[MerchantResponse]
    page: int
    page_size: int
    total: int


class DailyTrendResponse(Schema):
    date: date
    valid_sessions: int
    successful_sessions: int
    successful_amount: int
    success_rate: float | None


class PspBreakdownResponse(Schema):
    psp_code: str
    session_count: int
    successful_sessions: int
    success_rate: float | None
    potential_lost_amount: int


class OverviewResponse(Schema):
    valid_sessions: int
    successful_sessions: int
    successful_amount: int
    paid_unverified_sessions: int
    paid_unverified_amount: int
    potential_lost_amount: int
    no_attempt_sessions: int
    success_rate: float | None
    paid_unverified_rate: float | None
    no_attempt_rate: float | None
    currency: str
    metric_version: str
    daily_trend: list[DailyTrendResponse] = Field(default_factory=list)
    psp_breakdown: list[PspBreakdownResponse] = Field(default_factory=list)


class FunnelResponse(Schema):
    created_sessions: int
    attempted_sessions: int
    bank_entry_sessions: int
    successful_sessions: int


class RetryResponse(Schema):
    sessions_with_attempt: int
    retried_sessions: int
    recovered_sessions: int
    recovered_amount: int
    retry_rate: float | None
    retry_recovery_rate: float | None
    currency: str
    metric_version: str
    breakdown: list[dict[str, Any]] = Field(default_factory=list)


class IngestionRunResponse(Schema):
    id: str
    status: str
    dataset_version: str
    rows_read: int
    sessions_created: int
    started_at: datetime
    finished_at: datetime | None
    quality_report: dict[str, Any]


class InsightMetricResponse(Schema):
    name: str
    current: float
    baseline: float
    absolute_change: float
    relative_change: float | None


class FinancialImpactResponse(Schema):
    amount: int
    currency: str
    method: str


class InsightResponse(Schema):
    id: str
    merchant_id: str
    type: str
    severity: str
    title: str
    summary: str
    metric: InsightMetricResponse
    financial_impact: FinancialImpactResponse
    drivers: list[dict[str, Any]]
    recommended_actions: list[dict[str, str]]
    confidence: float
    coverage: float
    period: dict[str, str]
    baseline_period: dict[str, str]
    trace_id: str
    generated_at: datetime


class InsightListResponse(Schema):
    items: list[InsightResponse]
    page: int
    page_size: int
    total: int


class InsightTraceResponse(Schema):
    trace_id: str
    insight_id: str
    trace: dict[str, Any]
    generated_at: datetime


class EvidenceItemResponse(Schema):
    session_key: str
    metric_date: date
    amount: int
    final_status: str
    attempts_count: int
    final_psp_code: str | None
    final_issuer_bank_code: str | None
    payer_card_masked: str | None


class EvidenceListResponse(Schema):
    items: list[EvidenceItemResponse]
    page: int
    page_size: int
    total: int
