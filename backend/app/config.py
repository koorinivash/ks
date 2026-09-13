from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "ks_finance"
    port: int = 8000
    cors_origins: str = "*"
    mongodb_min_pool_size: int = Field(default=1, ge=0)
    mongodb_max_pool_size: int = Field(default=20, ge=1)
    mongodb_server_selection_timeout_ms: int = Field(default=5000, ge=1000)
    mongodb_connect_timeout_ms: int = Field(default=5000, ge=1000)
    mongodb_socket_timeout_ms: int = Field(default=15000, ge=1000)
    mongodb_wait_queue_timeout_ms: int = Field(default=5000, ge=1000)
    mongodb_create_indexes_on_startup: bool = True

    @model_validator(mode="after")
    def validate_pool(self):
        if self.mongodb_min_pool_size > self.mongodb_max_pool_size:
            raise ValueError("MongoDB minimum pool size must not exceed maximum")
        return self

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
