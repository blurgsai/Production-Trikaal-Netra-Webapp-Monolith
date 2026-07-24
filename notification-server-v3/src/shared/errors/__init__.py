from fastapi import HTTPException


class NotFoundError(HTTPException):
    def __init__(self, resource: str, resource_id: int | str):
        super().__init__(
            status_code=404,
            detail=f"{resource} '{resource_id}' not found",
        )


class ConflictError(HTTPException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            status_code=409,
            detail=f"{resource} '{identifier}' already exists",
        )


class ValidationError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=422, detail=detail)


class ExternalServiceError(HTTPException):
    def __init__(self, service: str, detail: str):
        super().__init__(
            status_code=502,
            detail=f"'{service}' error: {detail}",
        )


class UnauthorizedError(HTTPException):
    def __init__(self, detail: str = "Invalid or missing API key"):
        super().__init__(status_code=401, detail=detail)
