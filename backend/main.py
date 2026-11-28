"""
CodeDoctor AI - FastAPI Main Application
Entry point for the Python backend.
"""
import os
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from backend.routes.api import router
from backend.database.db import init_db

app = FastAPI(
    title="CodeDoctor AI Backend API",
    description="Python Code Execution & Dual-Mode AI Diagnosis Engine",
    version="1.0.0"
)

# CORS configuration for web IDE client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database
init_db()

# Disable caching for static assets during development
@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/vanilla"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


def _json_error(status_code: int, message: str, **extra):
    payload = {"error": message, "detail": message, **extra}
    return JSONResponse(status_code=status_code, content=payload)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        return JSONResponse(status_code=exc.status_code, content=detail)
    return _json_error(exc.status_code, str(detail))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    return _json_error(
        422,
        "Invalid request payload",
        validation_errors=exc.errors(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    return _json_error(500, f"Internal server error: {exc}")


# Mount API routes BEFORE static mounts so /api/* never falls through to HTML
app.include_router(router)

# Prefer html-css-js (canonical), fall back to vanilla/ if needed
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
vanilla_dir = os.path.join(_root, "html-css-js")
if not os.path.exists(vanilla_dir):
    vanilla_dir = os.path.join(_root, "vanilla")
if os.path.exists(vanilla_dir):
    app.mount("/vanilla", StaticFiles(directory=vanilla_dir, html=True), name="vanilla")

@app.get("/")
def root():
    if os.path.exists(vanilla_dir):
        return RedirectResponse(url="/vanilla/index.html")
    return {
        "message": "Welcome to CodeDoctor AI API",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
