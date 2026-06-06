# RUNTIME EVIDENCE REPORT
Date: 2026-06-07
Certification Phase: Z.4 Readiness

## 1. SYSTEM INVENTORY EVIDENCE
- **Active Agents**: Planner, Research, Memory, Executor, Critic, Browser (Verified via `AgentRegistry`)
- **Tools**: `create_task`, `search_memories`, `summarize_conversation`, `fetch_user_data`, `generate_learning_plan`, `save_research_report`
- **MCP Servers**: `filesystem` (Active: true)
- **Providers**: OpenAI, Gemini, OpenRouter (Verified via `ProviderRouter`)

## 2. ORCHESTRATION & PLANNING EVIDENCE
- **Run ID**: `64ca31eb-9c97-4fe7-9b73-39775293764b`
- **Status**: **FAIL**
- **Evidence**:
    - `agent_runs` row created: YES
    - `agent_tasks` rows created: NO
- **Root Cause**: `llmService.getStructuredOutput` threw `schema.safeParse is not a function` because an empty object `{}` was passed instead of a Zod schema in `PlannerAgent.ts`.

## 3. MEMORY ENGINE EVIDENCE
- **Status**: **PASS**
- **Evidence**:
    - Message ID: `a350f89e-9b3e-4cd6-9017-51bbe7adb07a`
    - Content: "My favorite programming language is Rust."
    - Semantic Search Result: Found "My favorite programming language is Rust." with similarity score 0.85.
    - Vector Storage: Verified in `message_embeddings` table.

## 4. BROWSER RUNTIME EVIDENCE
- **Status**: **PASS**
- **Evidence**:
    - Session ID: `37604f41-0268-4508-b710-f1c5c0c98f98`
    - Action: `navigate` to `https://example.com`
    - Snapshot: Captured and stored in `page_snapshots`.
    - Verification: `browser_sessions` and `browser_actions` rows exist in DB.

## 5. PROVIDER FAILOVER EVIDENCE
- **Status**: **PASS**
- **Evidence**:
    - Primary: `openrouter` (Simulated failure)
    - Switch: Switched to `gemini` automatically.
    - Result: Successful response from fallback provider.

## 6. RECOVERY ENGINE EVIDENCE
- **Status**: **FAIL**
- **Evidence**:
    - Claim: Workflow `76c4374d-a800-4aa7-ba9c-7d400880687f` claimed by `recovery-auditor`.
    - Resumption: Logged resumption from step 2.
    - Persistence: **FAIL** - `workflow_events` table remained empty. No `TOOL_EXECUTED` event found.

## 7. PERSISTENCE EVIDENCE
- **Status**: **PASS**
- **Evidence**:
    - Stored Focus: "Building a decentralized AI network with Rust"
    - Retrieved Focus: "Building a decentralized AI network with Rust"
    - Verification: Direct DB update and retrieval via `createAdminClient`.
