"""
Route Advisor Agent - Optimized routing and cycle time predictions
Uses ML models for intelligent route recommendations
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


class RouteAdvisorAgent(BaseAgent):
    """
    Provides route optimization and cycle time predictions.
    
    Capabilities:
    - Optimal route recommendations based on current traffic
    - Cycle time predictions using ML model
    - Choke point avoidance strategies
    - Loading/unloading timing optimization
    """
    
    def __init__(self):
        super().__init__(
            name="RouteAdvisor",
            description="Route optimization and cycle time predictions"
        )
        self.sf = get_snowflake_service()
    
    async def process(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate route recommendations based on context.
        
        Args:
            context: Dict containing:
                - site_id: Current site
                - origin: Starting location (load or dump site)
                - destination: Target location
                - equipment_id: Optional specific equipment
                - current_conditions: Traffic, weather, etc.
            
        Returns:
            Dict with recommendations and predicted cycle times
        """
        site_id = context.get("site_id", "ALPHA")
        origin = context.get("origin", "")
        destination = context.get("destination", "")
        question = context.get("question", "")
        
        self.log("Generating route recommendation", site_id=site_id)
        
        # Get current choke point predictions
        choke_points = await self._get_predicted_choke_points(site_id)
        
        # Get optimal parameters by time of day
        optimal_params = await self._get_optimal_parameters()
        
        # Get historical cycle time data
        cycle_analysis = await self._analyze_cycle_times(site_id)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            choke_points,
            optimal_params,
            cycle_analysis,
            context
        )
        
        # Generate reasoning
        reasoning = self._generate_reasoning(
            choke_points,
            cycle_analysis,
            question
        )
        
        return {
            "recommendations": recommendations,
            "choke_points": choke_points,
            "cycle_analysis": cycle_analysis,
            "reasoning": reasoning,
            "predicted_cycle_time": self._predict_cycle_time(context, choke_points)
        }
    
    async def _get_predicted_choke_points(self, site_id: str) -> List[Dict]:
        """Get ML-predicted choke points from the model"""
        sql = f"""
        SELECT 
            ZONE_NAME, ZONE_LAT, ZONE_LNG,
            CHOKE_PROBABILITY, PREDICTED_SEVERITY,
            PREDICTED_WAIT_TIME_MIN, RECOMMENDED_ACTION
        FROM CONSTRUCTION_GEO_DB.ML.CHOKE_POINT_PREDICTIONS
        WHERE SITE_ID = '{site_id}'
          AND CHOKE_PROBABILITY > 0.5
          AND PREDICTED_ONSET_TIME BETWEEN CURRENT_TIMESTAMP() AND DATEADD(minute, 30, CURRENT_TIMESTAMP())
        ORDER BY CHOKE_PROBABILITY DESC
        LIMIT 5
        """
        try:
            return self.sf.execute_query(sql)
        except Exception:
            return []
    
    async def _get_optimal_parameters(self) -> Dict:
        """Get optimal cycle parameters from ML analysis"""
        sql = """
        SELECT HOUR_OF_DAY, OPTIMAL_VOLUME, OPTIMAL_DISTANCE, ACHIEVED_CYCLE_TIME
        FROM CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.OPTIMAL_CYCLE_PARAMS
        ORDER BY HOUR_OF_DAY
        """
        try:
            results = self.sf.execute_query(sql)
            return {"by_hour": results}
        except Exception:
            return {"by_hour": []}
    
    async def _analyze_cycle_times(self, site_id: str) -> Dict:
        """Analyze historical cycle times"""
        sql = f"""
        SELECT 
            ROUND(AVG(CYCLE_TIME_MINUTES), 1) as avg_cycle_time,
            ROUND(MIN(CYCLE_TIME_MINUTES), 1) as min_cycle_time,
            ROUND(MAX(CYCLE_TIME_MINUTES), 1) as max_cycle_time,
            COUNT(*) as total_cycles,
            ROUND(SUM(LOAD_VOLUME_YD3), 0) as total_volume
        FROM CONSTRUCTION_GEO_DB.RAW.CYCLE_EVENTS
        WHERE SITE_ID = '{site_id}'
          AND CYCLE_TIME_MINUTES BETWEEN 5 AND 60
        """
        try:
            results = self.sf.execute_query(sql)
            return results[0] if results else {}
        except Exception:
            return {}
    
    def _generate_recommendations(
        self,
        choke_points: List[Dict],
        optimal_params: Dict,
        cycle_analysis: Dict,
        context: Dict
    ) -> List[Dict]:
        """Generate route recommendations"""
        recommendations = []
        
        # Route recommendations based on choke points
        if choke_points:
            for cp in choke_points[:2]:
                recommendations.append({
                    "type": "ROUTE_DIVERSION",
                    "priority": "HIGH" if cp.get("CHOKE_PROBABILITY", 0) > 0.7 else "MEDIUM",
                    "zone": cp.get("ZONE_NAME"),
                    "message": f"Avoid {cp.get('ZONE_NAME')} - {int(cp.get('CHOKE_PROBABILITY', 0) * 100)}% choke probability",
                    "action": cp.get("RECOMMENDED_ACTION", "Use alternate route"),
                    "time_savings": f"{cp.get('PREDICTED_WAIT_TIME_MIN', 0):.0f} min"
                })
        
        # Timing recommendations from optimal parameters
        current_hour = context.get("current_hour", 10)
        optimal_by_hour = optimal_params.get("by_hour", [])
        
        best_hour = None
        best_time = float('inf')
        for hour_data in optimal_by_hour:
            if hour_data.get("ACHIEVED_CYCLE_TIME", 999) < best_time:
                best_time = hour_data.get("ACHIEVED_CYCLE_TIME", 999)
                best_hour = hour_data.get("HOUR_OF_DAY")
        
        if best_hour and best_hour != current_hour:
            recommendations.append({
                "type": "TIMING_OPTIMIZATION",
                "priority": "MEDIUM",
                "message": f"Optimal dispatch time is {best_hour}:00 (avg {best_time:.1f} min cycles)",
                "current_expected": cycle_analysis.get("avg_cycle_time", "N/A"),
                "potential_improvement": f"{(cycle_analysis.get('avg_cycle_time', best_time) - best_time):.1f} min/cycle"
            })
        
        # Volume optimization
        if cycle_analysis.get("avg_cycle_time"):
            recommendations.append({
                "type": "PERFORMANCE_INSIGHT",
                "priority": "INFO",
                "message": f"Site average: {cycle_analysis.get('avg_cycle_time'):.1f} min/cycle, {cycle_analysis.get('total_cycles', 0)} cycles completed"
            })
        
        return recommendations
    
    def _generate_reasoning(
        self,
        choke_points: List[Dict],
        cycle_analysis: Dict,
        question: str
    ) -> str:
        """Generate natural language reasoning"""
        parts = []
        
        if choke_points:
            parts.append(
                f"🚧 **Traffic Alert**: {len(choke_points)} potential choke point(s) predicted in the next 30 minutes. "
                f"The highest probability is at {choke_points[0].get('ZONE_NAME')} "
                f"({int(choke_points[0].get('CHOKE_PROBABILITY', 0) * 100)}% confidence)."
            )
        
        if cycle_analysis.get("avg_cycle_time"):
            parts.append(
                f"📊 **Historical Performance**: Average cycle time is {cycle_analysis.get('avg_cycle_time'):.1f} minutes "
                f"(range: {cycle_analysis.get('min_cycle_time'):.1f} - {cycle_analysis.get('max_cycle_time'):.1f} min)."
            )
        
        if not parts:
            parts.append(
                "No significant traffic issues predicted. Routes are operating normally."
            )
        
        return " ".join(parts)
    
    def _predict_cycle_time(self, context: Dict, choke_points: List[Dict]) -> Dict:
        """Predict cycle time based on current conditions"""
        base_time = 22.0  # Default average
        
        # Add delay for choke points on route
        choke_delay = sum(cp.get("PREDICTED_WAIT_TIME_MIN", 0) for cp in choke_points)
        
        # Adjust for time of day (peak hours add 15%)
        current_hour = context.get("current_hour", 10)
        if current_hour in [7, 8, 9, 13, 14]:
            base_time *= 1.15
        
        predicted = base_time + choke_delay
        
        return {
            "predicted_minutes": round(predicted, 1),
            "base_time": base_time,
            "choke_delay": choke_delay,
            "confidence": 0.85 if not choke_points else 0.70
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "predict_cycle_time",
                "description": "Predict cycle time for a given route"
            },
            {
                "name": "get_route_alternatives",
                "description": "Get alternative routes avoiding choke points"
            },
            {
                "name": "get_optimal_timing",
                "description": "Get optimal dispatch timing based on historical data"
            },
            {
                "name": "analyze_equipment_efficiency",
                "description": "Analyze efficiency metrics for specific equipment"
            }
        ]
