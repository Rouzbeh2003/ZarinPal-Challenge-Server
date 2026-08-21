from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from apps.merchants.models import MerchantMembership


@pytest.mark.django_db
@patch("apps.merchants.management.commands.seed_merchant_users.DuckDbRepository.fetch_all")
def test_seeder_creates_one_scoped_login_per_merchant(fetch_all) -> None:  # type: ignore[no-untyped-def]
    fetch_all.return_value = [
        {"merchant_key": "M-ONE", "category_id": "10", "category_title": "خرده‌فروشی"},
        {"merchant_key": "M-TWO", "category_id": "20", "category_title": "خدمات"},
    ]

    call_command("seed_merchant_users")

    first = get_user_model().objects.get(username="merchant_m-one")
    assert first.check_password("Zarinpal@M-ONE")
    assert list(first.merchantmembership_set.values_list("merchant__merchant_key", flat=True)) == ["M-ONE"]
    assert MerchantMembership.objects.count() == 2


@pytest.mark.django_db
@patch("apps.merchants.management.commands.seed_merchant_users.DuckDbRepository.fetch_all")
def test_seeder_can_reset_existing_password_to_displayed_template(fetch_all) -> None:  # type: ignore[no-untyped-def]
    fetch_all.return_value = [
        {"merchant_key": "M10", "category_id": "10", "category_title": "خدمات"},
    ]
    user = get_user_model().objects.create_user(
        username="merchant_m10", password="out-of-sync-password"
    )

    call_command("seed_merchant_users", reset_passwords=True)

    user.refresh_from_db()
    assert user.check_password("Zarinpal@M10")
