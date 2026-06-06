# REFLECTION PARSE FORENSICS

## 1. Vulnerability Audit

| File | Line | Code Snippet | Failure Mode | Impact |
| :--- | :--- | :--- | :--- | :--- |
| `llmService.ts` | 51 | `return JSON.parse(result.content);` | Direct `JSON.parse` on raw LLM output. | Crashes the entire structured output request if any non-JSON char exists. |
| `jarvisReflectionService.ts` | 60 | `...reflection` | Spreading `null` or invalid object. | If `llmService` returns `null` on catch, the workflow might fail or skip persistence silently. |
| `providerRouter.ts` | 77 | `return await provider.generate(...)` | Opaque response content. | Does not validate if the provider actually returned valid JSON before returning to `llmService`. |

## 2. Identified Failure Patterns

Based on logs and code analysis, the following patterns cause parsing failures:

1. **Markdown Wrappers**: LLMs often wrap JSON in ```json ... ``` despite system prompts.
2. **Control Characters**: Newlines, tabs, and other control characters inside string values often break standard `JSON.parse`.
3. **Incomplete JSON**: Long responses being truncated by token limits.
4. **Leading/Trailing Text**: "Here is the reflection: { ... }" conversational filler.
5. **Strict Mode Conflicts**: `json_object` mode in some providers still allows for single quotes or missing double quotes on keys in edge cases.

## 3. Structural Weakness

The current architecture lacks a **Sanitization Layer** between the LLM Provider and the Business Logic. It assumes "Happy Path" success for every API call, which is a violation of Production SRE principles for autonomous agents.
