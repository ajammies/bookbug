# Error Handling for generateObject

## NoObjectGeneratedError

Thrown when model output doesn't match schema.

```typescript
import { NoObjectGeneratedError } from 'ai';

if (NoObjectGeneratedError.isInstance(error)) {
  console.log('Received:', error.text);
  console.log('Reason:', error.finishReason);
}
```

## Fix Priority

1. **Add `.describe()`** - Clarify the failing field (fastest fix)
2. **Split into smaller agents** - One agent per logical sub-schema (architectural fix)
3. **Simplify schema** - Remove nesting, flatten structure

## Pattern: One Agent Per Sub-Schema

Large schemas fail more often. Split into focused agents:

```
// Instead of one agent producing everything:
StoryBlurb + Manuscript + VisualStyle + Pages → ❌ Unreliable

// Chain smaller agents:
StoryBrief → BlurbAgent → StoryBlurb
StoryBlurb → AuthorAgent → Manuscript
Manuscript → IllustratorAgent → Story
```

**Each agent:**
- Has a focused schema (~10-20 fields max)
- Does one transformation
- Is independently testable

## Common Errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Expected array, received string` | Stringified JSON | `.describe('Array of items')` |
| `Expected enum value` | Wrong field used | `.describe()` both similar fields |
| `finishReason: content-filter` | Provider blocked | Simplify prompt |
| Failures with `.optional()` | OpenAI limitation | Use `.nullable()` |

## Quick Fixes

```typescript
// Disambiguate similar fields
layout: z.enum([...]).describe('Page structure'),
composition: z.enum([...]).describe('Shot framing'),

// Force explicit null decision
moral: z.string().nullable().describe('Story moral, null if none'),

// Clarify array expectations
chips: z.array(z.string()).describe('Response suggestions as string array'),
```
