"""
CodeDoctor AI - FastAPI Main Application
Entry point for the Python backend.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

# Mount API routes
app.include_router(router)

from fastapi.responses import RedirectResponse

# Mount vanilla HTML, CSS, and JS frontend
vanilla_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "html-css-js")
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
