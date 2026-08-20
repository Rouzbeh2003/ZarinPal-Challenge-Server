import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("analytics", "0001_initial")]
    operations = [
        migrations.CreateModel(
            name="Insight",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("merchant_key", models.CharField(db_index=True, max_length=64)),
                ("insight_type", models.CharField(max_length=64)),
                (
                    "severity",
                    models.CharField(
                        choices=[
                            ("low", "Low"),
                            ("medium", "Medium"),
                            ("high", "High"),
                            ("critical", "Critical"),
                        ],
                        max_length=16,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("summary", models.TextField()),
                ("payload", models.JSONField()),
                ("trace", models.JSONField()),
                ("dataset_version", models.CharField(max_length=64)),
                ("metric_version", models.CharField(max_length=32)),
                ("period_start", models.DateField()),
                ("period_end", models.DateField()),
                ("baseline_start", models.DateField()),
                ("baseline_end", models.DateField()),
                ("generated_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["merchant_key", "-generated_at"], name="insight_merchant_time_idx"
                    )
                ]
            },
        )
    ]
