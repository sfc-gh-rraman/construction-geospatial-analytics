# Use SPCS-compatible service that auto-detects environment
# Falls back to CLI for local development
from .snowflake_service_spcs import SnowflakeServiceSPCS as SnowflakeService, get_snowflake_service

__all__ = ["SnowflakeService", "get_snowflake_service"]
