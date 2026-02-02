"""
Snowflake Service - SPCS Compatible Version for Construction Geospatial
Uses Snowpark Session for SPCS (auto-detects environment).
Falls back to CLI for local development.
"""

import json
import os
import subprocess
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# Check if running inside SPCS
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
    Service for interacting with Snowflake for Construction Geospatial Analytics.
    Automatically detects SPCS environment and uses appropriate connection method.
    """
    
    def __init__(self, connection_name: str = "demo"):
        self.connection_name = connection_name
        self.database = "CONSTRUCTION_GEO_DB"
        self.schema = "CONSTRUCTION_GEO"
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
            
        except Exception as e:
            import traceback
            print(f"[SPCS] Failed to establish Snowpark Session: {e}", flush=True)
            traceback.print_exc()
            logger.error(f"Failed to establish Snowpark Session: {e}")
            self._init_connector_fallback()
    
    def _init_connector_fallback(self):
        """Fallback to connector if Snowpark fails"""
        try:
            import snowflake.connector
            
            token_path = "/snowflake/session/token"
            token = ""
            if os.path.exists(token_path):
                with open(token_path, "r") as f:
                    token = f.read().strip()
            
            warehouse = os.environ.get("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH")
            
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
        except Exception as e:
            print(f"[SPCS] Connector fallback failed: {e}", flush=True)
            logger.error(f"Connector fallback also failed: {e}")
    
    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Execute a SQL query and return results as list of dicts"""
        if self.is_spcs:
            return self._execute_query_snowpark(query)
        else:
            return self._execute_query_cli(query)
    
    def _execute_query_snowpark(self, query: str) -> List[Dict[str, Any]]:
        """Execute query using Snowpark Session (SPCS)"""
        print(f"[QUERY] Executing: {query[:200]}...", flush=True)
        
        try:
            if self._session:
                df = self._session.sql(query)
                rows = df.collect()
                if not rows:
                    return []
                
                results = []
                for row in rows:
                    row_dict = row.asDict()
                    for key, value in row_dict.items():
                        if hasattr(value, 'isoformat'):
                            row_dict[key] = value.isoformat()
                    results.append(row_dict)
                
                return results
            elif self._connection:
                cursor = self._connection.cursor()
                cursor.execute(query)
                columns = [desc[0] for desc in cursor.description] if cursor.description else []
                rows = cursor.fetchall()
                
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
                return results
            else:
                logger.error("No SPCS connection available")
                return []
                
        except Exception as e:
            print(f"[QUERY] EXCEPTION: {e}", flush=True)
            logger.error(f"SPCS query failed: {e}")
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
    # Document Search Methods
    # =========================================================================
    
    def search_documents(
        self, 
        query: str, 
        limit: int = 5,
        document_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search safety plans and geotechnical reports using Cortex Search"""
        filter_clause = ""
        if document_type:
            filter_clause = f', "filter": {{"@eq": {{"DOCUMENT_TYPE": "{document_type}"}}}}'
        
        escaped_query = query.replace('"', '\\"').replace("'", "''")
        
        sql = f"""
        SELECT SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
            '{self.database}.{self.schema}.DOCUMENT_SEARCH_SERVICE',
            '{{"query": "{escaped_query}", "columns": ["DOCUMENT_TYPE", "TITLE", "SITE_ID", "CONTENT"], "limit": {limit}{filter_clause}}}'
        ) as RESULT
        """
        
        try:
            if self.is_spcs and self._connection:
                cursor = self._connection.cursor()
                cursor.execute(sql)
                row = cursor.fetchone()
                cursor.close()
                
                if row and row[0]:
                    result = json.loads(row[0]) if isinstance(row[0], str) else row[0]
                    return result.get("results", [])
                return []
            elif self.is_spcs and self._session:
                df = self._session.sql(sql)
                rows = df.collect()
                if rows and rows[0][0]:
                    result = json.loads(rows[0][0]) if isinstance(rows[0][0], str) else rows[0][0]
                    return result.get("results", [])
                return []
            else:
                return self._search_documents_cli(sql)
        except Exception as e:
            logger.error(f"Document search failed: {e}")
            return []
    
    def _search_documents_cli(self, sql: str) -> List[Dict[str, Any]]:
        """Execute Cortex Search using CLI"""
        try:
            cmd = [self.snow_path, "sql", "-c", self.connection_name, "-q", sql]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                return []
            
            # Parse output (similar to drilling_ops pattern)
            output = result.stdout
            lines = output.split('\n')
            
            json_parts = []
            in_data_section = False
            past_header = False
            
            for line in lines:
                if line.startswith('+--'):
                    if in_data_section and past_header:
                        break
                    in_data_section = True
                    continue
                    
                if in_data_section and line.startswith('|'):
                    if 'RESULT' in line and not past_header:
                        past_header = True
                        continue
                    if line.startswith('|--'):
                        continue
                    if past_header:
                        content = line[1:-1].strip() if line.endswith('|') else line[1:].strip()
                        json_parts.append(content)
            
            json_str = ''.join(json_parts)
            
            if not json_str or not json_str.startswith('{'):
                return []
            
            data = json.loads(json_str)
            return data.get("results", [])
            
        except Exception as e:
            logger.error(f"Document search failed: {e}")
            return []
    
    def call_cortex_llm(
        self, 
        prompt: str, 
        model: str = "mistral-large2"
    ) -> str:
        """Call Cortex LLM for text generation"""
        escaped_prompt = prompt.replace("'", "''").replace("\\", "\\\\")
        
        sql = f"""
        SELECT SNOWFLAKE.CORTEX.COMPLETE(
            '{model}',
            '{escaped_prompt}'
        ) as RESPONSE
        """
        
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
    # Construction-Specific Data Query Methods
    # =========================================================================
    
    def get_equipment_telemetry(self, site_id: str) -> List[Dict[str, Any]]:
        """Get current GPS and telematics for all equipment at a site"""
        sql = f"""
        WITH latest AS (
            SELECT 
                g.EQUIPMENT_ID,
                g.LATITUDE,
                g.LONGITUDE,
                g.SPEED_MPH,
                t.ENGINE_LOAD_PERCENT,
                t.FUEL_RATE_GPH,
                t.PAYLOAD_TONS,
                ROW_NUMBER() OVER (PARTITION BY g.EQUIPMENT_ID ORDER BY g.TIMESTAMP DESC) as rn
            FROM {self.database}.RAW.GPS_BREADCRUMBS g
            JOIN {self.database}.RAW.EQUIPMENT_TELEMATICS t
              ON g.EQUIPMENT_ID = t.EQUIPMENT_ID 
              AND g.TIMESTAMP = t.TIMESTAMP
            WHERE g.SITE_ID = '{site_id}'
        )
        SELECT 
            EQUIPMENT_ID as equipment_id,
            LATITUDE as latitude,
            LONGITUDE as longitude,
            SPEED_MPH as speed_mph,
            ENGINE_LOAD_PERCENT as engine_load_pct,
            FUEL_RATE_GPH as fuel_rate_gph,
            PAYLOAD_TONS as payload_tons
        FROM latest
        WHERE rn = 1
        """
        return self.execute_query(sql)
    
    def get_fleet_summary(self, site_id: str) -> Dict[str, Any]:
        """Get fleet summary for a site"""
        sql = f"""
        SELECT 
            COUNT(DISTINCT EQUIPMENT_ID) as active_count,
            COUNT(*) as cycles_today,
            ROUND(SUM(LOAD_VOLUME_YD3), 0) as volume_today,
            ROUND(AVG(CYCLE_TIME_MINUTES), 1) as avg_cycle_time
        FROM {self.database}.RAW.CYCLE_EVENTS
        WHERE SITE_ID = '{site_id}'
          AND DATE(CYCLE_START) = CURRENT_DATE()
        """
        results = self.execute_query(sql)
        return results[0] if results else {}
    
    def get_cycle_analysis(self, site_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get cycle time analysis"""
        where_clause = f"WHERE SITE_ID = '{site_id}'" if site_id else ""
        
        sql = f"""
        SELECT 
            LOAD_LOCATION,
            DUMP_LOCATION,
            COUNT(*) as cycle_count,
            ROUND(AVG(CYCLE_TIME_MINUTES), 1) as avg_cycle_time,
            ROUND(MIN(CYCLE_TIME_MINUTES), 1) as min_cycle_time,
            ROUND(MAX(CYCLE_TIME_MINUTES), 1) as max_cycle_time,
            ROUND(SUM(LOAD_VOLUME_YD3), 0) as total_volume
        FROM {self.database}.RAW.CYCLE_EVENTS
        {where_clause}
        GROUP BY LOAD_LOCATION, DUMP_LOCATION
        ORDER BY cycle_count DESC
        LIMIT 10
        """
        return self.execute_query(sql)
    
    def get_ghost_cycle_predictions(self, site_id: str) -> List[Dict[str, Any]]:
        """Get recent Ghost Cycle predictions from ML model"""
        sql = f"""
        SELECT 
            EQUIPMENT_ID,
            TIMESTAMP,
            GPS_SPEED_MPH,
            ENGINE_LOAD_PCT,
            GHOST_PROBABILITY,
            ESTIMATED_FUEL_WASTE_GAL
        FROM {self.database}.ML.GHOST_CYCLE_PREDICTIONS
        WHERE SITE_ID = '{site_id}'
          AND IS_GHOST_CYCLE = TRUE
          AND TIMESTAMP >= DATEADD(hour, -1, CURRENT_TIMESTAMP())
        ORDER BY TIMESTAMP DESC
        LIMIT 20
        """
        return self.execute_query(sql)
    
    def direct_sql_query(self, question: str) -> Dict[str, Any]:
        """Handle common analytical questions with direct SQL"""
        question_lower = question.lower()
        
        sql = None
        explanation = ""
        
        if "how many" in question_lower and "equipment" in question_lower:
            sql = f"SELECT COUNT(DISTINCT EQUIPMENT_ID) as equipment_count FROM {self.database}.RAW.GPS_BREADCRUMBS"
            explanation = "Counting distinct equipment with GPS data"
        
        elif "how many" in question_lower and "cycle" in question_lower:
            sql = f"SELECT COUNT(*) as cycle_count FROM {self.database}.RAW.CYCLE_EVENTS"
            explanation = "Counting total cycles"
        
        elif "average" in question_lower and "cycle" in question_lower:
            sql = f"""
            SELECT ROUND(AVG(CYCLE_TIME_MINUTES), 1) as avg_cycle_time_minutes
            FROM {self.database}.RAW.CYCLE_EVENTS
            WHERE CYCLE_TIME_MINUTES BETWEEN 5 AND 60
            """
            explanation = "Calculating average cycle time"
        
        elif "total" in question_lower and "volume" in question_lower:
            sql = f"SELECT ROUND(SUM(LOAD_VOLUME_YD3), 0) as total_volume_yd3 FROM {self.database}.RAW.CYCLE_EVENTS"
            explanation = "Calculating total volume moved"
        
        elif "site" in question_lower and ("list" in question_lower or "show" in question_lower):
            sql = f"SELECT DISTINCT SITE_ID FROM {self.database}.RAW.GPS_BREADCRUMBS ORDER BY SITE_ID"
            explanation = "Listing all sites"
        
        if sql:
            try:
                results = self.execute_query(sql)
                return {
                    "sql": sql,
                    "results": results,
                    "explanation": explanation
                }
            except Exception as e:
                logger.error(f"Direct SQL query failed: {e}")
                return {"error": str(e), "sql": sql, "results": []}
        
        return {"error": "Could not understand the question", "sql": None, "results": []}
    
    def close(self):
        """Close the connection"""
        if self._session:
            self._session.close()
        if self._connection and not self._connection.is_closed():
            self._connection.close()


# Singleton instance
_snowflake_service: Optional[SnowflakeServiceSPCS] = None


def get_snowflake_service() -> SnowflakeServiceSPCS:
    """Get or create Snowflake service singleton"""
    global _snowflake_service
    if _snowflake_service is None:
        _snowflake_service = SnowflakeServiceSPCS()
    return _snowflake_service
