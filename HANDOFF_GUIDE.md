# TERRA - Handoff Guide

## Overview

TERRA is a construction site intelligence platform that reveals hidden inefficiencies in earthwork operations. This guide covers everything needed to understand, run, and extend the application.

## Quick Reference

| Component | Location | Technology |
|-----------|----------|------------|
| Frontend | `copilot/frontend/` | React + TypeScript + Tailwind |
| Backend | `copilot/backend/` | FastAPI + Python 3.11 |
| DDL | `ddl/` | Snowflake SQL |
| Deployment | `copilot/deploy/` | Docker + SPCS |
| Sample Data | `scripts/` | Python + Pandas |

## Architecture Summary

```
User → React UI → FastAPI → Agent Orchestrator → Snowflake/Cortex
                     ↓
              ┌──────┴──────┐
              │  Agents     │
              ├─────────────┤
              │ Historian   │ → Cortex Search (documents)
              │ RouteAdvisor│ → GPS Analysis (choke points)
              │ Watchdog    │ → Telematics (Ghost Cycles)
              └─────────────┘
```

## The Core Innovation: Ghost Cycle Detection

**What makes this demo unique:**

Traditional fleet management shows equipment as "active" if it's moving. TERRA correlates GPS data with engine telematics to reveal the truth:

```python
# Ghost Cycle Detection Logic
is_ghost_cycle = (
    gps_speed > 2 mph AND          # Equipment is moving
    engine_load < 30%               # But engine is basically idling
)
```

This reveals equipment "coasting" in traffic queues - burning fuel without productive work.

## Key Files to Understand

### Frontend (React)

| File | Purpose |
|------|---------|
| `App.tsx` | Main routing and page selection |
| `pages/SiteCommand.tsx` | Primary view with chat interface |
| `pages/HaulRoadAnalytics.tsx` | **KEY** - Ghost Cycle visualization |
| `components/Chat.tsx` | AI copilot chat interface |
| `styles/globals.css` | Design system with animations |

### Backend (FastAPI)

| File | Purpose |
|------|---------|
| `api/main.py` | API endpoints and WebSocket |
| `agents/orchestrator.py` | Routes queries to specialized agents |
| `agents/watchdog.py` | **KEY** - Ghost Cycle detection |
| `agents/route_advisor.py` | Choke point analysis |
| `services/snowflake_service_spcs.py` | **CRITICAL** - SPCS-compatible connection |

### Data Layer

| File | Purpose |
|------|---------|
| `ddl/002_raw_tables.sql` | Core data tables |
| `ddl/003_data_mart.sql` | **KEY** - Ghost Cycle and Choke Point views |
| `cortex/construction_semantic_model.yaml` | Cortex Analyst configuration |

## SPCS Connection Pattern

**CRITICAL:** In SPCS, Snowpark Session does NOT work. Use this pattern:

```python
# From services/snowflake_service_spcs.py

class SnowflakeServiceSPCS:
    def _init_connector_fallback(self):
        """SPCS connection using oauth token"""
        import snowflake.connector
        
        token_path = "/snowflake/session/token"
        with open(token_path, "r") as f:
            token = f.read().strip()
        
        self._connection = snowflake.connector.connect(
            host=os.environ.get("SNOWFLAKE_HOST"),
            account=os.environ.get("SNOWFLAKE_ACCOUNT"),
            authenticator="oauth",
            token=token,
            database=self.database,
            schema=self.schema,
            warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE")
        )
```

## Frontend API Pattern

**CRITICAL:** Use relative URLs for API calls:

```typescript
// ✅ CORRECT - works in both local dev and SPCS
const res = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: input })
})

// ❌ WRONG - breaks in SPCS
const res = await fetch('http://localhost:8000/api/chat', ...)
```

## Demo Script

### Opening (30 seconds)
"This is TERRA - our construction site intelligence platform. It monitors 7 active sites, 152 equipment units, and 2.4 million GPS points."

### Hook - The Hidden Problem (1 minute)
"Your cycle times look fine. Equipment reports show everyone active. But look at this..."

*Navigate to Haul Road Analytics*

"See this pattern? GPS shows trucks moving at 4 mph, but engine load is only 22%. These trucks appear active but are burning fuel while stuck in traffic. We call these **Ghost Cycles**."

### The "Wow" Moment (1 minute)
"Now watch this correlation chart. When GPS speed and engine load diverge, that's wasted money - $340 in fuel today from just three trucks."

*Point to Stockpile B Intersection*

"And here's why: This intersection is causing 12-minute delays. The fix? Move the stockpile 50 meters east. That's $1,200 saved every day."

### AI Copilot Demo (1 minute)
*Navigate to Site Command, type in chat:*

"Show me ghost cycles from today"

*System responds with detailed analysis*

"The AI correlates GPS breadcrumbs with engine telematics to find these patterns automatically."

### Close (30 seconds)
"This is the power of geospatial analytics on Snowflake - revealing insights that traditional fleet management misses."

## Common Issues & Solutions

### Frontend won't start
```bash
cd copilot/frontend
rm -rf node_modules
npm install
npm run dev
```

### Backend can't connect to Snowflake (local)
- Ensure `snow` CLI is installed and configured
- Backend falls back to demo mode if Snowflake unavailable

### SPCS deployment fails
1. Check compute pool exists
2. Verify image repository permissions
3. Review service logs:
```sql
SELECT * FROM TABLE(terra_service!GET_SERVICE_LOGS('terra', 0, 50));
```

### Chat returns demo responses
- This is expected when Snowflake connection unavailable
- Demo responses show the expected format

## Extending the Application

### Adding a New Agent

1. Create `copilot/backend/agents/new_agent.py`:
```python
from .base import BaseAgent

class NewAgent(BaseAgent):
    def __init__(self):
        super().__init__("new_agent", "Description")
    
    async def process(self, query: str, context=None):
        # Implement your logic
        return {"response": "...", "sources": [...]}
```

2. Register in `orchestrator.py`:
```python
self.new_agent = NewAgent()
# Add to intent patterns and routing
```

### Adding a New Page

1. Create `copilot/frontend/src/pages/NewPage.tsx`
2. Export in `pages/index.ts`
3. Add to `App.tsx` routing
4. Add to `Layout.tsx` navigation

### Adding New Data

1. Add table to `ddl/002_raw_tables.sql`
2. Add views to `ddl/003_data_mart.sql`
3. Update semantic model in `cortex/`
4. Add API endpoint in `api/main.py`

## Contacts

For questions about this demo, contact the AI Solutions team.

---

*Built on Snowflake Cortex AI*
