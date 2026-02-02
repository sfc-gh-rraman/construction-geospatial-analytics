"""
Watchdog Agent - Real-time monitoring for Ghost Cycles and Choke Points
Uses ML models from notebooks for anomaly detection
"""

from typing import Any, Dict, List
from .base import BaseAgent


class WatchdogAgent(BaseAgent):
    """
    Monitors real-time fleet telemetry and generates proactive alerts.
    
    Capabilities:
    - Ghost Cycle detection (GPS speed vs engine load correlation)
    - Choke Point prediction (traffic density anomalies)
    - Fuel efficiency monitoring
    - Safety zone alerts
    """
    
    def __init__(self):
        super().__init__(
            name="Watchdog",
            description="Real-time monitoring for Ghost Cycles and Choke Points"
        )
        self.thresholds = {
            "ghost_cycle_speed_min": 2.0,  # mph - minimum to consider "moving"
            "ghost_cycle_load_max": 30.0,   # % - max engine load for ghost cycle
            "choke_point_speed_max": 5.0,   # mph - zone speed threshold
            "choke_point_density_min": 10,  # equipment count in zone
            "fuel_waste_threshold": 0.5     # gal/hr threshold for alert
        }
    
    async def process(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze current fleet status and generate alerts if needed.
        
        Args:
            context: Dict containing:
                - site_id: Current site
                - equipment_data: List of equipment with GPS + telematics
                - zone_metrics: Current traffic density by zone
            
        Returns:
            Dict with alerts and recommendations
        """
        self.log("Processing monitoring request", site_id=context.get("site_id"))
        
        alerts = []
        ghost_cycles = []
        choke_points = []
        
        # Check for Ghost Cycles
        equipment_data = context.get("equipment_data", [])
        for equip in equipment_data:
            if self._is_ghost_cycle(equip):
                ghost_cycles.append(equip)
                alerts.append({
                    "type": "GHOST_CYCLE",
                    "severity": "WARNING",
                    "equipment_id": equip.get("equipment_id"),
                    "message": f"Ghost Cycle detected: {equip.get('equipment_id')} moving at {equip.get('speed_mph'):.1f} mph with only {equip.get('engine_load_pct'):.0f}% engine load",
                    "estimated_fuel_waste": self._estimate_fuel_waste(equip),
                    "recommendation": "Verify equipment is performing productive work or reassign"
                })
        
        # Check for Choke Points
        zone_metrics = context.get("zone_metrics", [])
        for zone in zone_metrics:
            if self._is_choke_point(zone):
                choke_points.append(zone)
                alerts.append({
                    "type": "CHOKE_POINT",
                    "severity": "ALERT",
                    "zone_name": zone.get("zone_name"),
                    "location": {"lat": zone.get("zone_lat"), "lng": zone.get("zone_lng")},
                    "message": f"Choke Point forming: {zone.get('zone_name')} - {zone.get('equipment_count')} trucks, avg speed {zone.get('avg_speed'):.1f} mph",
                    "predicted_wait_time": zone.get("equipment_count", 0) * 2.5,  # minutes
                    "recommendation": "Divert incoming trucks to alternate route"
                })
        
        return {
            "alerts": alerts,
            "ghost_cycles": ghost_cycles,
            "choke_points": choke_points,
            "status": "ALERT" if alerts else "NORMAL",
            "summary": self._generate_summary(alerts, ghost_cycles, choke_points)
        }
    
    def _is_ghost_cycle(self, equipment: Dict) -> bool:
        """Detect Ghost Cycle condition"""
        speed = equipment.get("speed_mph", 0)
        engine_load = equipment.get("engine_load_pct", 100)
        
        return (
            speed > self.thresholds["ghost_cycle_speed_min"] and
            engine_load < self.thresholds["ghost_cycle_load_max"]
        )
    
    def _is_choke_point(self, zone: Dict) -> bool:
        """Detect Choke Point condition"""
        avg_speed = zone.get("avg_speed", 100)
        equipment_count = zone.get("equipment_count", 0)
        
        return (
            avg_speed < self.thresholds["choke_point_speed_max"] and
            equipment_count > self.thresholds["choke_point_density_min"]
        )
    
    def _estimate_fuel_waste(self, equipment: Dict) -> float:
        """Estimate fuel waste from Ghost Cycle in gallons per hour"""
        fuel_rate = equipment.get("fuel_rate_gph", 3.0)
        # Ghost cycle burns ~40% of normal fuel with no productive work
        return fuel_rate * 0.4
    
    def _generate_summary(self, alerts: List, ghost_cycles: List, choke_points: List) -> str:
        """Generate natural language summary"""
        parts = []
        
        if ghost_cycles:
            total_waste = sum(self._estimate_fuel_waste(g) for g in ghost_cycles)
            parts.append(f"🔴 {len(ghost_cycles)} Ghost Cycle(s) detected - estimated {total_waste:.1f} gal/hr fuel waste")
        
        if choke_points:
            parts.append(f"🚧 {len(choke_points)} Choke Point(s) forming")
        
        if not parts:
            parts.append("✅ All equipment operating normally")
        
        return " | ".join(parts)
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "get_equipment_telemetry",
                "description": "Get real-time GPS and telematics for equipment"
            },
            {
                "name": "get_zone_traffic",
                "description": "Get current traffic density by zone"
            },
            {
                "name": "get_ghost_cycle_history",
                "description": "Get historical Ghost Cycle patterns for equipment"
            },
            {
                "name": "get_ml_predictions",
                "description": "Get ML model predictions for Ghost Cycles and Choke Points"
            }
        ]
