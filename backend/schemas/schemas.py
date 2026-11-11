from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ExecuteRequest(BaseModel):
    source_code: str = Field(..., description="Python source code to execute")
    programming_language: str = Field("python", description="Target language (default: python)")
    timeout: Optional[float] = Field(5.0, description="Execution timeout in seconds")
    stdin_input: Optional[str] = Field("", description="Standard input for execution")

class SyntaxErrorDetail(BaseModel):
    type: str
    message: str
    line: Optional[int] = None
    offset: Optional[int] = None
    text: Optional[str] = None

class ExecuteResponse(BaseModel):
    stdout: str
    stderr: str
    execution_status: str
    exit_code: int
    execution_time_ms: float
    timed_out: bool = False
    error_type: Optional[str] = None
    syntax_valid: bool = True
    syntax_error: Optional[SyntaxErrorDetail] = None

class DiagnoseRequest(BaseModel):
    problem_description: str = Field("", description="User entered programming task or question")
    source_code: str = Field(..., description="Python code to analyze")
    execution_output: Optional[str] = Field("", description="Stdout from test run")
    error_messages: Optional[str] = Field("", description="Stderr or exception trace")
    selected_ai_mode: str = Field("complete_answer", description="'complete_answer' or 'logic_suggestion'")
    api_key: Optional[str] = Field(None, description="Optional custom Groq API key")
    model: Optional[str] = Field(None, description="Optional custom model name")
    exit_code: Optional[int] = 0
    execution_time_ms: Optional[float] = 0.0

class DiagnoseResponse(BaseModel):
    diagnosis: str
    mode: str
    model: str
    provider: str
    extracted_code: Optional[str] = None
    history_id: Optional[str] = None
    sections: Optional[List[Dict[str, Any]]] = None

class HistoryItem(BaseModel):
    id: str
    problem_description: str
    source_code: str
    diagnosis_mode: str
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: float
    ai_diagnosis: str
    model_name: str
    provider: str
    created_at: str
