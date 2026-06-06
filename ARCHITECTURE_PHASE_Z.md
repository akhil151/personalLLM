# Phase Z Architecture — Autonomous Platform

This document outlines the authoritative architecture of the platform as of Phase Z. The system is designed for high-durability autonomous execution, multi-agent collaboration, and multimodal perception.

## 1. Core Runtime Layer
The foundation of all interactions, ensuring state persistence and user communication.
- **Conversations & Messages**: Primary interface for user-AI interaction.
- **Durable Workflows**: `agent_runs` and `workflow_snapshots` provide fault-tolerant execution.
- **Background Jobs**: Asynchronous processing for long-running tasks like embedding generation and deep research.

## 2. Agent Layer
The cognitive engine that decomposes goals and executes actions.
- **Planner Agent**: Generates `agent_tasks` from high-level goals.
- **Executor Agent**: Performs system-level tasks and tool calls.
- **Collaboration**: `agent_messages` and `collaboration_requests` enable multi-agent teamwork and Human-in-the-Loop (HITL) workflows.
- **Short-term Memory**: `agent_memories` stores run-specific context and shared state.

## 3. Memory Layer
Semantic and episodic memory systems for long-term intelligence.
- **Semantic Memory**: `message_embeddings` (vector 3072) provides high-fidelity conceptual retrieval.
- **Episodic Context**: Full message history linked to conversations.
- **Knowledge Base**: `knowledge_documents` and `knowledge_chunks` for RAG-based expansion.

## 4. Browser Layer
Visual perception and web-based execution.
- **Browser Sessions**: Managed headless browser instances linked to agent runs.
- **Action Tracing**: `browser_actions` records every click, type, and scroll for transparency.
- **Visual Snapshots**: `page_snapshots` captures DOM state and screenshots for AI perception.

## 5. MCP Layer
Model Context Protocol integration for dynamic tool discovery.
- **Server Registry**: `mcp_servers` manages connections to external tool providers (Filesystem, GitHub, Databases).
- **Dynamic Tools**: Agents discover and invoke tools via standard JSON-RPC over stdio/SSE.

## 6. Voice Layer
Real-time multimodal interaction.
- **Voice Sessions**: Integration with OpenAI Realtime API for low-latency audio workflows.
- **State Management**: Linked to existing conversations for context continuity.

## 7. Future Knowledge Graph Layer
The foundation for the next-generation Jarvis personal intelligence.
- **Status**: `RESERVED_FOR_FUTURE`
- **Entities & Relationships**: `kg_entities` and `kg_relationships` will store structured personal knowledge, enabling complex reasoning over user history and preferences.

---

**Authoritative Schema**: [schema_phase_z.sql](file:///c:/projects/LLM/schema_phase_z.sql)
**Audit Status**: Phase Y.6.5 Certified
**Environment**: Production-Ready
