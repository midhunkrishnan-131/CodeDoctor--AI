"""
Diagnosis Service for CodeDoctor AI
Orchestrates Mode A vs Mode B prompts, Groq API call, response parsing, and database persistence.
"""
from backend.ai.prompts import (
    COMPLETE_ANSWER_SYSTEM_PROMPT,
    LOGIC_SUGGESTION_SYSTEM_PROMPT,
    build_user_prompt
)
from backend.ai.groq_client import call_groq_api, DEFAULT_GROQ_MODEL
from backend.ai.response_handler import parse_diagnosis_response
from backend.database.db import save_record

def perform_diagnosis(
    problem_description: str,
    source_code: str,
    execution_output: str = "",
    error_messages: str = "",
    selected_ai_mode: str = "complete_answer",
    api_key: str = None,
    model: str = None,
    exit_code: int = 0,
    execution_time_ms: float = 0.0
) -> dict:
    # 1. Select appropriate system prompt according to mode
    is_logic_mode = "logic" in selected_ai_mode.lower()
    system_prompt = LOGIC_SUGGESTION_SYSTEM_PROMPT if is_logic_mode else COMPLETE_ANSWER_SYSTEM_PROMPT
    
    # 2. Build detailed user context prompt
    user_prompt = build_user_prompt(
        problem_description=problem_description,
        source_code=source_code,
        stdout=execution_output,
        stderr=error_messages,
        exit_code=exit_code,
        execution_time_ms=execution_time_ms
    )
    
    # 3. Call Groq API
    ai_result = call_groq_api(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        api_key=api_key,
        model=model or DEFAULT_GROQ_MODEL
    )
    
    # 4. Parse & structure response
    parsed = parse_diagnosis_response(ai_result["content"], selected_ai_mode)
    
    # 5. Persist to SQLite database
    saved_item = save_record(
        problem_description=problem_description,
        source_code=source_code,
        diagnosis_mode=selected_ai_mode,
        stdout=execution_output,
        stderr=error_messages,
        exit_code=exit_code,
        execution_time_ms=execution_time_ms,
        ai_diagnosis=ai_result["content"],
        model_name=ai_result["model"],
        provider=ai_result["provider"]
    )
    
    return {
        "diagnosis": ai_result["content"],
        "mode": selected_ai_mode,
        "model": ai_result["model"],
        "provider": ai_result["provider"],
        "extracted_code": parsed.get("extracted_code"),
        "history_id": saved_item["id"],
        "sections": parsed.get("sections")
    }
