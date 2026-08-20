from pathlib import Path
from typing import cast

from django.core.management.base import BaseCommand, CommandParser
from django.utils import timezone

from apps.analytics.api.router import _synchronize_merchants
from apps.analytics.models import IngestionRun
from apps.analytics.services.ingestion import IngestionService


class Command(BaseCommand):
    help = "Validate a CSV.GZ file and rebuild the DuckDB analytics facts."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("source", type=Path)

    def handle(self, *args: object, **options: object) -> None:
        source_path = cast(Path, options["source"])
        run = IngestionRun.objects.create(source_name=source_path.name)
        try:
            result = IngestionService().ingest(source_path)
            run.dataset_version = result.dataset_version
            run.rows_read = result.rows_read
            run.sessions_created = result.sessions_created
            run.quality_report = result.quality_report
            run.status = IngestionRun.Status.SUCCEEDED
            _synchronize_merchants()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Ingested {result.rows_read} attempts into {result.sessions_created} sessions"
                )
            )
        except Exception as error:
            run.status = IngestionRun.Status.FAILED
            run.error_message = str(error)
            raise
        finally:
            run.finished_at = timezone.now()
            run.save()
