# GROUNDTRUTH 🏗️

**Construction Site Intelligence Platform**

AI-powered copilot for construction earthwork operations, built on Snowflake with Cortex AI.

![Snowflake](https://img.shields.io/badge/Snowflake-29B5E8?style=flat&logo=snowflake&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)

## 🎯 Overview

GROUNDTRUTH reveals hidden inefficiencies in construction earthwork operations by correlating GPS telematics with operational data. The platform identifies **Ghost Cycles** - equipment that appears active but is burning fuel without productive work.

### Key Features

- **🔍 Ghost Cycle Detection** - Correlate GPS movement with engine load to find equipment idling while moving
- **🚧 Choke Point Analysis** - Identify haul road bottlenecks causing traffic queues
- **⛏️ Earthwork Progress** - Track cut/fill volumes against design plan
- **🤖 AI Co-Pilot** - Natural language interface powered by Cortex LLM
- **📊 Regional Overview** - Multi-site monitoring with real-time metrics

## 📁 Project Structure

```
construction_geospatial_analytics/
├── copilot/                    # Main application
│   ├── frontend/               # React + TypeScript + Tailwind
│   │   ├── src/
│   │   │   ├── pages/          # Application pages
│   │   │   ├── components/     # Reusable components
│   │   │   └── styles/         # Global styles
│   │   └── package.json
│   ├── backend/                # FastAPI + Python
│   │   ├── api/                # API endpoints
│   │   ├── agents/             # AI agent implementations
│   │   ├── services/           # Snowflake service layer
│   │   └── requirements.txt
│   └── deploy/                 # SPCS deployment configs
├── ddl/                        # Snowflake DDL scripts
├── cortex/                     # Cortex semantic model
├── scripts/                    # Data generation scripts
└── README.md
```

## 🎭 User Personas

| Persona | Role | Key Questions |
|---------|------|---------------|
| **Strategic** | VP of Operations | "Which sites are behind schedule?" |
| **Operational** | Site Superintendent | "Where are my choke points today?" |
| **Technical** | GIS Analyst | "Show me haul route efficiency by segment" |

## 🚀 Quick Start

### Local Development

```bash
# Start backend
cd copilot/backend
pip install -r requirements.txt
python -m uvicorn api.main:app --reload --port 8000

# Start frontend (in another terminal)
cd copilot/frontend
npm install
npm run dev
```

Access at: http://localhost:5173

### Deploy to SPCS

```bash
cd copilot/deploy
./deploy.sh all
```

See [DEPLOYMENT_GUIDE.md](copilot/deploy/DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🔮 The "Wow" Moment

**Choke Point Alert:** When showing the Haul Road Analytics page, the system reveals:

> "Stockpile B intersection is causing 12-minute delays per cycle. Relocating 50 meters east would save $1,200/day in fuel alone."

This insight comes from correlating GPS breadcrumbs with engine telematics - something not visible from cycle times alone.

## 👻 Hidden Discovery: Ghost Cycles

**What is a Ghost Cycle?**

Equipment appears "active" in traditional reports - GPS shows movement, and the unit is logged as operating. But GROUNDTRUTH correlates GPS speed with engine load to reveal the truth:

| Metric | Normal Haul | Ghost Cycle |
|--------|-------------|-------------|
| GPS Speed | 15-25 mph | 2-5 mph |
| Engine Load | 70-90% | 15-30% |
| Status | Working | Idling while moving |

**Impact:** 18% of "operating time" is actually Ghost Cycles, wasting ~$65,000/year in fuel per site.

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│  Landing │ Site Command │ Haul Road │ Earthwork │ Briefing │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    FastAPI Backend                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Agent Orchestrator                      │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────────────┐  │   │
│  │  │ Historian │ │ Route     │ │ Watchdog          │  │   │
│  │  │ Agent     │ │ Advisor   │ │ (Ghost Detection) │  │   │
│  │  └───────────┘ └───────────┘ └───────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     Snowflake                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ GPS Data    │ │ Volume      │ │ Cortex Services     │   │
│  │ 2.4M points │ │ Tracking    │ │ - Search            │   │
│  │             │ │             │ │ - LLM (Mistral)     │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Data Model

| Table | Description | Volume |
|-------|-------------|--------|
| GPS_BREADCRUMBS | Real-time equipment positions | 2.4M rows/month |
| EQUIPMENT_TELEMATICS | Engine metrics | 2.4M rows/month |
| CYCLE_EVENTS | Load/dump cycles | 50K rows/month |
| VOLUME_SURVEYS | Cut/fill measurements | 5K rows/month |
| SITE_DOCUMENTS | Geotech reports, safety plans | 200+ documents |

## 🤖 AI Agents

| Agent | Purpose | Cortex Service |
|-------|---------|----------------|
| **Orchestrator** | Routes queries to specialists | Intent Classification |
| **Historian** | Searches historical data | Cortex Search |
| **Route Advisor** | Analyzes haul road efficiency | Cortex Complete |
| **Watchdog** | Real-time monitoring, Ghost detection | Cortex Complete |

## 📈 Success Metrics

- **Fuel savings identified:** $65K+ annually per site
- **Cycle time reduction:** 5-7 minutes through choke point resolution
- **Volume tracking accuracy:** 98%+ vs traditional methods

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Recharts
- **Backend:** FastAPI, Python 3.11, Pydantic
- **Data:** Snowflake, Cortex AI (Search + LLM)
- **Deployment:** Snowpark Container Services (SPCS)

## 📄 License

Internal demo - not for distribution.

---

Built with ❄️ Snowflake Cortex AI
