#!/usr/bin/env python3
"""
TERRA Cortex Agent Deployment Script

This script deploys the TERRA_COPILOT Cortex Agent programmatically.
Use this as an alternative to creating the agent via Snowsight UI.

Prerequisites:
- snowflake-snowpark-python >= 1.11.0
- Snowflake CLI configured with connection

Usage:
    python deploy_agent_python.py [--connection <name>]
"""

import argparse
import sys
import os

def deploy_agent(connection_name: str = None):
    """Deploy TERRA_COPILOT agent to Snowflake."""
    
    print("🌍 TERRA Agent Deployment Script")
    print("=" * 50)
    
    try:
        from snowflake.snowpark import Session
        from snowflake.core import Root
        from snowflake.core.cortex.agent import CortexAgent, CortexAgentTool
        print("✅ Snowflake SDK imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import Snowflake SDK: {e}")
        print("\nInstall with: pip install snowflake-snowpark-python>=1.11.0")
        sys.exit(1)
    
    # Create session
    print("\n📡 Connecting to Snowflake...")
    try:
        if connection_name:
            session = Session.builder.configs({"connection_name": connection_name}).create()
        else:
            # Try default connection from environment or config
            session = Session.builder.create()
        print(f"✅ Connected as: {session.get_current_user()}")
        print(f"   Account: {session.get_current_account()}")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        print("\nTry: python deploy_agent_python.py --connection <your_connection_name>")
        sys.exit(1)
    
    # Configuration
    DATABASE = "CONSTRUCTION_GEO_DB"
    SCHEMA = "CONSTRUCTION_GEO"
    AGENT_NAME = "TERRA_COPILOT"
    
    print(f"\n📦 Deploying agent: {DATABASE}.{SCHEMA}.{AGENT_NAME}")
    
    # Agent instructions
    instructions = """You are TERRA, an AI assistant for construction geospatial analytics.

You help site managers, equipment operators, and fleet analysts understand:
- Equipment utilization and Ghost Cycle detection
- Haul road efficiency and optimal cycle times
- Cut/fill volume progress vs plan
- Fleet productivity and fuel efficiency

HIDDEN DISCOVERY - GHOST CYCLES:
When asked about "Ghost Cycles", "hidden patterns", or "wasted fuel", analyze the data for:
- Equipment with HIGH SPEED (>2 mph) but LOW ENGINE LOAD (<30%)
- This indicates empty hauls - trucks traveling without productive loads
- Quantify impact: wasted fuel gallons, lost hours, dollar impact

Always provide:
1. The data/numbers requested
2. Context about what it means
3. Actionable recommendations"""

    # Define tools
    tools = [
        CortexAgentTool(
            tool_type="cortex_analyst_text_to_sql",
            name="data_analyst",
            spec={
                "semantic_model": f"@{DATABASE}.{SCHEMA}.SEMANTIC_MODELS/construction_semantic_model.yaml",
                "description": "Query geospatial and equipment telemetry data including GPS positions, cycle times, and fuel consumption"
            }
        ),
        CortexAgentTool(
            tool_type="cortex_search",
            name="equipment_docs",
            spec={
                "service": f"{DATABASE}.DOCS.EQUIPMENT_DOCS_SEARCH",
                "max_results": 5,
                "description": "Search equipment documentation, Ghost Cycle detection protocols, and best practices"
            }
        )
    ]
    
    # Create agent
    agent = CortexAgent(
        name=AGENT_NAME,
        description="AI assistant for construction geospatial analytics with Ghost Cycle detection",
        model="mistral-large",  # or "llama3.1-70b"
        instructions=instructions,
        tools=tools
    )
    
    try:
        root = Root(session)
        agents = root.databases[DATABASE].schemas[SCHEMA].cortex_agents
        
        # Check if agent already exists
        existing = list(agents.iter())
        if any(a.name == AGENT_NAME for a in existing):
            print(f"⚠️  Agent {AGENT_NAME} already exists. Replacing...")
            mode = "or_replace"
        else:
            print(f"🆕 Creating new agent: {AGENT_NAME}")
            mode = "if_not_exists"
        
        # Deploy
        agents.create(agent, mode=mode)
        print(f"✅ Agent {AGENT_NAME} deployed successfully!")
        
        # Grant permissions
        print("\n🔐 Granting permissions to TERRA_APP_ROLE...")
        session.sql(f"GRANT USAGE ON CORTEX AGENT {DATABASE}.{SCHEMA}.{AGENT_NAME} TO ROLE TERRA_APP_ROLE").collect()
        print("✅ Permissions granted")
        
    except Exception as e:
        print(f"❌ Failed to deploy agent: {e}")
        print("\nMake sure you have run FULL_SETUP.sql first!")
        sys.exit(1)
    
    # Verification
    print("\n" + "=" * 50)
    print("📋 VERIFICATION")
    print("=" * 50)
    
    try:
        result = session.sql(f"SHOW CORTEX AGENTS IN SCHEMA {DATABASE}.{SCHEMA}").collect()
        print(f"✅ Agents in schema: {len(result)}")
        for row in result:
            print(f"   - {row['name']}")
    except Exception as e:
        print(f"⚠️ Could not verify: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 DEPLOYMENT COMPLETE!")
    print("=" * 50)
    print(f"""
Next steps:
1. Test in Snowsight: AI & ML → Cortex Agents → {AGENT_NAME}
2. Ask: "What is the average cycle time by equipment type?"
3. Ask: "Show me Ghost Cycles"
4. Deploy SPCS: cd copilot/deploy && ./deploy.sh all
""")
    
    session.close()


def main():
    parser = argparse.ArgumentParser(
        description="Deploy TERRA_COPILOT Cortex Agent to Snowflake"
    )
    parser.add_argument(
        "--connection", "-c",
        help="Snowflake connection name (from ~/.snowflake/connections.toml)",
        default=None
    )
    
    args = parser.parse_args()
    deploy_agent(args.connection)


if __name__ == "__main__":
    main()
