# TERRA Geospatial Analytics - Cortex Agent Integration Guide

## 🎯 The Problem: Chat is Using Pre-Wired Fallbacks, NOT Real AI

When users ask questions in the chat, it **appears** to work but is actually using hardcoded pattern matching instead of Cortex Analyst/Search. Here's the evidence:

### Current Broken Flow

```
User asks question
    ↓
Frontend calls /api/chat/stream (tries Cortex Agent)
    ↓
If SPCS token error or not in SPCS → FALLBACK TRIGGERED
    ↓
Frontend calls /api/chat (local orchestrator)
    ↓
Orchestrator uses KEYWORD MATCHING, not AI!
    ↓
Returns pre-wired responses based on patterns like "ghost" → Ghost Cycle handler
```

### Where the Pre-Wired Logic Lives

| File | Problem |
|------|---------|
| `agents/orchestrator.py` | `_classify_intent()` uses regex patterns, not LLM |
| `agents/orchestrator.py` | Handlers like `_handle_ghost_cycle()` return formatted strings |
| `services/snowflake_service_spcs.py` | `direct_sql_query()` only handles 7 keyword patterns |
| `services/snowflake_service_spcs.py` | Mock data returned when DB queries fail |
| `api/main.py` | `/api/ml/hidden-pattern-analysis` returns hardcoded fallback |

---

## ✅ What We Did in ATLAS (Capital Delivery) That Works

In the ATLAS demo, we fixed this by ensuring:

1. **Cortex Agent is the primary path** - No silent fallbacks
2. **Real Cortex Analyst for text-to-SQL** - LLM generates SQL, not keyword matching
3. **Cortex Search for documents** - Semantic search, not `LIKE` queries
4. **Errors are visible** - Users see when AI isn't working, not fake responses

---

## 🛠️ Step-by-Step Fixes

### Step 1: Understand the Current Architecture

```
/api/chat/stream  →  cortex_agent_client.py  →  Cortex Agent REST API
                                                    ↓
                                              (if SPCS available)
                                                    ↓
                                              Cortex Analyst + Search tools
                                              
/api/chat  →  orchestrator.py  →  KEYWORD MATCHING (no AI!)
                  ↓
              _handle_ghost_cycle()  →  hardcoded response
              _handle_routing()       →  hardcoded response
              _handle_search()        →  SQL LIKE query (not semantic)
```

### Step 2: The cortex_agent_client.py is CORRECT ✅

Good news - your client is properly configured:

```python
# Line 27-30 of cortex_agent_client.py
self.database = os.environ.get("SNOWFLAKE_DATABASE", "CONSTRUCTION_GEO_DB")  # ✅ Correct
self.schema = "CONSTRUCTION_GEO"  # ✅ Correct  
self.agent_name = "TERRA_COPILOT"  # ✅ Correct
```

The message formatting is also correct (array of content objects).

### Step 3: The Problem is the FALLBACK Chain

In `Chat.tsx` (lines 275-325), when streaming fails:

```typescript
} catch (error) {
  console.log('Streaming failed, falling back to local:', error)
  
  // THIS IS THE PROBLEM - falls back to /api/chat which doesn't use AI!
  const response = await fetch('/api/chat', {
    method: 'POST',
    ...
  })
```

**Fix Option A: Remove Fallback Entirely**

