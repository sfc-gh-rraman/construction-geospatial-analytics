"""
Configuration settings for GroundTruth Construction Co-Pilot
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment"""
    
    # Application
    app_name: str = "GroundTruth Construction Co-Pilot"
    debug: bool = False
    
    # Snowflake
    snowflake_connection: str = "demo"
    snowflake_database: str = "CONSTRUCTION_GEO_DB"
    snowflake_schema: str = "CONSTRUCTION_GEO"
    snowflake_warehouse: Optional[str] = "COMPUTE_WH"
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Cortex
    cortex_model: str = "mistral-large2"
    
    # ML Models
    ghost_cycle_model: str = "GHOST_CYCLE_DETECTOR"
    cycle_time_model: str = "CYCLE_TIME_OPTIMIZER"
    choke_point_model: str = "CHOKE_POINT_PREDICTOR"
    
    class Config:
        env_file = ".env"
        env_prefix = "CONSTRUCTION_"


settings = Settings()
