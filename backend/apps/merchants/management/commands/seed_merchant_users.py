import re

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.analytics.repositories.duckdb_repository import DuckDbRepository
from apps.merchants.models import Merchant, MerchantMembership


class Command(BaseCommand):
    help = "Synchronize merchants and create one scoped login for every merchant. Use --reset-passwords to match the credentials dashboard."

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument("--password-template", default="Zarinpal@{merchant_key}")
        parser.add_argument("--reset-passwords", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        rows = DuckDbRepository().fetch_all(
            "SELECT merchant_key, min(category_id) AS category_id, "
            "min(category_title) AS category_title FROM attempt_fact "
            "WHERE merchant_key IS NOT NULL GROUP BY merchant_key"
        )
        user_model = get_user_model()
        created = 0
        for row in rows:
            key = str(row["merchant_key"])
            merchant, _ = Merchant.objects.update_or_create(
                merchant_key=key,
                defaults={"category_id": row["category_id"] or "", "category_title": row["category_title"] or ""},
            )
            safe_key = re.sub(r"[^a-zA-Z0-9_.-]", "_", key).lower()
            username = f"merchant_{safe_key}"[:150]
            password = options["password_template"].format(merchant_key=key)
            user, was_created = user_model.objects.get_or_create(username=username)
            if was_created or options["reset_passwords"]:
                user.set_password(password)
                user.save(update_fields=["password"])
            MerchantMembership.objects.get_or_create(user=user, merchant=merchant)
            created += int(was_created)
            self.stdout.write(f"{key}: username={username} password={password if was_created or options['reset_passwords'] else '[unchanged]'}")
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(rows)} merchant logins ({created} new)."))
