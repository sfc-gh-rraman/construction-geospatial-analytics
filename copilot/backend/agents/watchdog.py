"""
Watchdog Agent - Real-time monitoring for Ghost Cycles and Choke Points
Uses registered ML models from Snowflake ML Registry for inference
"""

from typing import Any, Dict, List, Optional
import logging
from .base import BaseAgent

logger = logging.getLogger(__name__)


class WatchdogAgent(BaseAgent):
    """
    Monitors real-time fleet telemetry using ML models for anomaly detection.
    
    ML Models Used:
    - GHOST_CYCLE_DETECTOR (XGBoost): Classifies ghost cycles from GPS + telematics
    - CHOKE_POINT_PREDICTOR (Random Forest): Predicts traffic bottlenecks
    
    The agent queries ML predictions stored in ML schema tables, which are
    populated by real-time inference pipelines or batch scoring jobs.
    """
    
    def __init__(self):
        super().__init__(
            name="Watchdog",
            description="Real-time monitoring using ML models for Ghost Cycles and Choke Points"
        )
        # Default thresholds - can be overridden by profit curve optimization
        self.default_thresholds = {
            "ghost_cycle_probability": 0.50,  # Optimal from profit curve analysis
            "choke_point_probability": 0.60,
            "ghost_cycle_speed_min": 2.0,     # Fallback rule: mph minimum to consider "moving"
            "ghost_cycle_load_max": 30.0,     # Fallback rule: max engine load for ghost cycle
        }
        self._sf_service = None
    
    @property
    def sf(self):
        """Lazy load Snowflake service"""
        if self._sf_service is None:
            try:
                from services import get_snowflake_service
                self._sf_service = get_snowflake_service()
            except Exception as e:
                logger.warning(f"Could not load Snowflake service: {e}")
        return self._sf_service
    
    async def process(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze current fleet status using ML models and generate alerts.
        
        Processing flow:
        1. Get ML predictions from ML schema (populated by inference pipeline)
        2. Apply optimal thresholds from profit curve analysis
        3. Generate alerts with confidence scores
        4. Include cost impact estimates
        """
        site_id = context.get("site_id")
        self.log("Processing monitoring request with ML inference", site_id=site_id)
        
        alerts = []
        ghost_cycles = []
        choke_points = []
        
        # Get optimal thresholds from profit curves (business value optimized)
        thresholds = await self._get_optimal_thresholds()
        
        # Try ML-based detection first
        ml_ghost_cycles = await self._get_ml_ghost_cycle_predictions(site_id)
        ml_choke_points = await self._get_ml_choke_point_predictions(site_id)
        
        if ml_ghost_cycles:
            # Use ML predictions
            for pred in ml_ghost_cycles:
                probability = pred.get("GHOST_PROBABILITY", 0)
                if probability >= thresholds.get("ghost_cycle_probability", 0.5):
                    ghost_cycles.append(pred)
                    alerts.append({
                        "type": "GHOST_CYCLE",
                        "severity": "WARNING" if probability < 0.7 else "CRITICAL",
                        "equipment_id": pred.get("EQUIPMENT_ID"),
                        "confidence": probability,
                        "message": f"Ghost Cycle detected (ML confidence: {probability:.0%}): {pred.get('EQUIPMENT_ID')} - GPS speed {pred.get('GPS_SPEED_MPH', 0):.1f} mph, engine load {pred.get('ENGINE_LOAD_PCT', 0):.0f}%",
                        "estimated_fuel_waste_gal": pred.get("ESTIMATED_FUEL_WASTE_GAL", 0),
                        "estimated_cost_usd": pred.get("ESTIMATED_FUEL_WASTE_GAL", 0) * 3.80,
                        "recommendation": "Verify equipment is performing productive work or reassign",
                        "model": "GHOST_CYCLE_DETECTOR",
                        "threshold_used": thresholds.get("ghost_cycle_probability")
                    })
        else:
            # Fallback to rule-based detection
            equipment_data = context.get("equipment_data", [])
            for equip in equipment_data:
                if self._is_ghost_cycle_rule_based(equip):
                    ghost_cycles.append(equip)
                    alerts.append({
                        "type": "GHOST_CYCLE",
                        "severity": "WARNING",
                        "equipment_id": equip.get("equipment_id"),
                        "confidence": None,  # Rule-based, no confidence
                        "message": f"Ghost Cycle detected (rule-based): {equip.get('equipment_id')} moving at {equip.get('speed_mph', 0):.1f} mph with {equip.get('engine_load_pct', 0):.0f}% engine load",
                        "estimated_fuel_waste_gal": self._estimate_fuel_waste(equip),
                        "estimated_cost_usd": self._estimate_fuel_waste(equip) * 3.80,
                        "recommendation": "Verify equipment is performing productive work",
                        "model": "RULE_BASED_FALLBACK"
                    })
        
        if ml_choke_points:
            # Use ML predictions
            for pred in ml_choke_points:
                probability = pred.get("CHOKE_PROBABILITY", 0)
                if probability >= thresholds.get("choke_point_probability", 0.6):
                    choke_points.append(pred)
                    alerts.append({
                        "type": "CHOKE_POINT",
                        "severity": pred.get("PREDICTED_SEVERITY", "MEDIUM"),
                        "zone_name": pred.get("ZONE_NAME"),
                        "location": {"lat": pred.get("ZONE_LAT"), "lng": pred.get("ZONE_LNG")},
                        "confidence": probability,
                        "message": f"Choke Point predicted (ML confidence: {probability:.0%}): {pred.get('ZONE_NAME')} - {pred.get('PREDICTED_TRUCKS_AFFECTED', 0)} trucks affected",
                        "predicted_wait_time": pred.get("PREDICTED_WAIT_TIME_MIN", 0),
                        "predicted_onset_time": pred.get("PREDICTED_ONSET_TIME"),
                        "recommendation": pred.get("RECOMMENDED_ACTION", "Divert incoming trucks to alternate route"),
                        "model": "CHOKE_POINT_PREDICTOR",
                        "threshold_used": thresholds.get("choke_point_probability")
                    })
        else:
            # Fallback to rule-based detection
            zone_metrics = context.get("zone_metrics", [])
            for zone in zone_metrics:
                if self._is_choke_point_rule_based(zone):
                    choke_points.append(zone)
                    alerts.append({
                        "type": "CHOKE_POINT",
                        "severity": "ALERT",
                        "zone_name": zone.get("zone_name"),
                        "location": {"lat": zone.get("zone_lat"), "lng": zone.get("zone_lng")},
                        "confidence": None,
                        "message": f"Choke Point forming (rule-based): {zone.get('zone_name')} - {zone.get('equipment_count')} trucks",
                        "predicted_wait_time": zone.get("equipment_count", 0) * 2.5,
                        "recommendation": "Divert incoming trucks to alternate route",
                        "model": "RULE_BASED_FALLBACK"
                    })
        
        # Calculate total cost impact
        total_fuel_waste = sum(a.get("estimated_fuel_waste_gal", 0) for a in alerts if a["type"] == "GHOST_CYCLE")
        total_cost_impact = total_fuel_waste * 3.80
        
        return {
            "alerts": alerts,
            "ghost_cycles": ghost_cycles,
            "choke_points": choke_points,
            "status": "CRITICAL" if any(a.get("severity") == "CRITICAL" for a in alerts) else "ALERT" if alerts else "NORMAL",
            "summary": self._generate_summary(alerts, ghost_cycles, choke_points, total_cost_impact),
            "thresholds_used": thresholds,
            "cost_impact": {
                "total_fuel_waste_gal": total_fuel_waste,
                "total_cost_usd": total_cost_impact,
                "ghost_cycle_count": len(ghost_cycles),
                "choke_point_count": len(choke_points)
            }
        }
    
    async def _get_optimal_thresholds(self) -> Dict[str, float]:
        """Get optimal thresholds from profit curve analysis"""
        try:
            if self.sf:
                optimal = self.sf.get_optimal_thresholds()
                thresholds = {}
                for opt in optimal:
                    model = opt.get("MODEL_NAME", "")
                    if "GHOST" in model:
                        thresholds["ghost_cycle_probability"] = opt.get("OPTIMAL_THRESHOLD", 0.5)
                    elif "CHOKE" in model:
                        thresholds["choke_point_probability"] = opt.get("OPTIMAL_THRESHOLD", 0.6)
                if thresholds:
                    return {**self.default_thresholds, **thresholds}
        except Exception as e:
            logger.warning(f"Could not get optimal thresholds: {e}")
        return self.default_thresholds
    
    async def _get_ml_ghost_cycle_predictions(self, site_id: Optional[str]) -> List[Dict]:
        """Get ML-based ghost cycle predictions from ML schema"""
        try:
            if self.sf:
                site_clause = f"AND SITE_ID = '{site_id}'" if site_id else ""
                sql = f"""
                SELECT 
                    PREDICTION_ID,
                    EQUIPMENT_ID,
                    SITE_ID,
                    TIMESTAMP,
                    GPS_SPEED_MPH,
                    ENGINE_LOAD_PCT,
                    IS_GHOST_CYCLE,
                    GHOST_PROBABILITY,
                    ESTIMATED_FUEL_WASTE_GAL,
                    DURATION_MINUTES
                FROM CONSTRUCTION_GEO_DB.ML.GHOST_CYCLE_PREDICTIONS
                WHERE IS_GHOST_CYCLE = TRUE
                  AND TIMESTAMP >= DATEADD(minute, -30, CURRENT_TIMESTAMP())
                  {site_clause}
                ORDER BY GHOST_PROBABILITY DESC
                LIMIT 50
                """
                return self.sf.execute_query(sql)
        except Exception as e:
            logger.warning(f"Could not get ML ghost cycle predictions: {e}")
        return []
    
    async def _get_ml_choke_point_predictions(self, site_id: Optional[str]) -> List[Dict]:
        """Get ML-based choke point predictions from ML schema"""
        try:
            if self.sf:
                site_clause = f"AND SITE_ID = '{site_id}'" if site_id else ""
                sql = f"""
                SELECT 
                    PREDICTION_ID,
                    SITE_ID,
                    ZONE_NAME,
                    ZONE_LAT,
                    ZONE_LNG,
                    CHOKE_PROBABILITY,
                    PREDICTED_SEVERITY,
                    PREDICTED_WAIT_TIME_MIN,
                    PREDICTED_TRUCKS_AFFECTED,
                    PREDICTED_ONSET_TIME,
                    RECOMMENDED_ACTION
                FROM CONSTRUCTION_GEO_DB.ML.CHOKE_POINT_PREDICTIONS
                WHERE CHOKE_PROBABILITY > 0.4
                  AND PREDICTED_ONSET_TIME BETWEEN CURRENT_TIMESTAMP() AND DATEADD(minute, 60, CURRENT_TIMESTAMP())
                  {site_clause}
                ORDER BY CHOKE_PROBABILITY DESC
                LIMIT 20
                """
                return self.sf.execute_query(sql)
        except Exception as e:
            logger.warning(f"Could not get ML choke point predictions: {e}")
        return []
    
    def _is_ghost_cycle_rule_based(self, equipment: Dict) -> bool:
        """Fallback rule-based ghost cycle detection"""
        speed = equipment.get("speed_mph", 0)
        engine_load = equipment.get("engine_load_pct", 100)
        return (
            speed > self.default_thresholds["ghost_cycle_speed_min"] and
            engine_load < self.default_thresholds["ghost_cycle_load_max"]
        )
    
    def _is_choke_point_rule_based(self, zone: Dict) -> bool:
        """Fallback rule-based choke point detection"""
        avg_speed = zone.get("avg_speed", 100)
        equipment_count = zone.get("equipment_count", 0)
        return avg_speed < 5.0 and equipment_count > 10
    
    def _estimate_fuel_waste(self, equipment: Dict) -> float:
        """Estimate fuel waste from Ghost Cycle in gallons"""
        fuel_rate = equipment.get("fuel_rate_gph", 3.0)
        duration = equipment.get("duration_minutes", 10) / 60  # Convert to hours
        return fuel_rate * 0.4 * duration  # Ghost cycle burns ~40% of normal
    
    def _generate_summary(self, alerts: List, ghost_cycles: List, choke_points: List, total_cost: float) -> str:
        """Generate natural language summary with ML context"""
        parts = []
        
        if ghost_cycles:
            ml_detected = sum(1 for a in alerts if a.get("model") == "GHOST_CYCLE_DETECTOR" and a["type"] == "GHOST_CYCLE")
            total_waste = sum(a.get("estimated_fuel_waste_gal", 0) for a in alerts if a["type"] == "GHOST_CYCLE")
            
            if ml_detected > 0:
                parts.append(f"🔴 {len(ghost_cycles)} Ghost Cycle(s) detected by ML model - {total_waste:.1f} gal waste (${total_waste * 3.80:.0f})")
            else:
                parts.append(f"🟡 {len(ghost_cycles)} Ghost Cycle(s) detected (rule-based fallback)")
        
        if choke_points:
            ml_detected = sum(1 for a in alerts if a.get("model") == "CHOKE_POINT_PREDICTOR" and a["type"] == "CHOKE_POINT")
            
            if ml_detected > 0:
                parts.append(f"🚧 {len(choke_points)} Choke Point(s) predicted by ML model")
            else:
                parts.append(f"🟡 {len(choke_points)} Choke Point(s) detected (rule-based)")
        
        if total_cost > 0:
            parts.append(f"💰 Total cost impact: ${total_cost:.0f}")
        
        if not parts:
            parts.append("✅ All equipment operating normally - no ML anomalies detected")
        
        return " | ".join(parts)
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "get_ml_ghost_cycle_predictions",
                "description": "Get ML model predictions for Ghost Cycles from GHOST_CYCLE_DETECTOR"
            },
            {
                "name": "get_ml_choke_point_predictions",
                "description": "Get ML model predictions for Choke Points from CHOKE_POINT_PREDICTOR"
            },
            {
                "name": "get_optimal_thresholds",
                "description": "Get profit-curve-optimized alert thresholds"
            },
            {
                "name": "get_equipment_telemetry",
                "description": "Get real-time GPS and telematics for equipment"
            },
            {
                "name": "get_cost_assumptions",
                "description": "Get documented cost assumptions for ROI calculations"
            }
        ]
