"""
Base Agent class for Terra Construction Co-Pilot
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Abstract base class for all Terra Co-Pilot agents"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.logger = logging.getLogger(f"agent.{name}")
    
    @abstractmethod
    async def process(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process a request and return response"""
        pass
    
    @abstractmethod
    def get_tools(self) -> List[Dict[str, Any]]:
        """Return list of tools this agent can use"""
        pass
    
    def log(self, message: str, **kwargs):
        """Log agent activity"""
        extra_info = " ".join(f"{k}={v}" for k, v in kwargs.items())
        self.logger.info(f"{message} {extra_info}" if extra_info else message)
