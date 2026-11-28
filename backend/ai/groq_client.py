"""
CodeDoctor AI - Groq AI Client & Fallback Engine
Integrates with Groq API (OpenAI-compatible) and supports Gemini fallback.
"""
import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional
from backend.config import settings

DEFAULT_GROQ_MODEL = settings.GROQ_MODEL or os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

AVAILABLE_MODELS = [
    {"id": "openai/gpt-oss-120b", "name": "GPT OSS 120B", "provider": "Groq", "description": "Recommended: High capability reasoning & debugging"},
    {"id": "openai/gpt-oss-20b", "name": "GPT OSS 20B", "provider": "Groq", "description": "Fast response for instant logic hints"},
    {"id": "qwen/qwen3.8-27b", "name": "Qwen 3.8 27B", "provider": "Groq", "description": "Compact code analysis model"},
    {"id": "gemini-3.8-flash", "name": "Gemini 3.8 Flash", "provider": "Gemini", "description": "Built-in AI Studio fallback"}
]

class GroqClientError(Exception):
    def __init__(self, message: str, status_code: int = 500, error_code: str = "groq_error"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code

def call_groq_api(
    system_prompt: str,
    user_prompt: str,
    api_key: Optional[str] = None,
    model: str = DEFAULT_GROQ_MODEL,
    temperature: float = 0.3,
    max_tokens: int = 2500
) -> Dict[str, Any]:
    key = (api_key or settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")).strip()
    
    if not key:
        # Check if GEMINI_API_KEY is available as built-in fallback
        gemini_key = (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")).strip()
        if gemini_key and gemini_key != "MY_GEMINI_API_KEY":
            return call_gemini_api(system_prompt, user_prompt, gemini_key)
        raise GroqClientError(
            "GROQ_API_KEY is not configured. Please enter your Groq API key in Settings or in the .env file.",
            status_code=401,
            error_code="missing_api_key"
        )
        
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    # Ensure model is valid or fallback to default
    chosen_model = model or DEFAULT_GROQ_MODEL
    
    payload = {
        "model": chosen_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    req = urllib.request.Request(
        GROQ_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            choices = data.get("choices", [])
            if not choices or "message" not in choices[0]:
                raise GroqClientError("Received empty response choices from Groq API.", 502, "empty_response")
            
            content = choices[0]["message"]["content"]
            usage = data.get("usage", {})
            return {
                "content": content,
                "model": data.get("model", chosen_model),
                "provider": "Groq",
                "usage": usage
            }
            
    except urllib.error.HTTPError as e:
        status = e.code
        err_msg = ""
        try:
            err_json = json.loads(e.read().decode("utf-8"))
            err_msg = err_json.get("error", {}).get("message", str(e))
        except Exception:
            err_msg = str(e)
            
        # Automatic fallback to openai/gpt-oss-20b if requested model is unavailable or hit OTPM rate limit
        if (status == 404 or (status == 429 and "OTPM" in err_msg)) and chosen_model != "openai/gpt-oss-20b":
            return call_groq_api(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                api_key=key,
                model="openai/gpt-oss-20b",
                temperature=temperature,
                max_tokens=max_tokens
            )
            
        if status == 401:
            raise GroqClientError(f"Invalid Groq API Key: {err_msg}", 401, "invalid_api_key")
        elif status == 429:
            raise GroqClientError(f"Groq Rate Limit Exceeded: {err_msg}. Please wait a moment or switch model.", 429, "rate_limited")
        elif status == 400:
            raise GroqClientError(f"Groq Bad Request: {err_msg}", 400, "bad_request")
        else:
            raise GroqClientError(f"Groq API Error ({status}): {err_msg}", status, "api_error")
            
    except urllib.error.URLError as e:
        raise GroqClientError(f"Network error connecting to Groq: {str(e.reason)}", 503, "network_error")
    except Exception as e:
        if isinstance(e, GroqClientError):
            raise
        raise GroqClientError(f"Unexpected error calling Groq: {str(e)}", 500, "internal_error")

def call_gemini_api(
    system_prompt: str,
    user_prompt: str,
    api_key: str,
    model: str = "gemini-3.8-flash"
) -> Dict[str, Any]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 2500
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if not candidates:
                raise GroqClientError("Gemini fallback returned no candidates.", 502, "empty_response")
            
            content_parts = candidates[0].get("content", {}).get("parts", [])
            text = "".join([p.get("text", "") for p in content_parts])
            return {
                "content": text,
                "model": model,
                "provider": "Gemini (Fallback)",
                "usage": data.get("usageMetadata", {})
            }
    except Exception as e:
        raise GroqClientError(f"AI Provider Error: {str(e)}", 500, "fallback_error")
