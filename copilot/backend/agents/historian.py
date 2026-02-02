"""
Historian Agent - Institutional memory and knowledge retrieval
Uses Cortex Search to find relevant safety plans, geotechnical reports, and historical data
"""

from typing import Any, Dict, List
import sys
import os

# Handle both package and direct imports
try:
    from .base import BaseAgent
    from ..services import get_snowflake_service
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from agents.base import BaseAgent
    from services import get_snowflake_service


class HistorianAgent(BaseAgent):
    """
    Searches historical data including safety plans, geotechnical reports, and sensor data.
    
    Capabilities:
    - RAG search on safety plans and procedures
    - SQL queries on GPS and telematics data
    - Historical cycle time analysis
    - Incident and near-miss retrieval
    """
    
    def __init__(self):
        super().__init__(
            name="Historian",
            description="Institutional memory and knowledge retrieval for construction operations"
        )
        self.sf = get_snowflake_service()
    
    async def process(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Search historical data based on query.
        
        Args:
            context: Dict containing:
                - query: Search query string
                - site_id: Optional site filter
                - equipment_id: Optional equipment filter
                - date_range: Optional date filter
            
        Returns:
            Dict with search results and relevant excerpts
        """
        query = context.get("query", "")
        site_id = context.get("site_id")
        
        self.log("Processing search request", query=query)
        
        results = {
            "document_results": [],
            "cycle_analysis": [],
            "equipment_history": [],
            "summary": ""
        }
        
        # Search documents (safety plans, geotechnical reports)
        if query:
            doc_results = self.sf.search_documents(
                query=query,
                limit=5
            )
            results["document_results"] = self._format_document_results(doc_results)
        
        # Get cycle time analysis if querying about performance
        if any(word in query.lower() for word in ["cycle", "time", "efficiency", "performance"]):
            cycle_data = self.sf.get_cycle_analysis(site_id=site_id)
            results["cycle_analysis"] = cycle_data
        
        # Generate summary
        results["summary"] = self._generate_summary(results)
        
        return results
    
    def _format_document_results(self, raw_results: List[Dict]) -> List[Dict]:
        """Format document search results for display"""
        formatted = []
        for r in raw_results:
            formatted.append({
                "document_type": r.get("DOCUMENT_TYPE", "Unknown"),
                "title": r.get("TITLE", ""),
                "site_id": r.get("SITE_ID"),
                "excerpt": r.get("CONTENT", "")[:500] + "..." if len(r.get("CONTENT", "")) > 500 else r.get("CONTENT", ""),
                "relevance_score": r.get("@scores", {}).get("cosine_similarity", 0)
            })
        return formatted
    
    def _generate_summary(self, results: Dict) -> str:
        """Generate a natural language summary of findings"""
        doc_count = len(results.get("document_results", []))
        cycle_count = len(results.get("cycle_analysis", []))
        
        summary_parts = []
        
        if doc_count > 0:
            summary_parts.append(f"Found {doc_count} relevant documents")
        
        if cycle_count > 0:
            summary_parts.append(f"Analyzed {cycle_count} cycle records")
        
        return ". ".join(summary_parts) if summary_parts else "No relevant historical data found."
    
    async def get_ml_feature_importance(self, model_name: str) -> List[Dict]:
        """Get SHAP feature importance for a model"""
        sql = f"""
        SELECT FEATURE_NAME, SHAP_IMPORTANCE, IMPORTANCE_RANK, FEATURE_DIRECTION
        FROM CONSTRUCTION_GEO_DB.ML.GLOBAL_FEATURE_IMPORTANCE
        WHERE MODEL_NAME = '{model_name}'
        ORDER BY IMPORTANCE_RANK
        LIMIT 10
        """
        return self.sf.execute_query(sql)
    
    async def get_model_metrics(self, model_name: str) -> Dict:
        """Get model performance metrics"""
        sql = f"""
        SELECT METRIC_NAME, METRIC_VALUE
        FROM CONSTRUCTION_GEO_DB.ML.MODEL_METRICS
        WHERE MODEL_NAME = '{model_name}'
        """
        results = self.sf.execute_query(sql)
        return {r["METRIC_NAME"]: r["METRIC_VALUE"] for r in results}
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "search_documents",
                "description": "Search safety plans and geotechnical reports using natural language"
            },
            {
                "name": "get_cycle_analysis",
                "description": "Get historical cycle time analysis for a site"
            },
            {
                "name": "get_equipment_history",
                "description": "Get historical data for specific equipment"
            },
            {
                "name": "get_ml_explanations",
                "description": "Get ML model feature importance and explanations"
            }
        ]
