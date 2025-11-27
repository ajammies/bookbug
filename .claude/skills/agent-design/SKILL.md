---
name: agent-design
description: Guide for designing AI agents using Vercel AI SDK generateObject with Zod schemas. Use when creating or modifying any agent, writing generateObject calls, designing Zod schemas for LLM output, or debugging NoObjectGeneratedError.
---

# Agent Design

Design agents as pure functions: single transformation, no side effects, small scope.

## Core Principles

1. **Schema-first** - Define Zod schema before prompt; schema IS the contract
2. **Never hardcode what an LLM can decide** - Use `generateObject`, not `if (text.includes(...))`
3. **Trust the model** - Don't over-prescribe what it already understands
4. **Provide domain knowledge, not step-by-step instructions**

## Agent Structure

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

## When to Create an Agent

**Create an agent when:**
- Transforming unstructured input to structured output
- Decisions require reasoning beyond if/else logic
- Output requires creativity or domain understanding

**Don't create an agent when:**
- Simple validation or parsing
- Deterministic transformations
- Pattern matching suffices

## Schema Design

See [references/zod-patterns.md](references/zod-patterns.md) for detailed patterns.

**Quick rules:**
- Use `.describe()` on ambiguous fields as mini-prompts
- Prefer `.nullable()` over `.optional()` for LLM reliability
- Keep top-level as object, not array
- Enums need descriptive values or `.describe()`

## Prompting

See [references/prompting-guide.md](references/prompting-guide.md) for patterns.

**Quick rules:**
- Domain knowledge > step-by-step instructions
- Concrete examples > verbose explanations
- Age-appropriate context when relevant
- System prompt for role/context, user prompt for input data

## Error Handling

See [references/error-handling.md](references/error-handling.md) for NoObjectGeneratedError patterns.

**Quick fix:** Add `.describe()` to the failing field.

## Checklist

Before creating/modifying an agent:

- [ ] Schema defined before prompt
- [ ] `.describe()` on ambiguous or similar fields
- [ ] System prompt provides domain knowledge, not steps
- [ ] No hardcoded decisions that LLM could make
- [ ] Single responsibility (one transformation)
- [ ] Input/output types explicit
- [ ] Tests cover valid input, edge cases, schema validation

