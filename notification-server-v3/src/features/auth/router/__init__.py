from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from shared.auth import authenticate, make_session_token
from shared.auth.dependencies import SESSION_COOKIE, get_current_admin

router = APIRouter(tags=["Auth"])
templates = Jinja2Templates(directory="templates")


@router.get("/admin/login", response_class=HTMLResponse)
async def login_page(request: Request, next: str = "/admin"):
    if get_current_admin(request):
        return RedirectResponse(url="/admin", status_code=303)
    return templates.TemplateResponse(
        request,
        "admin/login.html",
        {"next": next, "error": None},
    )


@router.post("/admin/login")
async def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    next: str = Form("/admin"),
):
    user = await authenticate(username, password)
    if user is None:
        return templates.TemplateResponse(
            request,
            "admin/login.html",
            {
                "next": next,
                "error": "Invalid username or password.",
            },
            status_code=401,
        )
    token = make_session_token(user["username"])
    safe_next = next if next.startswith("/admin") else "/admin"
    response = RedirectResponse(url=safe_next, status_code=303)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400,
    )
    return response


@router.post("/admin/logout")
async def logout(request: Request):
    response = RedirectResponse(url="/admin/login", status_code=303)
    response.delete_cookie(SESSION_COOKIE)
    return response
