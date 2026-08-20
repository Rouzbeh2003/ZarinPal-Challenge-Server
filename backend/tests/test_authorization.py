import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from apps.merchants.models import Merchant, MerchantMembership


@pytest.mark.django_db
def test_user_cannot_query_a_merchant_without_membership() -> None:
    user = get_user_model().objects.create_user(username="analyst", password="test-password")
    Merchant.objects.create(merchant_key="M-OTHER")
    client = Client()
    client.force_login(user)

    response = client.get(
        "/api/v1/merchants/M-OTHER/overview", {"date_from": "2026-01-01", "date_to": "2026-01-02"}
    )

    assert response.status_code == 403
    assert response.json()["code"] == "merchant_access_denied"


@pytest.mark.django_db
def test_merchant_list_only_contains_user_memberships() -> None:
    user = get_user_model().objects.create_user(username="analyst")
    allowed = Merchant.objects.create(merchant_key="M-ALLOWED")
    Merchant.objects.create(merchant_key="M-HIDDEN")
    MerchantMembership.objects.create(user=user, merchant=allowed)
    client = Client()
    client.force_login(user)

    response = client.get("/api/v1/merchants")

    assert response.status_code == 200
    assert [item["merchant_key"] for item in response.json()["items"]] == ["M-ALLOWED"]
