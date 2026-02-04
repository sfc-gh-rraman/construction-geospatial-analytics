"""
Agent Orchestrator - Coordinates all agents for TERRA Co-Pilot
Uses intent classification to route to appropriate agents
"""

import re
from typing import Any, Dict, List, Optional
import logging
import sys
import os

# Handle both package and direct imports
try:
    from .historian import HistorianAgent
    from .route_advisor import RouteAdvisorAgent
    from .watchdog import WatchdogAgent
    from ..services import get_snowflake_service
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from agents.historian import HistorianAgent
    from agents.route_advisor import RouteAdvisorAgent
    from agents.watchdog import WatchdogAgent
    from services import get_snowflake_service

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Orchestrates multiple agents to handle user requests for construction operations.
    
    Flow:
    1. Classify intent from user message
    2. Route to appropriate agent(s)
    3. Aggregate responses
    4. Generate final response
    """
    
    def __init__(self):
        self.historian = HistorianAgent()
        self.route_advisor = RouteAdvisorAgent()
        self.watchdog = WatchdogAgent()
        self.sf = get_snowflake_service()
        self.logger = logging.getLogger("orchestrator")
        
        # Conversation context
        self.context = {
            "site_id": "ALPHA",
            "equipment_id": None,
            "current_hour": 10
        }
    
    async def process_message(
        self, 
        message: str,
        site_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a user message and return response.
        
        Args:
            message: User's natural language message
            site_id: Optional site context
            
        Returns:
            Dict with response, sources, and any context updates
        """
        self.logger.info(f"Processing message: {message[:100]}")
        
        # Update context if site provided
        if site_id:
            self.context["site_id"] = site_id
        
        # Classify intent
        intent = self._classify_intent(message)
        self.logger.info(f"Classified intent: {intent}")
        
        # Route to appropriate agent(s)
        response_parts = []
        sources = []
        context_data = {}
        
        if intent == "analytical":
            result = await self._handle_analytical(message)
            response_parts.append(result["response"])
            sources.extend(result.get("sources", []))
            context_data["query_results"] = result.get("data", {})
            
        elif intent in ["ghost_cycle", "fuel", "efficiency"]:
            result = await self._handle_ghost_cycle(message)
            response_parts.append(result["response"])
            sources.extend(result.get("sources", []))
            context_data["ghost_cycles"] = result.get("data", {})
            
        elif intent in ["route", "traffic", "choke", "congestion"]:
            result = await self._handle_routing(message)
            response_parts.append(result["response"])
            sources.extend(result.get("sources", []))
            context_data["route_recommendations"] = result.get("data", {})
            
        elif intent in ["search", "history", "safety", "document"]:
            result = await self._handle_search(message)
            response_parts.append(result["response"])
            sources.extend(result.get("sources", []))
            context_data["document_results"] = result.get("data", {})
            
        elif intent in ["status", "current", "monitor", "fleet"]:
            result = await self._handle_status(message)
            response_parts.append(result["response"])
            context_data["fleet_status"] = result.get("data", {})
            
        elif intent == "cycle_time":
            result = await self._handle_cycle_time(message)
            response_parts.append(result["response"])
            context_data["cycle_analysis"] = result.get("data", {})
            
        elif intent == "ml_explain":
            result = await self._handle_ml_explanation(message)
            response_parts.append(result["response"])
            sources.extend(result.get("sources", []))
            
        else:
            # General question - use multiple agents
            result = await self._handle_general(message)
            response_parts.append(result["response"])
            sources.extend(result.get("sources", []))
        
        return {
            "response": "\n\n".join(response_parts),
            "sources": sources,
            "context": context_data,
            "intent": intent
        }
    
    def _classify_intent(self, message: str) -> str:
        """Classify user intent from message"""
        message_lower = message.lower()
        
        # Ghost Cycle / Fuel patterns
        ghost_patterns = [
            r"ghost.?cycle",
            r"fuel.?waste",
            r"idle",
            r"inefficien",
            r"burning fuel",
            r"not working"
        ]
        for pattern in ghost_patterns:
            if re.search(pattern, message_lower):
                return "ghost_cycle"
        
        # Route / Traffic patterns
        route_patterns = [
            r"route",
            r"traffic",
            r"choke.?point",
            r"congestion",
            r"bottleneck",
            r"divert",
            r"alternate"
        ]
        for pattern in route_patterns:
            if re.search(pattern, message_lower):
                return "route"
        
        # Cycle time patterns
        cycle_patterns = [
            r"cycle.?time",
            r"how long",
            r"predict.*time",
            r"estimate.*time"
        ]
        for pattern in cycle_patterns:
            if re.search(pattern, message_lower):
                return "cycle_time"
        
        # ML explanation patterns
        ml_patterns = [
            r"why.*detect",
            r"explain.*model",
            r"feature.*import",
            r"shap",
            r"what.*predict"
        ]
        for pattern in ml_patterns:
            if re.search(pattern, message_lower):
                return "ml_explain"
        
        # Analytical patterns
        analytical_patterns = [
            r"how many",
            r"total",
            r"count",
            r"average",
            r"list",
            r"show me.*data",
            r"statistics"
        ]
        for pattern in analytical_patterns:
            if re.search(pattern, message_lower):
                return "analytical"
        
        # Search / History patterns
        search_patterns = [
            r"search",
            r"find",
            r"safety",
            r"geotechnical",
            r"document",
            r"procedure",
            r"history"
        ]
        for pattern in search_patterns:
            if re.search(pattern, message_lower):
                return "search"
        
        # Status patterns
        status_patterns = [
            r"status",
            r"current",
            r"right now",
            r"fleet",
            r"equipment"
        ]
        for pattern in status_patterns:
            if re.search(pattern, message_lower):
                return "status"
        
        return "general"
    
    async def _handle_ghost_cycle(self, message: str) -> Dict[str, Any]:
        """Handle Ghost Cycle related queries"""
        self.logger.info("Handling Ghost Cycle query")
        
        # Get current Ghost Cycle alerts
        result = await self.watchdog.process({
            "site_id": self.context["site_id"],
            "equipment_data": self.sf.get_equipment_telemetry(self.context["site_id"]),
            "zone_metrics": []
        })
        
        ghost_cycles = result.get("ghost_cycles", [])
        
        if ghost_cycles:
            response_parts = [f"👻 **Ghost Cycle Alert** - {len(ghost_cycles)} detected\n"]
            
            total_waste = 0
            for gc in ghost_cycles[:5]:
                waste = gc.get("fuel_rate_gph", 3) * 0.4
                total_waste += waste
                response_parts.append(
                    f"• **{gc.get('equipment_id')}**: {gc.get('speed_mph', 0):.1f} mph, "
                    f"{gc.get('engine_load_pct', 0):.0f}% load → ~{waste:.1f} gal/hr waste"
                )
            
            response_parts.append(f"\n💰 **Total estimated fuel waste**: {total_waste:.1f} gal/hr")
            response_parts.append("\n💡 **Recommendation**: Verify equipment is assigned productive work or reallocate")
            
            response = "\n".join(response_parts)
        else:
            response = "✅ No Ghost Cycles currently detected. All equipment appears to be operating productively."
        
        # Get feature importance for context
        feature_importance = await self.historian.get_ml_feature_importance("GHOST_CYCLE_DETECTOR")
        
        if feature_importance:
            response += "\n\n📊 **Key Detection Factors** (from ML model):\n"
            for feat in feature_importance[:3]:
                direction = "↑" if feat.get("FEATURE_DIRECTION") == "positive" else "↓"
                response += f"• {feat.get('FEATURE_NAME')}: {direction} importance\n"
        
        return {
            "response": response,
            "sources": ["GHOST_CYCLE_DETECTOR model", "Real-time telemetry"],
            "data": result
        }
    
    async def _handle_routing(self, message: str) -> Dict[str, Any]:
        """Handle routing and traffic queries"""
        self.logger.info("Handling routing query")
        
        result = await self.route_advisor.process({
            "site_id": self.context["site_id"],
            "question": message,
            "current_hour": self.context.get("current_hour", 10)
        })
        
        recommendations = result.get("recommendations", [])
        choke_points = result.get("choke_points", [])
        
        response_parts = ["🛣️ **Route Recommendations**\n"]
        
        if choke_points:
            response_parts.append(f"⚠️ **{len(choke_points)} Choke Point(s) Predicted**\n")
            for cp in choke_points[:3]:
                response_parts.append(
                    f"• **{cp.get('ZONE_NAME')}**: {int(cp.get('CHOKE_PROBABILITY', 0) * 100)}% probability, "
                    f"~{cp.get('PREDICTED_WAIT_TIME_MIN', 0):.0f} min delay"
                )
        
        if recommendations:
            response_parts.append("\n📋 **Recommendations**:\n")
            for rec in recommendations:
                priority_emoji = "🔴" if rec.get("priority") == "HIGH" else "🟡" if rec.get("priority") == "MEDIUM" else "ℹ️"
                response_parts.append(f"{priority_emoji} {rec.get('message')}")
        
        if result.get("reasoning"):
            response_parts.append(f"\n{result['reasoning']}")
        
        predicted = result.get("predicted_cycle_time", {})
        if predicted:
            response_parts.append(
                f"\n⏱️ **Predicted Cycle Time**: {predicted.get('predicted_minutes', 'N/A')} minutes "
                f"({int(predicted.get('confidence', 0) * 100)}% confidence)"
            )
        
        return {
            "response": "\n".join(response_parts),
            "sources": ["CHOKE_POINT_PREDICTOR model", "CYCLE_TIME_OPTIMIZER model"],
            "data": result
        }
    
    async def _handle_search(self, message: str) -> Dict[str, Any]:
        """Handle document search queries"""
        self.logger.info("Handling search query")
        
        result = await self.historian.process({
            "query": message,
            "site_id": self.context["site_id"]
        })
        
        doc_results = result.get("document_results", [])
        
        if doc_results:
            response_parts = [f"📚 Found {len(doc_results)} relevant documents:\n"]
            
            for i, doc in enumerate(doc_results[:3], 1):
                response_parts.append(
                    f"**{i}. {doc.get('title', 'Untitled')}** ({doc.get('document_type')})\n"
                    f"{doc.get('excerpt', '')[:200]}..."
                )
            
            response = "\n\n".join(response_parts)
        else:
            response = "No relevant documents found. Try rephrasing your search."
        
        return {
            "response": response,
            "sources": [d.get("title", "Document") for d in doc_results[:3]],
            "data": result
        }
    
    async def _handle_status(self, message: str) -> Dict[str, Any]:
        """Handle fleet status queries"""
        self.logger.info("Handling status query")
        
        site_id = self.context["site_id"]
        
        # Get fleet summary
        summary = self.sf.get_fleet_summary(site_id)
        
        response_parts = [f"📊 **Fleet Status - Site {site_id}**\n"]
        
        if summary:
            response_parts.append(f"• **Active Equipment**: {summary.get('active_count', 'N/A')}")
            response_parts.append(f"• **Cycles Today**: {summary.get('cycles_today', 'N/A')}")
            response_parts.append(f"• **Volume Moved**: {summary.get('volume_today', 'N/A')} yd³")
            response_parts.append(f"• **Avg Cycle Time**: {summary.get('avg_cycle_time', 'N/A')} min")
        else:
            response_parts.append("No status data available.")
        
        # Check for alerts
        watchdog_result = await self.watchdog.process({
            "site_id": site_id,
            "equipment_data": self.sf.get_equipment_telemetry(site_id),
            "zone_metrics": []
        })
        
        if watchdog_result.get("alerts"):
            response_parts.append(f"\n⚠️ **{len(watchdog_result['alerts'])} Active Alert(s)**")
            response_parts.append(watchdog_result.get("summary", ""))
        
        return {
            "response": "\n".join(response_parts),
            "data": {"summary": summary, "alerts": watchdog_result.get("alerts", [])}
        }
    
    async def _handle_cycle_time(self, message: str) -> Dict[str, Any]:
        """Handle cycle time prediction queries"""
        result = await self.route_advisor.process({
            "site_id": self.context["site_id"],
            "question": message,
            "current_hour": self.context.get("current_hour", 10)
        })
        
        cycle_analysis = result.get("cycle_analysis", {})
        predicted = result.get("predicted_cycle_time", {})
        
        response_parts = ["⏱️ **Cycle Time Analysis**\n"]
        
        if cycle_analysis:
            response_parts.append(f"• **Average**: {cycle_analysis.get('avg_cycle_time', 'N/A')} min")
            response_parts.append(f"• **Best**: {cycle_analysis.get('min_cycle_time', 'N/A')} min")
            response_parts.append(f"• **Worst**: {cycle_analysis.get('max_cycle_time', 'N/A')} min")
            response_parts.append(f"• **Total Cycles**: {cycle_analysis.get('total_cycles', 'N/A')}")
        
        if predicted:
            response_parts.append(f"\n🎯 **Predicted Next Cycle**: {predicted.get('predicted_minutes', 'N/A')} min")
            if predicted.get("choke_delay", 0) > 0:
                response_parts.append(f"   (includes {predicted.get('choke_delay'):.0f} min choke point delay)")
        
        return {
            "response": "\n".join(response_parts),
            "data": result
        }
    
    async def _handle_ml_explanation(self, message: str) -> Dict[str, Any]:
        """Handle ML model explanation queries"""
        self.logger.info("Handling ML explanation query")
        
        response_parts = ["🤖 **ML Model Explanations**\n"]
        
        # Determine which model to explain
        if "ghost" in message.lower() or "cycle" in message.lower():
            model_name = "GHOST_CYCLE_DETECTOR"
            model_desc = "Ghost Cycle Detection"
        elif "choke" in message.lower() or "traffic" in message.lower():
            model_name = "CHOKE_POINT_PREDICTOR"
            model_desc = "Choke Point Prediction"
        else:
            model_name = "CYCLE_TIME_OPTIMIZER"
            model_desc = "Cycle Time Optimization"
        
        response_parts.append(f"### {model_desc} Model\n")
        
        # Get feature importance
        features = await self.historian.get_ml_feature_importance(model_name)
        
        if features:
            response_parts.append("**Top Predictive Features (SHAP Analysis)**:")
            for feat in features[:5]:
                direction = "↑ increases risk" if feat.get("FEATURE_DIRECTION") == "positive" else "↓ decreases risk"
                response_parts.append(
                    f"• **{feat.get('FEATURE_NAME')}**: importance {feat.get('SHAP_IMPORTANCE', 0):.3f} ({direction})"
                )
        
        # Get model metrics
        metrics = await self.historian.get_model_metrics(model_name)
        
        if metrics:
            response_parts.append("\n**Model Performance**:")
            for metric, value in metrics.items():
                response_parts.append(f"• {metric}: {value:.4f}")
        
        return {
            "response": "\n".join(response_parts),
            "sources": [f"ML.GLOBAL_FEATURE_IMPORTANCE", f"ML.MODEL_METRICS"]
        }
    
    async def _handle_analytical(self, message: str) -> Dict[str, Any]:
        """Handle analytical queries"""
        result = self.sf.direct_sql_query(message)
        
        if result.get("results"):
            response_parts = ["📊 **Query Results**\n"]
            
            results = result["results"]
            if len(results) == 1 and len(results[0]) == 1:
                key, value = list(results[0].items())[0]
                response_parts.append(f"**{key.replace('_', ' ').title()}**: {value}")
            elif len(results) <= 10:
                headers = list(results[0].keys())
                response_parts.append("| " + " | ".join(h.replace('_', ' ').title() for h in headers) + " |")
                response_parts.append("|" + "|".join(["---"] * len(headers)) + "|")
                for row in results:
                    values = [str(row.get(h, '')) for h in headers]
                    response_parts.append("| " + " | ".join(values) + " |")
            
            return {
                "response": "\n".join(response_parts),
                "sources": ["CONSTRUCTION_GEO_DB"],
                "data": result
            }
        
        return {
            "response": "I couldn't process that query. Try asking about fleet status, cycle times, or equipment efficiency.",
            "sources": [],
            "data": {}
        }
    
    async def _handle_general(self, message: str) -> Dict[str, Any]:
        """Handle general questions"""
        response = """
🏗️ **Terra Construction Co-Pilot**

I can help you with:

• **Ghost Cycles**: "Show me Ghost Cycle alerts" or "Which equipment is wasting fuel?"
• **Traffic & Routes**: "Any choke points?" or "Best route to dump site?"
• **Cycle Times**: "What's the average cycle time?" or "Predict my next cycle"
• **Fleet Status**: "Current fleet status" or "How many trucks are active?"
• **Document Search**: "Find safety procedures" or "Search geotechnical reports"
• **ML Insights**: "Explain the Ghost Cycle model" or "What features predict choke points?"

What would you like to know?
"""
        return {"response": response, "sources": []}
    
    def update_context(self, **kwargs):
        """Update conversation context"""
        self.context.update(kwargs)


# Singleton orchestrator
_orchestrator: Optional[AgentOrchestrator] = None


def get_orchestrator() -> AgentOrchestrator:
    """Get or create orchestrator singleton"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AgentOrchestrator()
    return _orchestrator
