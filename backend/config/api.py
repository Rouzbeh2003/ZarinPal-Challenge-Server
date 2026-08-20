from django.http import HttpRequest
from ninja import NinjaAPI
from ninja.errors import ValidationError

from apps.analytics.api.router import router
from apps.analytics.api.schemas import ErrorResponse

api = NinjaAPI(title="ZarinPal Merchant Analytics API", version="1.0.0")
api.add_router("", router)


def _error(
    request: HttpRequest, *, code: str, message: str, status: int, details: dict | None = None
):
    payload = ErrorResponse(
        code=code,
        message=message,
        details=details or {},
        request_id=getattr(request, "request_id", "unknown"),
    )
    return api.create_response(request, payload.model_dump(), status=status)


@api.exception_handler(PermissionError)
def permission_error(request: HttpRequest, error: PermissionError):
    return _error(request, code="merchant_access_denied", message=str(error), status=403)


@api.exception_handler(ValidationError)
def validation_error(request: HttpRequest, error: ValidationError):
    return _error(
        request,
        code="invalid_request",
        message="Request validation failed",
        status=422,
        details={"errors": error.errors},
    )


@api.exception_handler(FileNotFoundError)
def file_not_found(request: HttpRequest, error: FileNotFoundError):
    return _error(request, code="source_file_not_found", message=str(error), status=404)
