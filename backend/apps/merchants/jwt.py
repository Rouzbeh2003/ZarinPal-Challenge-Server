import base64
import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction
from django.utils import timezone
from ninja.security import HttpBearer

from apps.merchants.models import RefreshToken


class InvalidTokenError(Exception):
    pass


def _encode_part(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode_part(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _encode(payload: dict[str, Any]) -> str:
    header = _encode_part(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = _encode_part(json.dumps(payload, separators=(",", ":")).encode())
    unsigned = f"{header}.{body}"
    signature = hmac.new(settings.JWT_SIGNING_KEY.encode(), unsigned.encode(), hashlib.sha256).digest()
    return f"{unsigned}.{_encode_part(signature)}"


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    try:
        header, body, supplied_signature = token.split(".")
        token_header = json.loads(_decode_part(header))
        if token_header.get("alg") != "HS256" or token_header.get("typ") != "JWT":
            raise InvalidTokenError("Unsupported token header")
        unsigned = f"{header}.{body}"
        expected_signature = hmac.new(
            settings.JWT_SIGNING_KEY.encode(), unsigned.encode(), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(_decode_part(supplied_signature), expected_signature):
            raise InvalidTokenError("Invalid token signature")
        payload = json.loads(_decode_part(body))
        now = int(datetime.now(UTC).timestamp())
        if payload.get("exp", 0) <= now:
            raise InvalidTokenError("Token has expired")
        if payload.get("iss") != settings.JWT_ISSUER or payload.get("aud") != settings.JWT_AUDIENCE:
            raise InvalidTokenError("Invalid token issuer or audience")
        if payload.get("type") != expected_type:
            raise InvalidTokenError("Invalid token type")
        return payload
    except InvalidTokenError:
        raise
    except (ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
        raise InvalidTokenError("Malformed token") from error


def _claims(user: AbstractBaseUser, token_type: str, lifetime: timedelta, jti: uuid.UUID) -> dict[str, Any]:
    now = datetime.now(UTC)
    return {
        "sub": str(user.pk), "type": token_type, "jti": str(jti),
        "iat": int(now.timestamp()), "exp": int((now + lifetime).timestamp()),
        "iss": settings.JWT_ISSUER, "aud": settings.JWT_AUDIENCE,
    }


def issue_token_pair(user: AbstractBaseUser) -> dict[str, Any]:
    access_lifetime = timedelta(minutes=settings.JWT_ACCESS_TOKEN_MINUTES)
    refresh_lifetime = timedelta(days=settings.JWT_REFRESH_TOKEN_DAYS)
    access = _encode(_claims(user, "access", access_lifetime, uuid.uuid4()))
    refresh_jti = uuid.uuid4()
    refresh = _encode(_claims(user, "refresh", refresh_lifetime, refresh_jti))
    RefreshToken.objects.create(
        user=user, jti=refresh_jti, token_hash=hashlib.sha256(refresh.encode()).hexdigest(),
        expires_at=timezone.now() + refresh_lifetime,
    )
    return {"access_token": access, "refresh_token": refresh, "token_type": "Bearer", "expires_in": int(access_lifetime.total_seconds())}


@transaction.atomic
def rotate_refresh_token(token: str) -> dict[str, Any]:
    payload = decode_token(token, "refresh")
    try:
        stored = RefreshToken.objects.select_for_update().select_related("user").get(jti=payload["jti"])
    except RefreshToken.DoesNotExist as error:
        raise InvalidTokenError("Refresh token is not recognized") from error
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    if stored.revoked_at or stored.expires_at <= timezone.now() or not hmac.compare_digest(stored.token_hash, token_hash):
        raise InvalidTokenError("Refresh token is no longer valid")
    stored.revoked_at = timezone.now()
    stored.save(update_fields=["revoked_at"])
    if not stored.user.is_active:
        raise InvalidTokenError("User is inactive")
    return issue_token_pair(stored.user)


def revoke_refresh_token(token: str) -> None:
    payload = decode_token(token, "refresh")
    RefreshToken.objects.filter(jti=payload["jti"], revoked_at__isnull=True).update(revoked_at=timezone.now())


class JwtBearer(HttpBearer):
    def authenticate(self, request: Any, token: str) -> Any:
        try:
            payload = decode_token(token, "access")
            user = get_user_model().objects.get(pk=payload["sub"], is_active=True)
        except (InvalidTokenError, get_user_model().DoesNotExist, ValueError):
            return None
        request.user = user
        return user


jwt_auth = JwtBearer()
