from shared.errors import (
    ConflictError,
    ExternalServiceError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
)


class TestNotFoundError:
    def test_status_code_and_detail_string(self):
        exc = NotFoundError("TopicConfig", "alerts")
        assert exc.status_code == 404
        assert exc.detail == "TopicConfig 'alerts' not found"

    def test_status_code_and_detail_int(self):
        exc = NotFoundError("User", 42)
        assert exc.status_code == 404
        assert exc.detail == "User '42' not found"


class TestConflictError:
    def test_status_code_and_detail(self):
        exc = ConflictError("TopicConfig", "alerts")
        assert exc.status_code == 409
        assert exc.detail == "TopicConfig 'alerts' already exists"


class TestValidationError:
    def test_status_code_and_detail(self):
        exc = ValidationError("Either usernames or group_id must be provided")
        assert exc.status_code == 422
        assert exc.detail == "Either usernames or group_id must be provided"


class TestExternalServiceError:
    def test_status_code_and_detail(self):
        exc = ExternalServiceError("SMTP", "connection refused")
        assert exc.status_code == 502
        assert exc.detail == "'SMTP' error: connection refused"


class TestUnauthorizedError:
    def test_default_detail(self):
        exc = UnauthorizedError()
        assert exc.status_code == 401
        assert exc.detail == "Invalid or missing API key"

    def test_custom_detail(self):
        exc = UnauthorizedError("go away")
        assert exc.status_code == 401
        assert exc.detail == "go away"
