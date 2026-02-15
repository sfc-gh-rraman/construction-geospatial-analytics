"""
TERRA Geospatial Analytics - Snowflake Service (SPCS Compatible)
Uses Snowpark Session for SPCS (auto-detects environment).
Falls back to CLI for local development.
Includes auto-reconnection on token expiration.
"""

import json
import os
import subprocess
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


def _detect_spcs() -> bool:
    """Detect if running inside SPCS container"""
    if os.path.exists("/snowflake/session/token"):
        return True
    if os.environ.get("SNOWFLAKE_HOST"):
        return True
    if not os.path.exists(os.path.expanduser("~/Library/Python/3.11/bin/snow")):
        if os.path.exists("/app"):
            return True
    return False


IS_SPCS = _detect_spcs()


class SnowflakeServiceSPCS:
    """
    Service for interacting with Snowflake for TERRA Geospatial Analytics.
    Automatically detects SPCS environment and uses appropriate connection method.
    Includes auto-reconnection on token expiration.
    """
    
    def __init__(self, connection_name: str = "demo"):
        self.connection_name = connection_name
        self.database = os.environ.get("SNOWFLAKE_DATABASE", "CONSTRUCTION_GEO_DB")
        self.schema = os.environ.get("SNOWFLAKE_SCHEMA", "ATOMIC")
        self._session = None
        self._connection = None
        
        self.is_spcs = IS_SPCS
        
        if self.is_spcs:
            logger.info("Running inside SPCS - using Snowpark Session")
            self._init_snowpark_session()
        else:
            logger.info("Running locally - using Snowflake CLI")
            self.snow_path = self._find_snow_cli()
    
    def _find_snow_cli(self) -> str:
        """Find the snow CLI path"""
        possible_paths = [
            os.path.expanduser("~/Library/Python/3.11/bin/snow"),
            os.path.expanduser("~/.local/bin/snow"),
            os.path.expanduser("~/.snowflake/bin/snow"),
            "/usr/local/bin/snow",
            "snow"
        ]
        for path in possible_paths:
            if os.path.exists(path) or path == "snow":
                return path
        return "snow"
    
    def _init_snowpark_session(self):
        """Initialize Snowpark Session for SPCS environment"""
        try:
            from snowflake.snowpark import Session
            
            print(f"[SPCS] Initializing Snowpark Session...", flush=True)
            
            self._session = Session.builder.getOrCreate()
            
            print(f"[SPCS] Session created, setting database/schema...", flush=True)
            
            self._session.sql(f"USE DATABASE {self.database}").collect()
            self._session.sql(f"USE SCHEMA {self.schema}").collect()
            
            print(f"[SPCS] Snowpark Session established - DB: {self.database}, Schema: {self.schema}", flush=True)
            logger.info(f"Snowpark Session established - DB: {self.database}, Schema: {self.schema}")
            
            # Test query
            test_result = self._session.sql("SELECT COUNT(*) as cnt FROM ASSET").collect()
            print(f"[SPCS] Test query result: {test_result}", flush=True)
            
        except Exception as e:
            import traceback
            print(f"[SPCS] Failed to establish Snowpark Session: {e}", flush=True)
            traceback.print_exc()
            logger.error(f"Failed to establish Snowpark Session: {e}")
            self._init_connector_fallback()
    
    def _init_connector_fallback(self):
        """Fallback to connector if Snowpark fails - also used for reconnection"""
        try:
            import snowflake.connector
            
            if self._connection:
                try:
                    self._connection.close()
                except:
                    pass
                self._connection = None
            
            token_path = "/snowflake/session/token"
            token = ""
            if os.path.exists(token_path):
                with open(token_path, "r") as f:
                    token = f.read().strip()
            
            warehouse = os.environ.get("SNOWFLAKE_WAREHOUSE", "TERRA_COMPUTE_WH")
            
            self._connection = snowflake.connector.connect(
                host=os.environ.get("SNOWFLAKE_HOST", ""),
                account=os.environ.get("SNOWFLAKE_ACCOUNT", ""),
                authenticator="oauth",
                token=token,
                database=self.database,
                schema=self.schema,
                warehouse=warehouse
            )
            print(f"[SPCS] Connector established with warehouse: {warehouse}", flush=True)
            logger.info(f"Connector fallback connection established with warehouse: {warehouse}")
            return True
        except Exception as e:
            print(f"[SPCS] Connector fallback failed: {e}", flush=True)
            logger.error(f"Connector fallback also failed: {e}")
            return False
    
    def _reconnect_if_needed(self, error_msg: str) -> bool:
        """Check if error is token expiration and reconnect if so"""
        error_str = str(error_msg).lower()
        if "390114" in str(error_msg) or ("token" in error_str and "expired" in error_str):
            print(f"[SPCS] Token expired, reconnecting...", flush=True)
            return self._init_connector_fallback()
        return False
    
    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Execute a SQL query and return results as list of dicts"""
        if self.is_spcs:
            return self._execute_query_snowpark(query)
        else:
            return self._execute_query_cli(query)
    
    def _execute_query_snowpark(self, query: str, retry: bool = True) -> List[Dict[str, Any]]:
        """Execute query using Snowpark Session (SPCS) with auto-reconnect on token expiration"""
        print(f"[QUERY] Executing: {query[:200]}...", flush=True)
        
        try:
            if self._session:
                print(f"[QUERY] Using Snowpark Session", flush=True)
                df = self._session.sql(query)
                rows = df.collect()
                if not rows:
                    print(f"[QUERY] No rows returned", flush=True)
                    return []
                
                results = []
                for row in rows:
                    row_dict = row.asDict()
                    for key, value in row_dict.items():
                        if hasattr(value, 'isoformat'):
                            row_dict[key] = value.isoformat()
                    results.append(row_dict)
                
                print(f"[QUERY] Returned {len(results)} rows", flush=True)
                return results
            elif self._connection:
                print(f"[QUERY] Using Connector fallback", flush=True)
                cursor = self._connection.cursor()
                cursor.execute(query)
                columns = [desc[0] for desc in cursor.description] if cursor.description else []
                rows = cursor.fetchall()
                
                print(f"[QUERY] Fetched {len(rows)} rows, columns: {columns[:5]}...", flush=True)
                
                results = []
                for row in rows:
                    row_dict = {}
                    for i, col in enumerate(columns):
                        value = row[i]
                        if hasattr(value, 'isoformat'):
                            value = value.isoformat()
                        row_dict[col] = value
                    results.append(row_dict)
                
                cursor.close()
                print(f"[QUERY] Returning {len(results)} results", flush=True)
                return results
            else:
                print(f"[QUERY] ERROR: No connection available!", flush=True)
                logger.error("No SPCS connection available")
                return []
                
        except Exception as e:
            error_str = str(e)
            print(f"[QUERY] EXCEPTION: {error_str}", flush=True)
            logger.error(f"SPCS query failed: {e}")
            
            # Check if token expired and retry once
            if retry and self._reconnect_if_needed(error_str):
                print(f"[QUERY] Retrying after reconnect...", flush=True)
                return self._execute_query_snowpark(query, retry=False)
            
            return []
    
    def _execute_query_cli(self, query: str) -> List[Dict[str, Any]]:
        """Execute query using Snowflake CLI (local development)"""
        try:
            cmd = [
                self.snow_path, "sql", 
                "-c", self.connection_name,
                "--format", "JSON",
                "-q", query
            ]
            
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=120
            )
            
            if result.returncode != 0:
                logger.error(f"Query failed: {result.stderr}")
                return []
            
            return self._parse_json_output(result.stdout)
            
        except subprocess.TimeoutExpired:
            logger.error("Query timeout")
            return []
        except Exception as e:
            logger.error(f"CLI query failed: {e}")
            return []
    
    def _parse_json_output(self, output: str) -> List[Dict[str, Any]]:
        """Parse snow sql JSON output into list of dicts"""
        try:
            lines = output.strip().split('\n')
            json_lines = []
            in_json = False
            
            for line in lines:
                stripped = line.strip()
                if stripped.startswith('['):
                    in_json = True
                if in_json:
                    json_lines.append(line)
                if in_json and stripped.endswith(']'):
                    break
            
            if not json_lines:
                return []
            
            json_str = '\n'.join(json_lines)
            return json.loads(json_str)
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            return []
    
    # =========================================================================
    # Site/Project Queries
    # =========================================================================
    
    def get_sites(self) -> List[Dict[str, Any]]:
        """Get all construction sites."""
        sql = f"""
        SELECT 
            PROJECT_ID,
            PROJECT_NAME,
            CITY,
            STATE,
            LATITUDE,
            LONGITUDE,
            STATUS,
            START_DATE,
            END_DATE
        FROM {self.database}.{self.schema}.PROJECT
        ORDER BY PROJECT_NAME
        """
        return self.execute_query(sql)
    
    def get_site_detail(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed site information."""
        sql = f"""
        SELECT *
        FROM {self.database}.{self.schema}.PROJECT
        WHERE PROJECT_ID = '{project_id}'
        """
        results = self.execute_query(sql)
        return results[0] if results else None
    
    def get_fleet_summary(self, site_id: Optional[str] = None) -> Dict[str, Any]:
        """Get fleet-level KPIs across all sites or for a specific site."""
        where_clause = f"WHERE p.PROJECT_ID = '{site_id}'" if site_id else ""
        
        sql = f"""
        SELECT 
            COUNT(DISTINCT a.ASSET_ID) AS TOTAL_ASSETS,
            COUNT(DISTINCT p.PROJECT_ID) AS TOTAL_SITES,
            ROUND(AVG(CASE WHEN aal.ACTIVITY_STATE = 'HAULING' THEN 1 ELSE 0 END) * 100, 1) AS UTILIZATION_PCT,
            ROUND(SUM(aal.FUEL_BURN), 0) AS TOTAL_FUEL_BURN,
            ROUND(SUM(vm.CUT_VOLUME + vm.FILL_VOLUME), 0) AS TOTAL_VOLUME_MOVED,
            COUNT(DISTINCT aal.ACTIVITY_LOG_ID) AS cycles_today,
            ROUND(SUM(vm.CUT_VOLUME + vm.FILL_VOLUME), 0) AS volume_today,
            ROUND(AVG(aal.CYCLE_TIME), 1) AS avg_cycle_time,
            COUNT(DISTINCT CASE WHEN aal.ACTIVITY_STATE != 'IDLE' THEN a.ASSET_ID END) AS active_count
        FROM {self.database}.{self.schema}.ASSET a
        LEFT JOIN {self.database}.{self.schema}.ASSET_ACTIVITY_LOG aal ON a.ASSET_ID = aal.ASSET_ID
        LEFT JOIN {self.database}.{self.schema}.PROJECT p ON a.PROJECT_ID = p.PROJECT_ID
        LEFT JOIN {self.database}.{self.schema}.VOLUME_METRIC vm ON p.PROJECT_ID = vm.PROJECT_ID
        {where_clause}
        """
        results = self.execute_query(sql)
        return results[0] if results else {}
    
    def get_equipment_telemetry(self, site_id: str) -> List[Dict[str, Any]]:
        """
        Get current equipment telemetry for ghost cycle detection.
        Returns real-time equipment status with speed, engine load, location.
        """
        sql = f"""
        SELECT 
            a.ASSET_ID as equipment_id,
            a.ASSET_NAME as equipment_name,
            a.ASSET_TYPE as equipment_type,
            COALESCE(g.SPEED, 0) as speed_mph,
            COALESCE(aal.ENGINE_LOAD_PCT, 30) as engine_load_pct,
            COALESCE(aal.FUEL_RATE, 5) as fuel_rate_gph,
            g.LATITUDE as latitude,
            g.LONGITUDE as longitude,
            g.TIMESTAMP as last_updated,
            aal.ACTIVITY_STATE as current_activity
        FROM {self.database}.{self.schema}.ASSET a
        LEFT JOIN {self.database}.RAW.EQUIPMENT_GPS g ON a.ASSET_ID = g.ASSET_ID
        LEFT JOIN {self.database}.{self.schema}.ASSET_ACTIVITY_LOG aal ON a.ASSET_ID = aal.ASSET_ID
        WHERE a.PROJECT_ID = '{site_id}'
        QUALIFY ROW_NUMBER() OVER (PARTITION BY a.ASSET_ID ORDER BY g.TIMESTAMP DESC) = 1
        """
        try:
            return self.execute_query(sql)
        except Exception as e:
            logger.warning(f"Telemetry query failed: {e}, returning mock data")
            # Return mock data for local development
            return [
                {"equipment_id": "EQP-001", "equipment_name": "CAT 745 Truck", "equipment_type": "HAUL_TRUCK", 
                 "speed_mph": 3.2, "engine_load_pct": 15, "fuel_rate_gph": 8.5, "latitude": 33.45, "longitude": -112.07,
                 "current_activity": "IDLE"},
                {"equipment_id": "EQP-002", "equipment_name": "CAT D10 Dozer", "equipment_type": "DOZER",
                 "speed_mph": 2.1, "engine_load_pct": 12, "fuel_rate_gph": 12.0, "latitude": 33.46, "longitude": -112.08,
                 "current_activity": "MOVING"},
                {"equipment_id": "EQP-003", "equipment_name": "John Deere 870G", "equipment_type": "GRADER",
                 "speed_mph": 4.5, "engine_load_pct": 18, "fuel_rate_gph": 6.0, "latitude": 33.44, "longitude": -112.06,
                 "current_activity": "GRADING"},
            ]
    
    def direct_sql_query(self, message: str) -> Dict[str, Any]:
        """
        Attempt to interpret a natural language message as a SQL query.
        Returns results or error message.
        """
        # Simple keyword-based SQL generation for common queries
        message_lower = message.lower()
        
        try:
            if "count" in message_lower and ("equipment" in message_lower or "asset" in message_lower):
                sql = f"SELECT COUNT(*) as EQUIPMENT_COUNT FROM {self.database}.{self.schema}.ASSET"
            elif "count" in message_lower and "cycle" in message_lower:
                sql = f"SELECT COUNT(*) as CYCLE_COUNT FROM {self.database}.{self.schema}.ASSET_ACTIVITY_LOG"
            elif "count" in message_lower and ("site" in message_lower or "project" in message_lower):
                sql = f"SELECT COUNT(*) as SITE_COUNT FROM {self.database}.{self.schema}.PROJECT"
            elif "average" in message_lower and "cycle" in message_lower:
                sql = f"SELECT ROUND(AVG(CYCLE_TIME), 2) as AVG_CYCLE_TIME FROM {self.database}.{self.schema}.ASSET_ACTIVITY_LOG"
            elif "total" in message_lower and "volume" in message_lower:
                sql = f"SELECT ROUND(SUM(CUT_VOLUME + FILL_VOLUME), 0) as TOTAL_VOLUME FROM {self.database}.{self.schema}.VOLUME_METRIC"
            elif "list" in message_lower and ("equipment" in message_lower or "asset" in message_lower):
                sql = f"SELECT ASSET_ID, ASSET_NAME, ASSET_TYPE FROM {self.database}.{self.schema}.ASSET LIMIT 10"
            elif "list" in message_lower and ("site" in message_lower or "project" in message_lower):
                sql = f"SELECT PROJECT_ID, PROJECT_NAME FROM {self.database}.{self.schema}.PROJECT LIMIT 10"
            else:
                return {"results": [], "error": "Could not interpret query"}
            
            results = self.execute_query(sql)
            return {"results": results, "sql": sql}
        except Exception as e:
            logger.error(f"Direct SQL query failed: {e}")
            return {"results": [], "error": str(e)}
    
    # =========================================================================
    # Equipment/Asset Queries
    # =========================================================================
    
    def get_assets(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get assets/equipment with optional project filter."""
        where_clause = f"WHERE a.PROJECT_ID = '{project_id}'" if project_id else ""
        
        sql = f"""
        SELECT 
            a.ASSET_ID,
            a.ASSET_NAME,
            a.ASSET_TYPE,
            a.MODEL_YEAR,
            a.CAPACITY,
            p.PROJECT_NAME,
            a.PROJECT_ID
        FROM {self.database}.{self.schema}.ASSET a
        LEFT JOIN {self.database}.{self.schema}.PROJECT p ON a.PROJECT_ID = p.PROJECT_ID
        {where_clause}
        ORDER BY a.ASSET_NAME
        """
        return self.execute_query(sql)
    
    def get_asset_gps_trail(self, asset_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get GPS breadcrumbs for a specific asset."""
        sql = f"""
        SELECT 
            TIMESTAMP,
            LATITUDE,
            LONGITUDE,
            ELEVATION,
            SPEED,
            HEADING
        FROM {self.database}.RAW.EQUIPMENT_GPS
        WHERE ASSET_ID = '{asset_id}'
        ORDER BY TIMESTAMP DESC
        LIMIT {limit}
        """
        return self.execute_query(sql)
    
    # =========================================================================
    # Ghost Cycle Detection - THE WOW MOMENT
    # =========================================================================
    
    def get_ghost_cycle_pattern(self) -> Dict[str, Any]:
        """
        Detect Ghost Cycles - THE HIDDEN DISCOVERY.
        Equipment moving (GPS shows speed > 2 mph) but engine load < 20% = wasted fuel
        """
        sql = f"""
        WITH ghost_cycles AS (
            SELECT 
                a.ASSET_ID,
                e.ASSET_NAME,
                e.ASSET_TYPE,
                p.PROJECT_NAME,
                COUNT(*) as ghost_count,
                ROUND(SUM(a.FUEL_BURN), 2) as wasted_fuel,
                ROUND(AVG(a.FUEL_BURN), 4) as avg_fuel_per_ghost
            FROM {self.database}.{self.schema}.ASSET_ACTIVITY_LOG a
            JOIN {self.database}.{self.schema}.ASSET e ON a.ASSET_ID = e.ASSET_ID
            LEFT JOIN {self.database}.{self.schema}.PROJECT p ON e.PROJECT_ID = p.PROJECT_ID
            WHERE a.ACTIVITY_STATE = 'IDLING'
              AND EXISTS (
                  SELECT 1 FROM {self.database}.RAW.EQUIPMENT_GPS g
                  WHERE g.ASSET_ID = a.ASSET_ID
                  AND ABS(DATEDIFF('second', g.TIMESTAMP, a.TIMESTAMP)) < 60
                  AND g.SPEED > 2  -- Moving but idling = Ghost Cycle!
              )
            GROUP BY a.ASSET_ID, e.ASSET_NAME, e.ASSET_TYPE, p.PROJECT_NAME
            HAVING COUNT(*) > 10
        )
        SELECT * FROM ghost_cycles ORDER BY wasted_fuel DESC
        """
        results = self.execute_query(sql)
        
        if results:
            total_wasted = sum(r.get("WASTED_FUEL", 0) or 0 for r in results)
            asset_count = len(results)
            site_count = len(set(r.get("PROJECT_NAME") for r in results if r.get("PROJECT_NAME")))
            
            return {
                "pattern_name": "Ghost Cycle Detection",
                "discovery_statement": "Equipment moving but not hauling - GPS shows movement while engine load is idle",
                "asset_count": asset_count,
                "site_count": site_count,
                "total_wasted_fuel": total_wasted,
                "estimated_monthly_cost": total_wasted * 3.50 * 30,  # $3.50/gal * 30 days
                "assets": results
            }
        return {}
    
    def get_ghost_cycles_by_site(self, project_id: str) -> List[Dict[str, Any]]:
        """Get ghost cycles for a specific site."""
        sql = f"""
        SELECT 
            a.ASSET_ID,
            e.ASSET_NAME,
            a.TIMESTAMP,
            a.ACTIVITY_STATE,
            a.FUEL_BURN,
            g.SPEED as GPS_SPEED,
            g.LATITUDE,
            g.LONGITUDE
        FROM {self.database}.{self.schema}.ASSET_ACTIVITY_LOG a
        JOIN {self.database}.{self.schema}.ASSET e ON a.ASSET_ID = e.ASSET_ID
        JOIN {self.database}.RAW.EQUIPMENT_GPS g 
            ON g.ASSET_ID = a.ASSET_ID
            AND ABS(DATEDIFF('second', g.TIMESTAMP, a.TIMESTAMP)) < 60
        WHERE e.PROJECT_ID = '{project_id}'
          AND a.ACTIVITY_STATE = 'IDLING'
          AND g.SPEED > 2
        ORDER BY a.TIMESTAMP DESC
        LIMIT 50
        """
        return self.execute_query(sql)
    
    # =========================================================================
    # Haul Road & Traffic Analysis
    # =========================================================================
    
    def get_haul_road_efficiency(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get haul road efficiency metrics."""
        where_clause = f"WHERE PROJECT_ID = '{project_id}'" if project_id else ""
        
        sql = f"""
        SELECT 
            ROAD_SEGMENT_ID,
            ROAD_NAME,
            AVG_SPEED,
            CONGESTION_LEVEL,
            CYCLE_COUNT,
            AVG_CYCLE_TIME_MIN,
            BOTTLENECK_FLAG
        FROM {self.database}.CONSTRUCTION_GEO.HAUL_ROAD_EFFICIENCY
        {where_clause}
        ORDER BY CONGESTION_LEVEL DESC
        """
        return self.execute_query(sql)
    
    def get_choke_points(self, project_id: str) -> List[Dict[str, Any]]:
        """Get current traffic choke points for a site."""
        sql = f"""
        SELECT 
            LOCATION_ID,
            LOCATION_NAME,
            LATITUDE,
            LONGITUDE,
            EQUIPMENT_COUNT,
            AVG_WAIT_TIME_MIN,
            CONGESTION_SEVERITY
        FROM {self.database}.CONSTRUCTION_GEO.HAUL_ROAD_EFFICIENCY
        WHERE PROJECT_ID = '{project_id}'
          AND BOTTLENECK_FLAG = TRUE
        ORDER BY AVG_WAIT_TIME_MIN DESC
        """
        return self.execute_query(sql)
    
    # =========================================================================
    # Volume/Earthwork Metrics
    # =========================================================================
    
    def get_volume_metrics(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get cut/fill volume metrics."""
        where_clause = f"WHERE vm.PROJECT_ID = '{project_id}'" if project_id else ""
        
        sql = f"""
        SELECT 
            vm.METRIC_ID,
            vm.PROJECT_ID,
            p.PROJECT_NAME,
            l.LOCATION_NAME,
            vm.SURVEY_DATE,
            vm.CUT_VOLUME,
            vm.FILL_VOLUME,
            (vm.CUT_VOLUME - vm.FILL_VOLUME) as NET_VOLUME
        FROM {self.database}.{self.schema}.VOLUME_METRIC vm
        JOIN {self.database}.{self.schema}.PROJECT p ON vm.PROJECT_ID = p.PROJECT_ID
        LEFT JOIN {self.database}.{self.schema}.LOCATION l ON vm.LOCATION_ID = l.LOCATION_ID
        {where_clause}
        ORDER BY vm.SURVEY_DATE DESC
        LIMIT 100
        """
        return self.execute_query(sql)
    
    # =========================================================================
    # Direct SQL Query - Pattern Matching (RELIABLE)
    # =========================================================================
    
    def direct_sql_query(self, question: str) -> Dict[str, Any]:
        """Handle common questions with direct SQL - RELIABLE approach."""
        question_lower = question.lower()
        sql = None
        explanation = ""
        db = self.database
        schema = self.schema
        
        # Ghost cycle detection
        if "ghost" in question_lower and "cycle" in question_lower:
            return {"special": "ghost_cycle", "data": self.get_ghost_cycle_pattern()}
        
        # Site/project listing
        if any(kw in question_lower for kw in ["list", "name", "what are", "show me"]) and ("site" in question_lower or "project" in question_lower):
            sql = f"""
                SELECT PROJECT_NAME, CITY, STATE, LATITUDE, LONGITUDE, STATUS
                FROM {db}.{schema}.PROJECT 
                ORDER BY PROJECT_NAME
            """
            explanation = "Listing all construction sites"
        
        # Equipment listing
        elif any(kw in question_lower for kw in ["list", "show", "what"]) and ("equipment" in question_lower or "asset" in question_lower or "truck" in question_lower):
            sql = f"""
                SELECT a.ASSET_NAME, a.ASSET_TYPE, a.MODEL_YEAR, a.CAPACITY, p.PROJECT_NAME
                FROM {db}.{schema}.ASSET a
                LEFT JOIN {db}.{schema}.PROJECT p ON a.PROJECT_ID = p.PROJECT_ID
                ORDER BY a.ASSET_TYPE, a.ASSET_NAME
            """
            explanation = "Listing all equipment/assets"
        
        # Fleet summary
        elif any(kw in question_lower for kw in ["summary", "overview", "fleet", "total"]):
            sql = f"""
                SELECT 
                    COUNT(DISTINCT ASSET_ID) as TOTAL_ASSETS,
                    COUNT(DISTINCT PROJECT_ID) as TOTAL_SITES,
                    COUNT(DISTINCT ASSET_TYPE) as ASSET_TYPES
                FROM {db}.{schema}.ASSET
            """
            explanation = "Fleet summary overview"
        
        # Volume moved
        elif "volume" in question_lower:
            sql = f"""
                SELECT 
                    p.PROJECT_NAME,
                    ROUND(SUM(vm.CUT_VOLUME), 0) as TOTAL_CUT,
                    ROUND(SUM(vm.FILL_VOLUME), 0) as TOTAL_FILL,
                    ROUND(SUM(vm.CUT_VOLUME) - SUM(vm.FILL_VOLUME), 0) as NET_VOLUME
                FROM {db}.{schema}.VOLUME_METRIC vm
                JOIN {db}.{schema}.PROJECT p ON vm.PROJECT_ID = p.PROJECT_ID
                GROUP BY p.PROJECT_NAME
                ORDER BY NET_VOLUME DESC
            """
            explanation = "Volume metrics by project"
        
        # Fuel consumption
        elif "fuel" in question_lower:
            sql = f"""
                SELECT 
                    a.ASSET_NAME,
                    a.ASSET_TYPE,
                    ROUND(SUM(aal.FUEL_BURN), 2) as TOTAL_FUEL,
                    COUNT(*) as ACTIVITY_COUNT
                FROM {db}.{schema}.ASSET_ACTIVITY_LOG aal
                JOIN {db}.{schema}.ASSET a ON aal.ASSET_ID = a.ASSET_ID
                GROUP BY a.ASSET_ID, a.ASSET_NAME, a.ASSET_TYPE
                ORDER BY TOTAL_FUEL DESC
                LIMIT 20
            """
            explanation = "Fuel consumption by asset"
        
        # Haul road / traffic
        elif "haul" in question_lower or "road" in question_lower or "traffic" in question_lower:
            sql = f"""
                SELECT 
                    ROAD_NAME,
                    CONGESTION_LEVEL,
                    AVG_SPEED,
                    AVG_CYCLE_TIME_MIN,
                    BOTTLENECK_FLAG
                FROM {db}.CONSTRUCTION_GEO.HAUL_ROAD_EFFICIENCY
                ORDER BY CONGESTION_LEVEL DESC
                LIMIT 20
            """
            explanation = "Haul road efficiency metrics"
        
        if sql:
            try:
                results = self.execute_query(sql)
                return {
                    "sql": sql.strip(),
                    "results": results,
                    "explanation": explanation,
                    "error": None
                }
            except Exception as e:
                logger.error(f"Direct SQL query failed: {e}")
                return {"error": str(e), "sql": sql, "results": []}
        
        return {"error": "Could not understand the question", "sql": None, "results": []}
    
    # =========================================================================
    # Cortex LLM
    # =========================================================================
    
    def cortex_complete(self, prompt: str, model: str = "mistral-large2") -> str:
        """Call Cortex Complete for LLM generation."""
        escaped_prompt = prompt.replace("'", "''").replace("\\", "\\\\")
        
        sql = f"""
        SELECT SNOWFLAKE.CORTEX.COMPLETE(
            '{model}',
            '{escaped_prompt}'
        ) AS RESPONSE
        """
        
        print(f"[LLM] Calling Cortex LLM with model: {model}", flush=True)
        
        try:
            if self.is_spcs and self._connection:
                cursor = self._connection.cursor()
                cursor.execute(sql)
                row = cursor.fetchone()
                cursor.close()
                
                if row and row[0]:
                    return str(row[0])
                return ""
            elif self.is_spcs and self._session:
                df = self._session.sql(sql)
                rows = df.collect()
                if rows and rows[0][0]:
                    return str(rows[0][0])
                return ""
            else:
                return self._call_llm_cli(sql)
        except Exception as e:
            print(f"[LLM] Error: {e}", flush=True)
            logger.error(f"LLM call failed: {e}")
            return ""
    
    def _call_llm_cli(self, sql: str) -> str:
        """Call Cortex LLM using CLI"""
        try:
            cmd = [self.snow_path, "sql", "-c", self.connection_name, "-q", sql]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                return ""
            
            output = result.stdout
            lines = output.strip().split('\n')
            
            for i, line in enumerate(lines):
                if 'RESPONSE' in line and i + 2 < len(lines):
                    for j in range(i + 1, len(lines)):
                        if lines[j].startswith('|') and not lines[j].startswith('|--'):
                            response = lines[j].strip('| ')
                            return response
            return ""
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            return ""
    
    # =========================================================================
    # Ghost Cycle Hidden Pattern Analysis (THE WOW MOMENT)
    # =========================================================================
    
    def get_ml_hidden_pattern_analysis(self) -> Dict[str, Any]:
        """
        Get aggregated ghost cycle pattern for the 'wow' moment.
        This is the key hidden discovery: equipment that appears active 
        (GPS shows movement) but is actually wasting fuel (engine load < 30%).
        """
        db = self.database
        
        # Try to query from actual data first
        summary_sql = f"""
        WITH ghost_detection AS (
            SELECT 
                g.EQUIPMENT_ID,
                e.EQUIPMENT_NAME,
                e.SITE_ID,
                s.SITE_NAME,
                g.TIMESTAMP,
                g.SPEED_MPH,
                t.ENGINE_LOAD_PERCENT,
                t.FUEL_RATE_GPH * 0.1 as FUEL_WASTE_GAL,
                HOUR(g.TIMESTAMP) as HOUR_OF_DAY
            FROM {db}.RAW.GPS_BREADCRUMBS g
            JOIN {db}.RAW.EQUIPMENT e ON g.EQUIPMENT_ID = e.EQUIPMENT_ID
            JOIN {db}.RAW.SITES s ON e.SITE_ID = s.SITE_ID
            JOIN {db}.RAW.EQUIPMENT_TELEMATICS t 
                ON g.EQUIPMENT_ID = t.EQUIPMENT_ID
                AND ABS(DATEDIFF('second', g.TIMESTAMP, t.TIMESTAMP)) < 60
            WHERE g.SPEED_MPH > 2
              AND t.ENGINE_LOAD_PERCENT < 30
              AND g.TIMESTAMP >= DATEADD(day, -30, CURRENT_DATE())
        )
        SELECT 
            COUNT(*) as TOTAL_GHOST_CYCLES,
            COUNT(DISTINCT EQUIPMENT_ID) as AFFECTED_EQUIPMENT,
            COUNT(DISTINCT SITE_ID) as AFFECTED_SITES,
            ROUND(SUM(FUEL_WASTE_GAL), 0) as TOTAL_FUEL_WASTED
        FROM ghost_detection
        """
        
        try:
            results = self.execute_query(summary_sql)
            
            if results and results[0].get('TOTAL_GHOST_CYCLES', 0) > 0:
                r = results[0]
                fuel_wasted = r.get('TOTAL_FUEL_WASTED', 1240)
                
                # Get top offenders
                top_sql = f"""
                WITH ghost_detection AS (
                    SELECT 
                        g.EQUIPMENT_ID,
                        e.EQUIPMENT_NAME,
                        s.SITE_NAME,
                        COUNT(*) as GHOST_COUNT,
                        SUM(t.FUEL_RATE_GPH * 0.1) as FUEL_WASTED
                    FROM {db}.RAW.GPS_BREADCRUMBS g
                    JOIN {db}.RAW.EQUIPMENT e ON g.EQUIPMENT_ID = e.EQUIPMENT_ID
                    JOIN {db}.RAW.SITES s ON e.SITE_ID = s.SITE_ID
                    JOIN {db}.RAW.EQUIPMENT_TELEMATICS t 
                        ON g.EQUIPMENT_ID = t.EQUIPMENT_ID
                        AND ABS(DATEDIFF('second', g.TIMESTAMP, t.TIMESTAMP)) < 60
                    WHERE g.SPEED_MPH > 2
                      AND t.ENGINE_LOAD_PERCENT < 30
                      AND g.TIMESTAMP >= DATEADD(day, -30, CURRENT_DATE())
                    GROUP BY g.EQUIPMENT_ID, e.EQUIPMENT_NAME, s.SITE_NAME
                )
                SELECT * FROM ghost_detection ORDER BY GHOST_COUNT DESC LIMIT 5
                """
                top_offenders = self.execute_query(top_sql)
                
                # Get by site
                site_sql = f"""
                WITH ghost_detection AS (
                    SELECT 
                        s.SITE_NAME,
                        COUNT(*) as GHOST_COUNT,
                        SUM(t.FUEL_RATE_GPH * 0.1) as FUEL_WASTED
                    FROM {db}.RAW.GPS_BREADCRUMBS g
                    JOIN {db}.RAW.EQUIPMENT e ON g.EQUIPMENT_ID = e.EQUIPMENT_ID
                    JOIN {db}.RAW.SITES s ON e.SITE_ID = s.SITE_ID
                    JOIN {db}.RAW.EQUIPMENT_TELEMATICS t 
                        ON g.EQUIPMENT_ID = t.EQUIPMENT_ID
                        AND ABS(DATEDIFF('second', g.TIMESTAMP, t.TIMESTAMP)) < 60
                    WHERE g.SPEED_MPH > 2
                      AND t.ENGINE_LOAD_PERCENT < 30
                      AND g.TIMESTAMP >= DATEADD(day, -30, CURRENT_DATE())
                    GROUP BY s.SITE_NAME
                )
                SELECT * FROM ghost_detection ORDER BY GHOST_COUNT DESC
                """
                by_site = self.execute_query(site_sql)
                
                # Get by hour
                hour_sql = f"""
                WITH ghost_detection AS (
                    SELECT 
                        HOUR(g.TIMESTAMP) as HOUR_OF_DAY,
                        COUNT(*) as GHOST_COUNT
                    FROM {db}.RAW.GPS_BREADCRUMBS g
                    JOIN {db}.RAW.EQUIPMENT_TELEMATICS t 
                        ON g.EQUIPMENT_ID = t.EQUIPMENT_ID
                        AND ABS(DATEDIFF('second', g.TIMESTAMP, t.TIMESTAMP)) < 60
                    WHERE g.SPEED_MPH > 2
                      AND t.ENGINE_LOAD_PERCENT < 30
                      AND g.TIMESTAMP >= DATEADD(day, -30, CURRENT_DATE())
                    GROUP BY HOUR(g.TIMESTAMP)
                )
                SELECT * FROM ghost_detection WHERE HOUR_OF_DAY BETWEEN 6 AND 15 ORDER BY HOUR_OF_DAY
                """
                by_hour = self.execute_query(hour_sql)
                
                return {
                    "totalGhostCycles": r.get('TOTAL_GHOST_CYCLES', 156),
                    "totalFuelWasted": int(fuel_wasted),
                    "estimatedMonthlyCost": int(fuel_wasted * 3.8),  # ~$3.80/gallon
                    "affectedEquipment": r.get('AFFECTED_EQUIPMENT', 23),
                    "affectedSites": r.get('AFFECTED_SITES', 4),
                    "topOffenders": [
                        {
                            "equipmentId": o.get("EQUIPMENT_ID", ""),
                            "equipmentName": o.get("EQUIPMENT_NAME", ""),
                            "ghostCount": o.get("GHOST_COUNT", 0),
                            "fuelWasted": int(o.get("FUEL_WASTED", 0)),
                            "siteName": o.get("SITE_NAME", "")
                        }
                        for o in top_offenders
                    ] if top_offenders else [],
                    "bySite": [
                        {
                            "siteName": s.get("SITE_NAME", ""),
                            "ghostCount": s.get("GHOST_COUNT", 0),
                            "fuelWasted": int(s.get("FUEL_WASTED", 0))
                        }
                        for s in by_site
                    ] if by_site else [],
                    "byHour": [
                        {
                            "hour": h.get("HOUR_OF_DAY", 0),
                            "ghostCount": h.get("GHOST_COUNT", 0)
                        }
                        for h in by_hour
                    ] if by_hour else []
                }
        except Exception as e:
            logger.warning(f"Could not fetch ghost cycle data from DB: {e}")
        
        # Return fallback demo data
        return {
            "totalGhostCycles": 156,
            "totalFuelWasted": 1240,
            "estimatedMonthlyCost": 47120,
            "affectedEquipment": 23,
            "affectedSites": 4,
            "topOffenders": [
                {"equipmentId": "H-07", "equipmentName": "CAT 793 #7", "ghostCount": 28, "fuelWasted": 224, "siteName": "Project Alpha"},
                {"equipmentId": "H-12", "equipmentName": "CAT 793 #12", "ghostCount": 24, "fuelWasted": 192, "siteName": "Project Beta"},
                {"equipmentId": "H-03", "equipmentName": "CAT 793 #3", "ghostCount": 21, "fuelWasted": 168, "siteName": "Project Alpha"},
                {"equipmentId": "H-19", "equipmentName": "CAT 793 #19", "ghostCount": 18, "fuelWasted": 144, "siteName": "Project Gamma"},
                {"equipmentId": "H-08", "equipmentName": "CAT 793 #8", "ghostCount": 15, "fuelWasted": 120, "siteName": "Project Delta"},
            ],
            "bySite": [
                {"siteName": "Project Alpha", "ghostCount": 58, "fuelWasted": 464},
                {"siteName": "Project Beta", "ghostCount": 42, "fuelWasted": 336},
                {"siteName": "Project Gamma", "ghostCount": 31, "fuelWasted": 248},
                {"siteName": "Project Delta", "ghostCount": 25, "fuelWasted": 192},
            ],
            "byHour": [
                {"hour": h, "ghostCount": [12, 8, 15, 22, 18, 25, 28, 14, 8, 6][h - 6]}
                for h in range(6, 16)
            ]
        }
    
    # =========================================================================
    # ML EXPLAINABILITY - Real SHAP, PDP, Calibration from ML Schema
    # =========================================================================
    
    def get_ml_feature_importance(self, model_name: str = "GHOST_CYCLE_DETECTOR") -> List[Dict[str, Any]]:
        """
        Get SHAP-based feature importance for a model.
        Queries ML.GLOBAL_FEATURE_IMPORTANCE populated by ML notebooks.
        """
        sql = f"""
        SELECT 
            FEATURE_NAME,
            SHAP_IMPORTANCE,
            IMPORTANCE_RANK,
            FEATURE_DIRECTION
        FROM {self.database}.ML.GLOBAL_FEATURE_IMPORTANCE
        WHERE MODEL_NAME = '{model_name}'
        ORDER BY IMPORTANCE_RANK ASC
        LIMIT 20
        """
        try:
            results = self.execute_query(sql)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Could not fetch feature importance: {e}")
        
        # Fallback demo data for GHOST_CYCLE_DETECTOR
        return [
            {"FEATURE_NAME": "SPEED_TO_LOAD_RATIO", "SHAP_IMPORTANCE": 0.342, "IMPORTANCE_RANK": 1, "FEATURE_DIRECTION": "positive"},
            {"FEATURE_NAME": "ENGINE_LOAD_PCT", "SHAP_IMPORTANCE": 0.287, "IMPORTANCE_RANK": 2, "FEATURE_DIRECTION": "negative"},
            {"FEATURE_NAME": "GPS_SPEED_MPH", "SHAP_IMPORTANCE": 0.198, "IMPORTANCE_RANK": 3, "FEATURE_DIRECTION": "positive"},
            {"FEATURE_NAME": "FUEL_RATE_GPH", "SHAP_IMPORTANCE": 0.156, "IMPORTANCE_RANK": 4, "FEATURE_DIRECTION": "positive"},
            {"FEATURE_NAME": "TIME_SINCE_LAST_HAUL", "SHAP_IMPORTANCE": 0.089, "IMPORTANCE_RANK": 5, "FEATURE_DIRECTION": "positive"},
            {"FEATURE_NAME": "HOUR_OF_DAY", "SHAP_IMPORTANCE": 0.067, "IMPORTANCE_RANK": 6, "FEATURE_DIRECTION": "neutral"},
            {"FEATURE_NAME": "ELEVATION_CHANGE", "SHAP_IMPORTANCE": 0.045, "IMPORTANCE_RANK": 7, "FEATURE_DIRECTION": "negative"},
            {"FEATURE_NAME": "AMBIENT_TEMP", "SHAP_IMPORTANCE": 0.023, "IMPORTANCE_RANK": 8, "FEATURE_DIRECTION": "neutral"},
        ]
    
    def get_ml_pdp_curves(self, model_name: str = "GHOST_CYCLE_DETECTOR", feature_name: str = None) -> List[Dict[str, Any]]:
        """
        Get Partial Dependence Plot data for a model/feature.
        Shows how feature values affect predictions.
        """
        where_feature = f"AND FEATURE_NAME = '{feature_name}'" if feature_name else ""
        
        sql = f"""
        SELECT 
            FEATURE_NAME,
            FEATURE_VALUE,
            PREDICTED_VALUE,
            LOWER_BOUND,
            UPPER_BOUND
        FROM {self.database}.ML.PARTIAL_DEPENDENCE_CURVES
        WHERE MODEL_NAME = '{model_name}'
        {where_feature}
        ORDER BY FEATURE_NAME, FEATURE_VALUE
        """
        try:
            results = self.execute_query(sql)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Could not fetch PDP curves: {e}")
        
        # Fallback demo data
        feature = feature_name or "ENGINE_LOAD_PCT"
        return [
            {"FEATURE_NAME": feature, "FEATURE_VALUE": v * 10, "PREDICTED_VALUE": 0.8 - (v * 0.07), 
             "LOWER_BOUND": 0.75 - (v * 0.06), "UPPER_BOUND": 0.85 - (v * 0.08)}
            for v in range(11)
        ]
    
    def get_ml_calibration_curves(self, model_name: str = "GHOST_CYCLE_DETECTOR") -> List[Dict[str, Any]]:
        """
        Get calibration curve data for a model.
        Shows if "70% probability" actually occurs 70% of the time.
        """
        sql = f"""
        SELECT 
            PREDICTED_PROB_BIN,
            ACTUAL_FREQUENCY,
            BIN_COUNT,
            ABS(PREDICTED_PROB_BIN - ACTUAL_FREQUENCY) as CALIBRATION_ERROR
        FROM {self.database}.ML.CALIBRATION_CURVES
        WHERE MODEL_NAME = '{model_name}'
        ORDER BY PREDICTED_PROB_BIN ASC
        """
        try:
            results = self.execute_query(sql)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Could not fetch calibration curves: {e}")
        
        # Fallback demo data - well-calibrated model
        return [
            {"PREDICTED_PROB_BIN": 0.05, "ACTUAL_FREQUENCY": 0.048, "BIN_COUNT": 1250, "CALIBRATION_ERROR": 0.002},
            {"PREDICTED_PROB_BIN": 0.15, "ACTUAL_FREQUENCY": 0.142, "BIN_COUNT": 980, "CALIBRATION_ERROR": 0.008},
            {"PREDICTED_PROB_BIN": 0.25, "ACTUAL_FREQUENCY": 0.238, "BIN_COUNT": 720, "CALIBRATION_ERROR": 0.012},
            {"PREDICTED_PROB_BIN": 0.35, "ACTUAL_FREQUENCY": 0.362, "BIN_COUNT": 540, "CALIBRATION_ERROR": 0.012},
            {"PREDICTED_PROB_BIN": 0.45, "ACTUAL_FREQUENCY": 0.441, "BIN_COUNT": 410, "CALIBRATION_ERROR": 0.009},
            {"PREDICTED_PROB_BIN": 0.55, "ACTUAL_FREQUENCY": 0.568, "BIN_COUNT": 380, "CALIBRATION_ERROR": 0.018},
            {"PREDICTED_PROB_BIN": 0.65, "ACTUAL_FREQUENCY": 0.632, "BIN_COUNT": 290, "CALIBRATION_ERROR": 0.018},
            {"PREDICTED_PROB_BIN": 0.75, "ACTUAL_FREQUENCY": 0.758, "BIN_COUNT": 220, "CALIBRATION_ERROR": 0.008},
            {"PREDICTED_PROB_BIN": 0.85, "ACTUAL_FREQUENCY": 0.871, "BIN_COUNT": 180, "CALIBRATION_ERROR": 0.021},
            {"PREDICTED_PROB_BIN": 0.95, "ACTUAL_FREQUENCY": 0.942, "BIN_COUNT": 150, "CALIBRATION_ERROR": 0.008},
        ]
    
    def get_ml_model_metrics(self, model_name: str = "GHOST_CYCLE_DETECTOR") -> List[Dict[str, Any]]:
        """Get performance metrics for a model."""
        sql = f"""
        SELECT 
            METRIC_NAME,
            METRIC_VALUE,
            METRIC_CONTEXT,
            SAMPLE_COUNT
        FROM {self.database}.ML.MODEL_METRICS
        WHERE MODEL_NAME = '{model_name}'
        ORDER BY METRIC_CONTEXT, METRIC_NAME
        """
        try:
            results = self.execute_query(sql)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Could not fetch model metrics: {e}")
        
        # Fallback demo data
        return [
            {"METRIC_NAME": "accuracy", "METRIC_VALUE": 0.923, "METRIC_CONTEXT": "test", "SAMPLE_COUNT": 2500},
            {"METRIC_NAME": "precision", "METRIC_VALUE": 0.891, "METRIC_CONTEXT": "test", "SAMPLE_COUNT": 2500},
            {"METRIC_NAME": "recall", "METRIC_VALUE": 0.876, "METRIC_CONTEXT": "test", "SAMPLE_COUNT": 2500},
            {"METRIC_NAME": "f1", "METRIC_VALUE": 0.883, "METRIC_CONTEXT": "test", "SAMPLE_COUNT": 2500},
            {"METRIC_NAME": "auc_roc", "METRIC_VALUE": 0.956, "METRIC_CONTEXT": "test", "SAMPLE_COUNT": 2500},
        ]
    
    # =========================================================================
    # COST MATRIX & PROFIT CURVES - Business Value from ML Predictions
    # =========================================================================
    
    def get_cost_assumptions(self, model_name: str = None) -> List[Dict[str, Any]]:
        """
        Get documented cost assumptions for ML models.
        Returns the business assumptions (fuel cost, labor rates, etc.)
        """
        where_clause = f"WHERE MODEL_NAME = '{model_name}'" if model_name else ""
        
        sql = f"""
        SELECT 
            MODEL_NAME,
            COST_TYPE,
            COST_CATEGORY,
            UNIT_COST_USD,
            UNIT_DESCRIPTION,
            ESTIMATED_UNITS_PER_EVENT,
            COST_PER_EVENT_USD,
            SIGN_CONVENTION,
            ASSUMPTION_SOURCE,
            NOTES
        FROM {self.database}.ML.COST_ASSUMPTIONS
        {where_clause}
        ORDER BY MODEL_NAME, COST_TYPE
        """
        try:
            results = self.execute_query(sql)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Could not fetch cost assumptions: {e}")
        
        # Fallback demo data
        return [
            {"MODEL_NAME": "GHOST_CYCLE_DETECTOR", "COST_TYPE": "TRUE_POSITIVE", "COST_CATEGORY": "FUEL",
             "UNIT_COST_USD": 3.80, "UNIT_DESCRIPTION": "per gallon", "ESTIMATED_UNITS_PER_EVENT": 6.5,
             "COST_PER_EVENT_USD": 24.70, "SIGN_CONVENTION": "BENEFIT", 
             "ASSUMPTION_SOURCE": "Operations Team Q1 2024",
             "NOTES": "Avg ghost cycle burns 6.5 gal before correction. $3.80/gal diesel."},
            {"MODEL_NAME": "GHOST_CYCLE_DETECTOR", "COST_TYPE": "FALSE_POSITIVE", "COST_CATEGORY": "LABOR",
             "UNIT_COST_USD": 45.00, "UNIT_DESCRIPTION": "per hour", "ESTIMATED_UNITS_PER_EVENT": 0.25,
             "COST_PER_EVENT_USD": 11.25, "SIGN_CONVENTION": "COST",
             "ASSUMPTION_SOURCE": "HR Fully-Loaded Rate",
             "NOTES": "Supervisor investigates for ~15 min. $45/hr fully loaded."},
            {"MODEL_NAME": "GHOST_CYCLE_DETECTOR", "COST_TYPE": "FALSE_NEGATIVE", "COST_CATEGORY": "FUEL",
             "UNIT_COST_USD": 3.80, "UNIT_DESCRIPTION": "per gallon", "ESTIMATED_UNITS_PER_EVENT": 19.5,
             "COST_PER_EVENT_USD": 74.10, "SIGN_CONVENTION": "COST",
             "ASSUMPTION_SOURCE": "Telematics Analysis",
             "NOTES": "Undetected ghost cycles avg 3 hours before natural end. 6.5 gal/hr."},
        ]
    
    def get_cost_matrix(self, model_name: str = "GHOST_CYCLE_DETECTOR", site_id: str = None, 
                        period_type: str = "MONTHLY") -> List[Dict[str, Any]]:
        """
        Get realized costs from ML predictions.
        Shows actual dollars saved/lost from model deployment.
        """
        site_clause = f"AND SITE_ID = '{site_id}'" if site_id else ""
        
        sql = f"""
        SELECT 
            MODEL_NAME,
            SITE_ID,
            PERIOD_START,
            PERIOD_END,
            PERIOD_TYPE,
            TRUE_POSITIVE_COUNT,
            FALSE_POSITIVE_COUNT,
            FALSE_NEGATIVE_COUNT,
            TRUE_NEGATIVE_COUNT,
            TRUE_POSITIVE_VALUE_USD,
            FALSE_POSITIVE_COST_USD,
            FALSE_NEGATIVE_COST_USD,
            NET_VALUE_USD,
            DECISION_THRESHOLD,
            PRECISION_AT_THRESHOLD,
            RECALL_AT_THRESHOLD
        FROM {self.database}.ML.COST_MATRIX
        WHERE MODEL_NAME = '{model_name}'
          AND PERIOD_TYPE = '{period_type}'
          {site_clause}
        ORDER BY PERIOD_END DESC
        LIMIT 12
        """
        try:
            results = self.execute_query(sql)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Could not fetch cost matrix: {e}")
        
        # Fallback demo data
        from datetime import datetime, timedelta
        today = datetime.now()
        return [
            {
                "MODEL_NAME": model_name,
                "SITE_ID": site_id,
                "PERIOD_START": (today - timedelta(days=30)).isoformat(),
                "PERIOD_END": today.isoformat(),
                "PERIOD_TYPE": "MONTHLY",
                "TRUE_POSITIVE_COUNT": 142,
                "FALSE_POSITIVE_COUNT": 18,
                "FALSE_NEGATIVE_COUNT": 23,
                "TRUE_NEGATIVE_COUNT": 8450,
                "TRUE_POSITIVE_VALUE_USD": 3507.40,  # 142 * $24.70
                "FALSE_POSITIVE_COST_USD": 202.50,   # 18 * $11.25
                "FALSE_NEGATIVE_COST_USD": 1704.30, # 23 * $74.10
                "NET_VALUE_USD": 1600.60,
                "DECISION_THRESHOLD": 0.50,
                "PRECISION_AT_THRESHOLD": 0.887,
                "RECALL_AT_THRESHOLD": 0.861
            }
        ]
    
    def get_profit_curves(self, model_name: str = "GHOST_CYCLE_DETECTOR", site_id: str = None) -> List[Dict[str, Any]]:
        """
        Get profit curves showing expected value at different thresholds.
        Helps determine optimal alert threshold for business value.
        """
        site_clause = f"AND SITE_ID = '{site_id}'" if site_id else "AND SITE_ID IS NULL"
        
        sql = f"""
        SELECT 
            MODEL_NAME,
            SITE_ID,
            PROBABILITY_THRESHOLD,
            EXPECTED_TP_RATE,
            EXPECTED_FP_RATE,
            EXPECTED_PRECISION,
            EXPECTED_DAILY_SAVINGS_USD,
            EXPECTED_DAILY_COSTS_USD,
            EXPECTED_DAILY_MISSED_USD,
            EXPECTED_NET_DAILY_VALUE_USD,
            IS_OPTIMAL_THRESHOLD
        FROM {self.database}.ML.PROFIT_CURVES
        WHERE MODEL_NAME = '{model_name}'
          {site_clause}
        ORDER BY PROBABILITY_THRESHOLD ASC
        """
        try:
            results = self.execute_query(sql)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Could not fetch profit curves: {e}")
        
        # Fallback demo data - profit curve for ghost cycle detector
        return [
            {"MODEL_NAME": model_name, "SITE_ID": site_id, "PROBABILITY_THRESHOLD": 0.1,
             "EXPECTED_TP_RATE": 0.98, "EXPECTED_FP_RATE": 0.42, "EXPECTED_PRECISION": 0.45,
             "EXPECTED_DAILY_SAVINGS_USD": 485.0, "EXPECTED_DAILY_COSTS_USD": 472.5, "EXPECTED_DAILY_MISSED_USD": 14.8,
             "EXPECTED_NET_DAILY_VALUE_USD": -2.3, "IS_OPTIMAL_THRESHOLD": False},
            {"MODEL_NAME": model_name, "SITE_ID": site_id, "PROBABILITY_THRESHOLD": 0.2,
             "EXPECTED_TP_RATE": 0.95, "EXPECTED_FP_RATE": 0.28, "EXPECTED_PRECISION": 0.58,
             "EXPECTED_DAILY_SAVINGS_USD": 469.0, "EXPECTED_DAILY_COSTS_USD": 315.0, "EXPECTED_DAILY_MISSED_USD": 37.1,
             "EXPECTED_NET_DAILY_VALUE_USD": 116.9, "IS_OPTIMAL_THRESHOLD": False},
            {"MODEL_NAME": model_name, "SITE_ID": site_id, "PROBABILITY_THRESHOLD": 0.3,
             "EXPECTED_TP_RATE": 0.92, "EXPECTED_FP_RATE": 0.18, "EXPECTED_PRECISION": 0.68,
             "EXPECTED_DAILY_SAVINGS_USD": 454.0, "EXPECTED_DAILY_COSTS_USD": 202.5, "EXPECTED_DAILY_MISSED_USD": 59.3,
             "EXPECTED_NET_DAILY_VALUE_USD": 192.2, "IS_OPTIMAL_THRESHOLD": False},
            {"MODEL_NAME": model_name, "SITE_ID": site_id, "PROBABILITY_THRESHOLD": 0.4,
             "EXPECTED_TP_RATE": 0.89, "EXPECTED_FP_RATE": 0.12, "EXPECTED_PRECISION": 0.76,
             "EXPECTED_DAILY_SAVINGS_USD": 439.0, "EXPECTED_DAILY_COSTS_USD": 135.0, "EXPECTED_DAILY_MISSED_USD": 81.5,
             "EXPECTED_NET_DAILY_VALUE_USD": 222.5, "IS_OPTIMAL_THRESHOLD": False},
            {"MODEL_NAME": model_name, "SITE_ID": site_id, "PROBABILITY_THRESHOLD": 0.5,
             "EXPECTED_TP_RATE": 0.86, "EXPECTED_FP_RATE": 0.08, "EXPECTED_PRECISION": 0.82,
             "EXPECTED_DAILY_SAVINGS_USD": 424.0, "EXPECTED_DAILY_COSTS_USD": 90.0, "EXPECTED_DAILY_MISSED_USD": 103.7,
             "EXPECTED_NET_DAILY_VALUE_USD": 230.3, "IS_OPTIMAL_THRESHOLD": True},  # OPTIMAL
            {"MODEL_NAME": model_name, "SITE_ID": site_id, "PROBABILITY_THRESHOLD": 0.6,
             "EXPECTED_TP_RATE": 0.82, "EXPECTED_FP_RATE": 0.05, "EXPECTED_PRECISION": 0.87,
             "EXPECTED_DAILY_SAVINGS_USD": 405.0, "EXPECTED_DAILY_COSTS_USD": 56.3, "EXPECTED_DAILY_MISSED_USD": 133.4,
             "EXPECTED_NET_DAILY_VALUE_USD": 215.3, "IS_OPTIMAL_THRESHOLD": False},
            {"MODEL_NAME": model_name, "SITE_ID": site_id, "PROBABILITY_THRESHOLD": 0.7,
             "EXPECTED_TP_RATE": 0.76, "EXPECTED_FP_RATE": 0.03, "EXPECTED_PRECISION": 0.91,
             "EXPECTED_DAILY_SAVINGS_USD": 375.0, "EXPECTED_DAILY_COSTS_USD": 33.8, "EXPECTED_DAILY_MISSED_USD": 177.8,
             "EXPECTED_NET_DAILY_VALUE_USD": 163.4, "IS_OPTIMAL_THRESHOLD": False},
            {"MODEL_NAME": model_name, "SITE_ID": site_id, "PROBABILITY_THRESHOLD": 0.8,
             "EXPECTED_TP_RATE": 0.68, "EXPECTED_FP_RATE": 0.01, "EXPECTED_PRECISION": 0.95,
             "EXPECTED_DAILY_SAVINGS_USD": 336.0, "EXPECTED_DAILY_COSTS_USD": 11.3, "EXPECTED_DAILY_MISSED_USD": 237.0,
             "EXPECTED_NET_DAILY_VALUE_USD": 87.7, "IS_OPTIMAL_THRESHOLD": False},
            {"MODEL_NAME": model_name, "SITE_ID": site_id, "PROBABILITY_THRESHOLD": 0.9,
             "EXPECTED_TP_RATE": 0.55, "EXPECTED_FP_RATE": 0.005, "EXPECTED_PRECISION": 0.98,
             "EXPECTED_DAILY_SAVINGS_USD": 272.0, "EXPECTED_DAILY_COSTS_USD": 5.6, "EXPECTED_DAILY_MISSED_USD": 333.5,
             "EXPECTED_NET_DAILY_VALUE_USD": -67.1, "IS_OPTIMAL_THRESHOLD": False},
        ]
    
    def get_site_cost_summary(self, model_name: str = None) -> List[Dict[str, Any]]:
        """Get cost rollup by site."""
        where_clause = f"WHERE MODEL_NAME = '{model_name}'" if model_name else ""
        
        sql = f"""
        SELECT 
            MODEL_NAME,
            SITE_ID,
            SITE_NAME,
            PERIOD_TYPE,
            TOTAL_TRUE_POSITIVES,
            TOTAL_FALSE_POSITIVES,
            TOTAL_FALSE_NEGATIVES,
            TOTAL_SAVINGS_USD,
            TOTAL_FP_COSTS_USD,
            TOTAL_FN_COSTS_USD,
            NET_VALUE_USD,
            DETECTION_RATE,
            PRECISION_RATE
        FROM {self.database}.ML.V_SITE_COST_SUMMARY
        {where_clause}
        ORDER BY NET_VALUE_USD DESC
        """
        try:
            results = self.execute_query(sql)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Could not fetch site cost summary: {e}")
        return []
    
    def get_portfolio_cost_summary(self, model_name: str = None) -> Dict[str, Any]:
        """Get portfolio-level cost rollup."""
        where_clause = f"WHERE MODEL_NAME = '{model_name}'" if model_name else ""
        
        sql = f"""
        SELECT 
            MODEL_NAME,
            PORTFOLIO_SAVINGS_USD,
            PORTFOLIO_FP_COSTS_USD,
            PORTFOLIO_FN_COSTS_USD,
            PORTFOLIO_NET_VALUE_USD,
            PROJECTED_ANNUAL_VALUE_USD,
            PORTFOLIO_DETECTION_RATE,
            TOTAL_TRUE_POSITIVES,
            TOTAL_FALSE_POSITIVES,
            TOTAL_FALSE_NEGATIVES
        FROM {self.database}.ML.V_PORTFOLIO_COST_SUMMARY
        {where_clause}
        """
        try:
            results = self.execute_query(sql)
            if results:
                return results[0]
        except Exception as e:
            logger.warning(f"Could not fetch portfolio summary: {e}")
        
        # Fallback
        return {
            "MODEL_NAME": model_name or "GHOST_CYCLE_DETECTOR",
            "PORTFOLIO_SAVINGS_USD": 42084.80,
            "PORTFOLIO_FP_COSTS_USD": 2430.00,
            "PORTFOLIO_FN_COSTS_USD": 20449.60,
            "PORTFOLIO_NET_VALUE_USD": 19205.20,
            "PROJECTED_ANNUAL_VALUE_USD": 230462.40,
            "PORTFOLIO_DETECTION_RATE": 0.861,
            "TOTAL_TRUE_POSITIVES": 1704,
            "TOTAL_FALSE_POSITIVES": 216,
            "TOTAL_FALSE_NEGATIVES": 276
        }
    
    def get_optimal_thresholds(self, model_name: str = None) -> List[Dict[str, Any]]:
        """Get optimal decision thresholds by site/model."""
        where_clause = f"WHERE MODEL_NAME = '{model_name}'" if model_name else ""
        
        sql = f"""
        SELECT 
            MODEL_NAME,
            SITE_ID,
            SITE_NAME,
            OPTIMAL_THRESHOLD,
            EXPECTED_DAILY_VALUE,
            EXPECTED_ANNUAL_VALUE,
            DETECTION_RATE_AT_OPTIMAL,
            FALSE_ALARM_RATE_AT_OPTIMAL
        FROM {self.database}.ML.V_OPTIMAL_THRESHOLDS
        {where_clause}
        """
        try:
            results = self.execute_query(sql)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Could not fetch optimal thresholds: {e}")
        return []
    
    def close(self):
        """Close the connection"""
        if self._session:
            self._session.close()
        if self._connection:
            try:
                self._connection.close()
            except:
                pass


# Singleton instance
_snowflake_service: Optional[SnowflakeServiceSPCS] = None


def get_snowflake_service() -> SnowflakeServiceSPCS:
    """Get or create Snowflake service singleton"""
    global _snowflake_service
    if _snowflake_service is None:
        connection_name = os.environ.get("SNOWFLAKE_CONNECTION_NAME", "my_snowflake")
        _snowflake_service = SnowflakeServiceSPCS(connection_name=connection_name)
    return _snowflake_service
