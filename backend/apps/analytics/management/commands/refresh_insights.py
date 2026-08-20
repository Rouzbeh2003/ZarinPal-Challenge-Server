from datetime import date
from typing import cast

from django.core.management.base import BaseCommand, CommandParser

from apps.analytics.services.insights import InsightQuery, InsightService


class Command(BaseCommand):
    help = "Generate and persist an insight for a merchant and comparison period."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("merchant_key")
        parser.add_argument("date_from", type=date.fromisoformat)
        parser.add_argument("date_to", type=date.fromisoformat)

    def handle(self, *args: object, **options: object) -> None:
        insight = InsightService().generate(
            InsightQuery(
                merchant_key=str(options["merchant_key"]),
                date_from=cast(date, options["date_from"]),
                date_to=cast(date, options["date_to"]),
            )
        )
        if insight is None:
            self.stdout.write("No actionable change met the configured policy.")
            return
        self.stdout.write(self.style.SUCCESS(f"Generated insight {insight.id}"))
