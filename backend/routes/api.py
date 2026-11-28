"""
FastAPI Routes for CodeDoctor AI
Endpoints:
- GET  /api/health
- POST /api/execute
- POST /api/diagnose
- GET  /api/history
- DELETE /api/history/{id}
- GET  /api/models
"""
from fastapi import APIRouter, HTTPException, Depends
from backend.schemas.schemas import (
    ExecuteRequest,
    ExecuteResponse,
    DiagnoseRequest,
    DiagnoseResponse
)
from backend.services.execution_service import run_code
from backend.services.diagnosis_service import perform_diagnosis
from backend.database.db import get_all_records, delete_record_by_id, get_record_by_id
from backend.ai.groq_client import AVAILABLE_MODELS, GroqClientError

router = APIRouter(prefix="/api")

@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "CodeDoctor AI Backend",
        "engine": "Python Subprocess Sandbox",
        "supported_languages": ["python"],
        "database": "SQLite"
    }

@router.get("/models")
def get_models():
    return {
        "models": AVAILABLE_MODELS,
        "default": "openai/gpt-oss-120b"
    }

@router.post("/execute", response_model=ExecuteResponse)
def execute_code_endpoint(req: ExecuteRequest):
    try:
        return run_code(
            source_code=req.source_code,
            timeout=req.timeout or 5.0,
            stdin_input=req.stdin_input or "",
            filename=req.filename or "solution.py",
            files=req.files or {}
        )
    except Exception as e:
        # Always return structured JSON for sandbox failures (never HTML)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Sandbox execution failed",
                "message": str(e),
                "stdout": "",
                "stderr": f"Sandbox failure: {e}",
                "execution_status": "error",
                "exit_code": -1,
                "timed_out": False,
            },
        )

@router.post("/diagnose", response_model=DiagnoseResponse)
def diagnose_endpoint(req: DiagnoseRequest):
    try:
        res = perform_diagnosis(
            problem_description=req.problem_description,
            source_code=req.source_code,
            execution_output=req.execution_output or "",
            error_messages=req.error_messages or "",
            selected_ai_mode=req.selected_ai_mode,
            api_key=req.api_key,
            model=req.model,
            exit_code=req.exit_code or 0,
            execution_time_ms=req.execution_time_ms or 0.0
        )
        return res
    except GroqClientError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diagnosis failed: {str(e)}")

@router.get("/history")
def get_history_endpoint():
    return get_all_records(limit=50)

@router.get("/history/{record_id}")
def get_history_item_endpoint(record_id: str):
    rec = get_record_by_id(record_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Diagnosis record not found")
    return rec

@router.delete("/history/{record_id}")
def delete_history_endpoint(record_id: str):
    success = delete_record_by_id(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Diagnosis record not found")
    return {"success": True, "message": "Record deleted successfully"}
