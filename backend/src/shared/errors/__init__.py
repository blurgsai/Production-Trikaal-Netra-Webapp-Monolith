from fastapi import HTTPException, status


class ExternalServiceError(HTTPException):
    def __init__(self, service: str, detail: str):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"'{service}' error: {detail}",
        )


class NotFoundError(HTTPException):
    def __init__(self, resource: str, resource_id: int | str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} '{resource_id}' not found",
        )


class ValidationError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


class AuthenticationError(HTTPException):
    def __init__(self, detail: str = "Invalid username or password"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        )
