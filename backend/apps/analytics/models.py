import uuid

from django.db import models


class IngestionRun(models.Model):
    class Status(models.TextChoices):
        RUNNING = "running"
        SUCCEEDED = "succeeded"
        FAILED = "failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_name = models.CharField(max_length=255)
    dataset_version = models.CharField(max_length=64, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.RUNNING)
    rows_read = models.PositiveBigIntegerField(default=0)
    sessions_created = models.PositiveBigIntegerField(default=0)
    quality_report = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True)


class Insight(models.Model):
    class Severity(models.TextChoices):
        LOW = "low"
        MEDIUM = "medium"
        HIGH = "high"
        CRITICAL = "critical"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant_key = models.CharField(max_length=64, db_index=True)
    insight_type = models.CharField(max_length=64)
    severity = models.CharField(max_length=16, choices=Severity.choices)
    title = models.CharField(max_length=255)
    summary = models.TextField()
    payload = models.JSONField()
    trace = models.JSONField()
    dataset_version = models.CharField(max_length=64)
    metric_version = models.CharField(max_length=32)
    period_start = models.DateField()
    period_end = models.DateField()
    baseline_start = models.DateField()
    baseline_end = models.DateField()
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["merchant_key", "-generated_at"], name="insight_merchant_time_idx")
        ]
