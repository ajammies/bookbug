---
name: agent-design
description: |
  Comprehensive Agent Design, Creation and modification using Vercel AI SDK generateObject with Zod schemas. used when claude needs to create, prompt, modify, fix, refactor or improve any agent code, and any time a Zod Schema is modified that is used by an agent. 

  Covers: agent architecture, Zod schema patterns, .describe() usage, prompting for structured output, error handling.
---

# Agent creation, modification, error handling

## Overview

A user may ask you create, modify, fix, refactor or improve any agent code. An agent is any code scaffolding that calls llms (either to generate text or generateObject). LLM calls are fragile, since they are non-deterministic, and require strict adherance to design principles, typed schemas, explicit descritions of ZOD properties using .describe() and error handling. This skill strictly enforces best practices of agent architecture, prompting, Zod schema patterns, .describe() usage, prompting for structured output, error handling.

## Principles

- **Name agents after their output** — `proseAgent` outputs `Prose`, `visualsAgent` outputs `VisualDirection`
- **Schema-first** — Define Zod schema before prompt. Schema IS the contract.
- **Explicit `.describe()`** — LLMs make mistakes unless explicitly guided. Use `.describe()` on every ambiguous field.
- **Agents as pure functions** — Single transformation, minimal scope. Split complex tasks into chained agents.
- **LLMs interpret, not regex** — Never pattern match fuzzy text. Use a small agent instead.
- **Domain knowledge > instructions** — Tell it WHAT constraints exist, not step-by-step HOW.

## Template

```typescript
import { generateObject } from 'ai';
import { ProseSchema, type StoryWithPlot, type Prose } from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `Domain knowledge here. Not step-by-step instructions.`;

// Agent named after output: proseAgent → Prose
export const proseAgent = async (input: StoryWithPlot): Promise<Prose> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: ProseSchema,
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

- [ ] Agent named after output type (`fooAgent` → `Foo`)
- [ ] Schema defined before prompt
- [ ] `.describe()` on ambiguous/similar fields
- [ ] System prompt provides domain knowledge, not steps
- [ ] Single responsibility (one transformation)
- [ ] Input/output types explicit
- [ ] Tests cover valid input, edge cases, malformed input

## Limitations

This skill does NOT cover:
- Streaming responses (useChat, streamObject)
- Tool calling / function calling
- Multi-turn conversations (use conversation patterns instead)
- Non-Vercel AI SDK implementations
- Retry/resilience logic (consider Inngest for that)
