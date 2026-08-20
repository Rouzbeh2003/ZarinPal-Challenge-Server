import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings

from apps.analytics.api import router
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


@pytest.mark.django_db
@override_settings(ENABLE_DEMO_AUTH=True)
def test_demo_session_logs_in_and_grants_local_merchant_access(monkeypatch) -> None:
    merchant = Merchant.objects.create(merchant_key="M-DEMO")
    monkeypatch.setattr(router, "_synchronize_merchants", lambda: None)
    client = Client()

    response = client.post("/api/v1/auth/demo-session")

    assert response.status_code == 200
    assert response.json()["merchant_count"] == 1
    assert MerchantMembership.objects.filter(
        user__username="demo-dashboard", merchant=merchant
    ).exists()
    assert get_user_model().objects.get(username="demo-dashboard").is_staff
    assert client.get("/api/v1/merchants").status_code == 200
