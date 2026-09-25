#importing env variables, converting them to their actual data tyle

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file = ".env",
       env_file_encoding = "utf-8",
       extra = "ignore",
       #the pydantic model is mutable u can by mistake re assing an env variable losing the enissial config that why we make it impossible here
       frozen=True,
    )
    #the values are only incase and env var is empty our BaseSettings class we inheret from fills these variables already from the env
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:3b"
    ollama_num_ctx: int = 4096
    ollama_num_predict: int = 200
    ollama_temperature: float = 0.3
    llm_timeout_seconds: int = 25
    max_context_logs: int = 20
    max_context_metrics: int = 10
    max_context_traces: int = 10

settings = Settings()