```typescript
} catch (error) {
  console.error('Cortex Agent error:', error)
  
  // Show the actual error instead of silently using fallback
  setMessages(prev => prev.map(msg => 
    msg.id === assistantId 
      ? { 
          ...msg, 
          content: `⚠️ TERRA is not available in this environment.\n\nError: ${error.message}\n\nPlease ensure you're running in SPCS with the TERRA_COPILOT agent deployed.`,
          isStreaming: false 
        }
      : msg
  ))
}
```

**Fix Option B: Make /api/chat Use Cortex Analyst Too**

Modify `api/main.py` to use LLM text-to-SQL instead of the orchestrator:

```python
@app.post("/api/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """
    Send message to TERRA Co-Pilot - uses Cortex LLM for text-to-SQL.
    """
    try:
        sf = get_snowflake_service()
        
        # Use Cortex Analyst (LLM) instead of orchestrator
        result = sf.cortex_analyst_query(message.message)
        
        if result.get("data"):
            response = format_data_response(result["data"], result.get("sql"))
        else:
            response = result.get("answer", "I couldn't process that query.")
        
        return ChatResponse(
            response=response,
            sources=["Cortex Analyst"],
            context={"sql": result.get("sql")},
            intent="data_query"
        )
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

### Step 4: Add cortex_analyst_query to snowflake_service_spcs.py

This method uses Cortex Complete (LLM) to generate SQL:

```python
def cortex_analyst_query(self, question: str) -> Dict[str, Any]:
    """
    Use Cortex Complete LLM to generate SQL from natural language.
    This is the REAL AI approach, not keyword matching!
    """
    logger.info(f"Cortex Analyst query: {question[:100]}...")
    
    # Provide schema context to the LLM
    schema_context = f"""
    You are an expert SQL writer for Snowflake.
    Database: {self.database}
    Schema: CONSTRUCTION_GEO
    
    Tables:
    - PROJECT (PROJECT_ID, PROJECT_NAME, LATITUDE, LONGITUDE, STATUS)
    - ASSET (ASSET_ID, ASSET_NAME, ASSET_TYPE, PROJECT_ID, CAPACITY, MODEL_YEAR)
    - ASSET_ACTIVITY_LOG (LOG_ID, ASSET_ID, ACTIVITY_TYPE, CYCLE_TIME, TIMESTAMP)
    - EQUIPMENT_GPS (GPS_ID, ASSET_ID, LATITUDE, LONGITUDE, SPEED, HEADING, TIMESTAMP)
    - VOLUME_METRIC (METRIC_ID, PROJECT_ID, CUT_VOLUME, FILL_VOLUME, DATE)
    - GHOST_CYCLE_PREDICTION (PREDICTION_ID, ASSET_ID, IS_GHOST_CYCLE, CONFIDENCE, FUEL_WASTE)
    
    User question: {question}
    
    Generate a Snowflake SQL query that answers this question.
    Only use tables and columns listed above.
    Return ONLY the SQL query, no explanation.
    If you cannot generate SQL, respond with "CANNOT_GENERATE_SQL".
    """
    
    try:
        # Call Cortex Complete to generate SQL
        generated_sql = self.cortex_complete(schema_context, model="mistral-large2")
        
        if not generated_sql or "CANNOT_GENERATE_SQL" in generated_sql:
            return {
                "answer": "I couldn't generate a SQL query for that question.",
                "sql": None,
                "data": None
            }
        
        # Clean up the SQL (remove markdown formatting if present)
        if "```sql" in generated_sql:
            generated_sql = generated_sql.split("```sql")[1].split("```")[0]
        elif "```" in generated_sql:
            generated_sql = generated_sql.split("```")[1].split("```")[0]
        
        generated_sql = generated_sql.strip()
        
        logger.info(f"Generated SQL: {generated_sql[:200]}...")
        
        # Execute the generated SQL
        results = self.execute_query(generated_sql)
        
        return {
            "answer": None,
            "sql": generated_sql,
            "data": results
        }
        
    except Exception as e:
        logger.error(f"Cortex Analyst query failed: {e}")
        return {
            "answer": f"Query failed: {str(e)}",
            "sql": None,
            "data": None
        }
```

### Step 5: Add cortex_complete Method (if missing)

```python
def cortex_complete(self, prompt: str, model: str = "mistral-large2") -> str:
    """Call Snowflake Cortex Complete LLM."""
    escaped_prompt = prompt.replace("'", "''").replace("\\", "\\\\")
    
    sql = f"""
    SELECT SNOWFLAKE.CORTEX.COMPLETE(
        '{model}',
        '{escaped_prompt}'
    ) AS RESPONSE
    """
    
    try:
        results = self.execute_query(sql)
        if results and results[0].get("RESPONSE"):
            return str(results[0]["RESPONSE"])
        return ""
    except Exception as e:
        logger.error(f"Cortex Complete failed: {e}")
        return ""
```

### Step 6: Remove or Guard Mock Data Returns

In `snowflake_service_spcs.py`, the mock data should ONLY be used for local development testing, and should be clearly marked:

```python
def get_equipment_telemetry(self, site_id: str) -> List[Dict[str, Any]]:
    sql = f"""..."""
    try:
        return self.execute_query(sql)
    except Exception as e:
        logger.warning(f"Telemetry query failed: {e}")
        
        # ONLY return mock data if explicitly in local dev mode
        if not self.is_spcs and os.environ.get("ALLOW_MOCK_DATA", "false") == "true":
            logger.warning("Returning mock data for LOCAL DEVELOPMENT ONLY")
            return [...]
        
        # In SPCS, raise the error instead of silently failing
        raise
```

---

## 🔑 Key Insight: The Two-Tier Approach from ATLAS

In ATLAS, we implemented a two-tier approach that you should copy:

```python
async def process_query(self, message: str) -> Dict[str, Any]:
    """
    Two-tier approach:
    1. Try direct pattern matching SQL (FAST, RELIABLE)
    2. Fall back to LLM text-to-SQL (FLEXIBLE, SLOWER)
    """
    
    # TIER 1: Pattern matching (like what you have now, but explicit)
    result = self.sf.direct_sql_query(message)
    if result.get("results"):
        return self._format_query_response(
            results=result["results"],
            sql=result.get("sql"),
            source="Direct SQL"
        )
    
    # TIER 2: LLM text-to-SQL (NEW - this is what's missing!)
    result = self.sf.cortex_analyst_query(message)
    if result.get("data"):
        return self._format_query_response(
            results=result["data"],
            sql=result.get("sql"),
            source="Cortex LLM"
        )
    
    # TIER 3: Return helpful error
    return {
        "response": "I couldn't process that query. Try asking about equipment counts, cycle times, or ghost cycles.",
        "sources": ["TERRA System"]
    }
```

---

## 📋 Checklist for Junior Developer

### Backend Changes

| Task | File | Status |
|------|------|--------|
| Add `cortex_analyst_query()` method | `snowflake_service_spcs.py` | ⬜ |
| Add `cortex_complete()` method (if missing) | `snowflake_service_spcs.py` | ⬜ |
| Guard mock data with `ALLOW_MOCK_DATA` env | `snowflake_service_spcs.py` | ⬜ |
| Update `/api/chat` to use LLM | `api/main.py` | ⬜ |
| Remove pre-wired pattern handlers OR keep as tier 1 | `orchestrator.py` | ⬜ |

### Frontend Changes

| Task | File | Status |
|------|------|--------|
| Remove silent fallback to `/api/chat` | `Chat.tsx` | ⬜ |
| Show meaningful error when Cortex unavailable | `Chat.tsx` | ⬜ |

### Deployment/Config

| Task | Status |
|------|--------|
| Create TERRA_COPILOT agent in Snowsight | ⬜ |
| Upload semantic model to stage | ⬜ |
| Attach Analyst tool to agent | ⬜ |
| Attach Search tool to agent (if using Cortex Search) | ⬜ |

---

## 🧪 How to Test

### Test 1: Verify Cortex Agent is Being Called

In SPCS logs, you should see:
```
[INFO] Calling Cortex Agent: https://.../api/v2/databases/CONSTRUCTION_GEO_DB/schemas/CONSTRUCTION_GEO/agents/TERRA_COPILOT:run
[INFO] SSE: type=response.output_text.delta
[INFO] SSE: type=response.tool_result
```

If you see `Streaming failed, falling back to local` in the browser console, Cortex Agent is NOT working.

### Test 2: Ask a Question That Requires SQL

Ask: "How many pieces of equipment do we have?"

**Bad Response (pre-wired):**
```
📊 **Query Results**
**Equipment Count**: 152
```
(This is suspiciously fast and always returns the same number)

**Good Response (Cortex Analyst):**
```
📊 **Query Results**
Based on querying the ASSET table, you have **147** pieces of equipment across all projects.

SQL: SELECT COUNT(*) as EQUIPMENT_COUNT FROM CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.ASSET
```
(Shows the actual SQL and varies based on real data)

### Test 3: Ask a Complex Question

Ask: "Which equipment types have the highest ghost cycle rates?"

**Bad Response (pre-wired):**
Returns a generic "I can help you with..." message because no keyword matches.

**Good Response (Cortex Analyst):**
Generates a GROUP BY query and returns actual data.

---

## 🏗️ Reference: How ATLAS Chat.tsx Handles Errors

```typescript
// From ATLAS Chat.tsx - no silent fallback!
} catch (error) {
  console.error('Chat error:', error)
  setMessages(prev => prev.map(msg => 
    msg.id === assistantId 
      ? { 
          ...msg, 
          content: 'I encountered an error. Please try rephrasing your question.',
          isStreaming: false 
        }
      : msg
  ))
}
```

Note: ATLAS does NOT have a fallback to `/api/chat`. If streaming fails, it shows an error.

---

## Summary

| What | TERRA (Current - Broken) | ATLAS (Working) |
|------|--------------------------|-----------------|
| Primary Chat | `/api/chat/stream` → Cortex Agent | `/api/chat/stream` → Cortex Agent |
| Fallback | `/api/chat` → Keyword Orchestrator | **NONE** - shows error |
| Text-to-SQL | Keyword patterns only | LLM generates SQL |
| Document Search | SQL LIKE query | Cortex Search |
| Mock Data | Silently returned on error | Only with explicit flag |

**The fix is simple: Remove the fallback, make errors visible, and add LLM text-to-SQL.**
