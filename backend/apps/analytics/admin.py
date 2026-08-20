from django.contrib import admin

from apps.analytics.models import IngestionRun, Insight


@admin.register(IngestionRun)
class IngestionRunAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = (
        "id",
        "source_name",
        "status",
        "rows_read",
        "sessions_created",
        "started_at",
        "finished_at",
    )
    list_filter = ("status",)
    search_fields = ("id", "source_name", "dataset_version")
    readonly_fields = (
        "id",
        "dataset_version",
        "status",
        "rows_read",
        "sessions_created",
        "quality_report",
        "error_message",
        "started_at",
        "finished_at",
    )
    ordering = ("-started_at",)

    def has_add_permission(self, request: object) -> bool:
        return False


@admin.register(Insight)
class InsightAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ("id", "merchant_key", "insight_type", "severity", "generated_at")
    list_filter = ("insight_type", "severity")
    search_fields = ("id", "merchant_key", "title")
    readonly_fields = ("id", "payload", "trace", "generated_at")
    ordering = ("-generated_at",)
