"""
Execution Service for CodeDoctor AI
"""
from backend.execution.runner import execute_python_code

def run_code(
    source_code: str,
    timeout: float = 5.0,
    stdin_input: str = "",
    filename: str = "solution.py",
    files: dict = None
) -> dict:
    raw_res = execute_python_code(
        code=source_code,
        timeout=timeout,
        stdin_input=stdin_input,
        filename=filename,
        files=files or {}
    )
    
    # Map to standardized response
    status = "success" if raw_res["success"] else ("timeout" if raw_res["timed_out"] else "error")
    
    return {
        "stdout": raw_res["stdout"],
        "stderr": raw_res["stderr"],
        "execution_status": status,
        "exit_code": raw_res["exit_code"],
        "execution_time_ms": raw_res["execution_time_ms"],
        "timed_out": raw_res["timed_out"],
        "error_type": raw_res["error_type"],
        "syntax_valid": raw_res["syntax_valid"],
        "syntax_error": raw_res["syntax_error"]
    }
