import os
from dotenv import load_dotenv

# Load .env file from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

class Settings:
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
    EXECUTION_TIMEOUT: float = float(os.environ.get("EXECUTION_TIMEOUT", "5.0"))
    MAX_OUTPUT_CHARS: int = int(os.environ.get("MAX_OUTPUT_CHARS", "50000"))
    DATABASE_PATH: str = os.path.join(os.path.dirname(__file__), "database", "codedoctor.db")

settings = Settings()
