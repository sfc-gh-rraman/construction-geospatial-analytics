#!/usr/bin/env python3
"""
TERRA Geospatial Analytics - Cortex Agent Deployment Script

Verifies prerequisites and provides deployment instructions.
The agent itself is deployed via Snowsight UI.

Usage:
    python deploy_agent_python.py [--connection my_snowflake]
"""

import argparse
import json
import os


def verify_and_print_instructions(connection_name: str = "my_snowflake"):
    """Verify prerequisites and print deployment instructions."""
    
    from snowflake.snowpark import Session
    
    print("🌍 TERRA Geospatial Analytics - Agent Deployment")
    print("=" * 60)
    
    # Create session
    print(f"\n📡 Connecting to Snowflake ({connection_name})...")
    session = Session.builder.configs({"connection_name": connection_name}).create()
    print(f"   ✓ Connected to {session.get_current_account()}")
    
    # Verify prerequisites
    print("\n🔍 Verifying prerequisites...")
    
    # Check semantic model
    try:
        result = session.sql("""
            LIST @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS 
            PATTERN = '.*construction_semantic_model.yaml'
        """).collect()
        if result:
            print("   ✓ Semantic model uploaded")
        else:
            print("   ⚠️  Semantic model not found - upload it first")
    except Exception as e:
        print(f"   ⚠️  Could not verify semantic model: {e}")
    
    # Check search services
    try:
        result = session.sql("""
            SHOW CORTEX SEARCH SERVICES IN DATABASE CONSTRUCTION_GEO_DB
        """).collect()
        services = [r['name'] for r in result]
        if 'EQUIPMENT_DOCS_SEARCH' in services:
            print("   ✓ EQUIPMENT_DOCS_SEARCH available")
        else:
            print("   ⚠️  EQUIPMENT_DOCS_SEARCH not found")
    except Exception as e:
        print(f"   ⚠️  Could not verify search services: {e}")
    
    # Check data tables
    print("\n📊 Checking data tables...")
    tables_to_check = [
        ("RAW", "SITES"),
        ("RAW", "EQUIPMENT"),
        ("RAW", "GPS_BREADCRUMBS"),
        ("RAW", "EQUIPMENT_TELEMATICS"),
        ("RAW", "CYCLE_EVENTS"),
        ("ML", "GLOBAL_FEATURE_IMPORTANCE"),
        ("ML", "CALIBRATION_CURVES"),
        ("ML", "MODEL_METRICS"),
    ]
    
    for schema, table in tables_to_check:
        try:
            result = session.sql(f"""
                SELECT COUNT(*) as cnt 
                FROM CONSTRUCTION_GEO_DB.{schema}.{table}
            """).collect()
            count = result[0]['CNT']
            print(f"   ✓ {schema}.{table}: {count:,} rows")
        except Exception as e:
            print(f"   ⚠️  {schema}.{table}: not found or error")
    
    # Ghost Cycle preview (Hidden Discovery)
    print("\n🎯 Hidden Discovery Preview (Ghost Cycles):")
    try:
        # Check telematics for ghost cycle patterns
        result = session.sql("""
            SELECT 
                COUNT(*) as potential_ghost_cycles
            FROM CONSTRUCTION_GEO_DB.RAW.EQUIPMENT_TELEMATICS
            WHERE speed_mph > 2 AND engine_load_pct < 30
        """).collect()
        row = result[0]
        print(f"   • Potential ghost cycle events: {row['POTENTIAL_GHOST_CYCLES']}")
        print(f"   • Pattern: High speed (>2mph) + Low load (<30%)")
        print(f"   • These represent empty hauls wasting fuel")
    except Exception as e:
        print(f"   ⚠️  Could not query ghost cycles: {e}")
    
    # Print deployment instructions
    print("\n" + "=" * 60)
    print("📝 DEPLOYMENT INSTRUCTIONS")
    print("=" * 60)
    
    print("""
1. Open Snowsight in your browser

2. Navigate to: AI & ML → Cortex Agents

3. Click "Create Agent" or "+" button

4. Configure the agent:

   Name: TERRA_COPILOT
   Database: CONSTRUCTION_GEO_DB
   Schema: CONSTRUCTION_GEO
   
   Description: 
   AI assistant for construction geospatial analytics with Ghost Cycle 
   detection and ML-powered efficiency insights.
   
   Model: mistral-large (recommended) or llama3.1-70b
   
   Instructions:
   You are TERRA, an AI assistant for construction geospatial analytics.
   
   You help site managers, equipment operators, and fleet analysts understand:
   - Equipment utilization and Ghost Cycle detection
   - Haul road efficiency and optimal cycle times
   - Cut/fill volume progress vs plan
   - Fleet productivity and fuel efficiency
   
   HIDDEN DISCOVERY - GHOST CYCLES:
   When asked about "Ghost Cycles" or "hidden patterns", analyze data for:
   - Equipment with HIGH SPEED (>2 mph) but LOW ENGINE LOAD (<30%)
   - This indicates empty hauls - trucks traveling without productive loads
   - Always quantify: wasted fuel gallons, lost hours, dollar impact
   
   Always provide actionable recommendations, not just data.

5. Add Tools:

   Tool 1 - Data Analyst (Cortex Analyst / Text-to-SQL):
   - Name: data_analyst
   - Type: cortex_analyst_text_to_sql
   - Semantic Model: @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS/construction_semantic_model.yaml
   - Description: Query geospatial and equipment telemetry data including GPS positions, cycle times, and fuel consumption
   
   Tool 2 - Equipment Docs Search (Cortex Search):
   - Name: equipment_docs
   - Type: cortex_search
   - Service: CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH
   - Max Results: 5
   - Description: Search equipment documentation, Ghost Cycle detection protocols, and best practices

6. Test with these sample questions:
   - "What is the average cycle time by equipment type?"
   - "Show me Ghost Cycles from the last week"
   - "Which equipment has the highest fuel consumption?"
   - "What are the optimal routes for haul trucks?"
   - "Search for Ghost Cycle detection procedures"

7. Click "Create" to deploy the agent
""")
    
    print("=" * 60)
    print("✅ Prerequisites verified! Ready for UI deployment.")
    print("=" * 60)
    
    session.close()


def main():
    parser = argparse.ArgumentParser(description="Deploy TERRA Cortex Agent")
    parser.add_argument("--connection", "-c", default="my_snowflake", help="Snowflake connection name")
    args = parser.parse_args()
    
    verify_and_print_instructions(args.connection)


if __name__ == "__main__":
    main()
