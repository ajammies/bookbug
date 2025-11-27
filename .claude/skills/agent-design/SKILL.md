---
name: agent-design
description: |
  Design AI agents using Vercel AI SDK generateObject with Zod schemas.

  Triggers: "create an agent", "new agent for X", "fix NoObjectGeneratedError", "agent isn't returning correct schema", "design a Zod schema for generateObject", "why is the model returning wrong values", "split this into smaller agents".

  Covers: agent architecture, Zod schema patterns, .describe() usage, prompting for structured output, error handling.
---

# Agent Design

## Overview

Agents are pure functions: one input → one transformation → one output.

## Principles

- **Schema-first** — Define Zod schema before prompt; schema IS the contract
- **Never hardcode LLM decisions** — Use `generateObject`, not `if (text.includes(...))`
- **Trust the model** — Don't over-prescribe what it already understands
- **Domain knowledge > instructions** — Tell it WHAT constraints exist, not HOW to think

## Template

```typescript
import { generateObject } from 'ai';
import { OutputSchema, type Input, type Output } from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `Domain knowledge here. Not step-by-step instructions.`;

export const myAgent = async (input: Input): Promise<Output> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: OutputSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(input, null, 2),
  });
  return object;
};
```

## When to Use / Not Use

| Create Agent | Don't Create Agent |
|--------------|-------------------|
| Unstructured → structured | Simple validation |
| Requires reasoning | Deterministic transforms |
| Needs creativity | Pattern matching suffices |

## References

| Topic | File | When to Read |
|-------|------|--------------|
| Schema patterns | [zod-patterns.md](references/zod-patterns.md) | Designing schemas, using `.describe()` |
| Prompting | [prompting-guide.md](references/prompting-guide.md) | Writing system prompts |
| Errors | [error-handling.md](references/error-handling.md) | NoObjectGeneratedError, debugging |

## Success Criteria

A well-designed agent:
- Has < 20 schema fields (split if larger)
- System prompt < 500 words
- Single return statement
- All ambiguous fields have `.describe()`
- Tests pass for valid input, edge cases, malformed input

## Checklist

- [ ] Schema defined before prompt
- [ ] `.describe()` on ambiguous/similar fields
- [ ] System prompt provides domain knowledge, not steps
- [ ] Single responsibility (one transformation)
- [ ] Input/output types explicit
- [ ] Tests written

## Limitations

This skill does NOT cover:
- Streaming responses (useChat, streamObject)
- Tool calling / function calling
- Multi-turn conversations (use conversation patterns instead)
- Non-Vercel AI SDK implementations
- Retry/resilience logic (consider Inngest for that)
