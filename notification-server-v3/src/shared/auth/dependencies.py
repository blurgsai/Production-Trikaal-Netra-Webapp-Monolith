from fastapi import Request
from fastapi.responses import RedirectResponse

from shared.auth import decode_session_token

SESSION_COOKIE = "admin_session"


def get_current_admin(request: Request) -> str | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    return decode_session_token(token)


class RequireAdmin:
    """
    FastAPI dependency that enforces admin login.
    Redirects unauthenticated requests to /admin/login.
    Raises directly (not via HTTPException) so the redirect
    works correctly in HTML page responses.
    """

    async def __call__(self, request: Request) -> str:
        username = get_current_admin(request)
        if username is None:
            from fastapi.responses import RedirectResponse
            next_url = str(request.url)
            raise _LoginRedirect(next_url)
        return username


class _LoginRedirect(Exception):
    def __init__(self, next_url: str) -> None:
        self.next_url = next_url


require_admin = RequireAdmin()
