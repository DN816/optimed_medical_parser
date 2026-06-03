import secrets
import json
import logging
from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Optimed API"
    
    # SECURITY
    SECRET_KEY: str = secrets.token_urlsafe(64)  # Auto-generated if not set in .env
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 1 day
    
    # DATABASE
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost/optimed"
    
    # BACKEND CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
             # Pydantic-settings handles JSON strings automatically usually, but if we get a raw string looking like a list:
            if isinstance(v, str) and v.startswith("["):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    return []
            return v
        raise ValueError(v)

    # GOOGLE GEMINI
    GOOGLE_API_KEY: str = ""  # Optional — OCR features will fail gracefully if not set
    
    # UPLOAD LIMITS
    MAX_UPLOAD_SIZE_MB: int = 10  # Maximum file size in MB
    
    # LOGGING
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra='ignore'
    )

settings = Settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
