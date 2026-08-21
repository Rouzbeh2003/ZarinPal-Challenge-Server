import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings

from apps.analytics.api import router
from apps.merchants.jwt import issue_token_pair
from apps.merchants.models import Merchant, MerchantMembership


def _authorize(client: Client, user: object) -> None:
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {issue_token_pair(user)['access_token']}"


@pytest.mark.django_db
def test_user_cannot_query_a_merchant_without_membership() -> None:
    user = get_user_model().objects.create_user(username="analyst", password="test-password")
    Merchant.objects.create(merchant_key="M-OTHER")
    client = Client()
    _authorize(client, user)

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
    _authorize(client, user)

    response = client.get("/api/v1/merchants")

    assert response.status_code == 200
    assert [item["merchant_key"] for item in response.json()["items"]] == ["M-ALLOWED"]


@pytest.mark.django_db
def test_merchant_user_cannot_read_global_data_quality() -> None:
    user = get_user_model().objects.create_user(username="merchant-user")
    client = Client()
    _authorize(client, user)

    response = client.get("/api/v1/data-quality/latest")

    assert response.status_code == 403


@pytest.mark.django_db
def test_merchant_credentials_are_restricted_to_superusers(tmp_path, settings) -> None:
    merchant = Merchant.objects.create(merchant_key="M1", category_title="فروشگاه")
    regular_user = get_user_model().objects.create_user(username="merchant_m1")
    superuser = get_user_model().objects.create_superuser(username="root", password="secret")
    credentials_file = tmp_path / "merchant_credentials.csv"
    credentials_file.write_text(
        "merchant_key,username,password\nM1,merchant_m1,Zarinpal@M1\n", encoding="utf-8"
    )
    settings.BASE_DIR = tmp_path / "backend"

    regular_client = Client()
    _authorize(regular_client, regular_user)
    assert regular_client.get("/api/v1/admin/merchant-credentials").status_code == 403

    superuser_client = Client()
    _authorize(superuser_client, superuser)
    response = superuser_client.get("/api/v1/admin/merchant-credentials")

    assert response.status_code == 200
    assert response.json()["items"] == [{
        "merchant_key": merchant.merchant_key,
        "category_title": "فروشگاه",
        "username": "merchant_m1",
        "password": "Zarinpal@M1",
    }]


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
    token = response.json()["access_token"]
    assert client.get("/api/v1/merchants", HTTP_AUTHORIZATION=f"Bearer {token}").status_code == 200
    session = client.get("/api/v1/auth/session", HTTP_AUTHORIZATION=f"Bearer {token}")
    assert session.json() == {"username": "demo-dashboard", "is_superuser": True}

    credentials = client.get(
        "/api/v1/admin/merchant-credentials", HTTP_AUTHORIZATION=f"Bearer {token}"
    )
    assert credentials.status_code == 200


@pytest.mark.django_db
def test_login_refresh_rotation_and_logout() -> None:
    get_user_model().objects.create_user(username="analyst", password="test-password")
    client = Client()

    login_response = client.post(
        "/api/v1/auth/login",
        {"username": "analyst", "password": "test-password"},
        content_type="application/json",
    )
    assert login_response.status_code == 200
    first_refresh = login_response.json()["refresh_token"]

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        {"refresh_token": first_refresh},
        content_type="application/json",
    )
    assert refresh_response.status_code == 200
    second_refresh = refresh_response.json()["refresh_token"]
    assert second_refresh != first_refresh

    reused = client.post(
        "/api/v1/auth/refresh",
        {"refresh_token": first_refresh},
        content_type="application/json",
    )
    assert reused.status_code == 401

    logout = client.post(
        "/api/v1/auth/logout",
        {"refresh_token": second_refresh},
        content_type="application/json",
    )
    assert logout.status_code == 204
    after_logout = client.post(
        "/api/v1/auth/refresh",
        {"refresh_token": second_refresh},
        content_type="application/json",
    )
    assert after_logout.status_code == 401


@pytest.mark.django_db
def test_authenticated_user_can_update_own_username_and_password() -> None:
    user = get_user_model().objects.create_user(username="old-name", password="old-password")
    client = Client()
    _authorize(client, user)

    response = client.put(
        "/api/v1/auth/account",
        {"current_password": "old-password", "username": "new-name", "new_password": "new-password"},
        content_type="application/json",
    )

    assert response.status_code == 200
    assert response.json()["username"] == "new-name"
    user.refresh_from_db()
    assert user.username == "new-name"
    assert user.check_password("new-password")


@pytest.mark.django_db
def test_account_update_requires_current_password() -> None:
    user = get_user_model().objects.create_user(username="analyst", password="correct-password")
    client = Client()
    _authorize(client, user)

    response = client.put(
        "/api/v1/auth/account",
        {"current_password": "wrong-password", "username": "changed-name", "new_password": None},
        content_type="application/json",
    )

    assert response.status_code == 400
    user.refresh_from_db()
    assert user.username == "analyst"
