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

- **Strict Schema Adherance** — Define simple but comprehensive Zod schema for the agent output before designing the prompt.  
- **Explict Zod Schema properties** — llms will make mistakes with properties unless explicitly instructed. use .describe() to give the llm enough context so it clearly adheres to the schema and does not make mistakes
- **Agents as Pure functions** — Each agent should have minimal scope. Consider breaking agents into simpler, "pure" agents when the task is complex. 
- **Use llms to intepret responses** — never pattern match or use deterministic algorithms to interpret fuzzy text. 
- **Keep instructions simple** — Don't use overly formulaic instructions or contrived examples - treat agents as intelligent, capable of understanding without overly prescriptive instructions
- **Prompting with Domain knowledge > instructions** — Tell it WHAT constraints exist, best practices, and clear examples, not deterministic instructions (unless absolutely necessary)

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
- [ ] Tests written to cover a wide variety of unstructured inputs, outputs, error handling

## Limitations

This skill does NOT cover:
- Streaming responses (useChat, streamObject)
- Tool calling / function calling
- Multi-turn conversations (use conversation patterns instead)
- Non-Vercel AI SDK implementations
- Retry/resilience logic (consider Inngest for that)
