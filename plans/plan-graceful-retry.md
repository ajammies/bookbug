# Plan: Graceful Retry with AI SDK

## Research Summary

### Key AI SDK Features for Error Handling

1. **`NoObjectGeneratedError`** - Thrown when output doesn't match schema
   - Properties: `text`, `cause`, `response`, `usage`, `finishReason`
   - Use `NoObjectGeneratedError.isInstance(error)` to detect

2. **`experimental_repairText`** - Callback to fix invalid JSON
   ```ts
   await generateObject({
     // ...
     experimental_repairText: async ({ text, error }) => {
       // Attempt to fix the text and return corrected string
       return fixedText;
     },
   });
   ```

3. **`streamObject` with `output: 'array'` + `elementStream`** - Stream individual array elements
   ```ts
   const { elementStream } = streamObject({
     output: 'array',
     schema: PageSchema, // schema for ONE element
     // ...
   });

   for await (const page of elementStream) {
     // Each page is fully validated before being yielded
     console.log(page);
   }
   ```

4. **`onError` callback** - Handle streaming errors without crashing
   ```ts
   streamObject({
     onError({ error }) {
       console.error(error);
     }
   });
   ```

## Problem Statement

Currently, our agents generate entire arrays at once:
- `visualsAgent` generates ALL `illustratedPages` in one call
- If page 11/12 fails validation, we lose ALL work
- No way to retry just the failing page

## Proposed Solution

### Strategy: Atomic Page-Level Agents

Keep agents small and atomic - generate ONE page at a time. This is already partially done with `prosePageAgent` and `pageVisualsAgent`, but we need:

1. **Wrap agents with retry logic** - Retry individual page failures
2. **Add `experimental_repairText`** - Let the model fix its own JSON errors
3. **Graceful error handling** - Log failures, save progress, continue

### Implementation

#### 1. Create a retry wrapper utility

```ts
// src/core/utils/retry.ts
import { NoObjectGeneratedError } from 'ai';

interface RetryOptions {
  maxRetries?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 2, onRetry } = options;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt > maxRetries) throw error;

      // Only retry on schema validation errors
      if (NoObjectGeneratedError.isInstance(error)) {
        onRetry?.(attempt, error);
        continue;
      }
      throw error; // Don't retry other errors
    }
  }
  throw new Error('Unreachable');
}
```

#### 2. Add repair callback to generateObject calls

```ts
// In agents that use generateObject
const { object } = await generateObject({
  model: getModel(),
  schema: SomeSchema,
  system: PROMPT,
  prompt: JSON.stringify(context),
  experimental_repairText: async ({ text, error }) => {
    // Log the error for debugging
    console.warn('Schema validation failed, attempting repair:', error.message);

    // For TypeValidationError, the text is valid JSON but wrong shape
    // We can try to extract/fix the problematic field
    // For now, return null to skip repair (will throw original error)
    return null;
  },
});
```

#### 3. Update pipeline to handle per-page failures

```ts
// In executePipeline
for (let i = 0; i < storyWithPlot.pageCount; i++) {
  const pageNumber = i + 1;

  try {
    const prosePage = await withRetry(
      () => prosePageAgent({ story, proseSetup, pageNumber, previousPages }),
      {
        maxRetries: 2,
        onRetry: (attempt) => onProgress?.(`page-${pageNumber}`, 'retry', { attempt })
      }
    );
    prosePages.push(prosePage);

    // Save progress after each successful page
    await saveProgress?.({ prosePages, illustratedPages });

  } catch (error) {
    // Log failure but continue with remaining pages
    onProgress?.(`page-${pageNumber}`, 'error', { error });
    failedPages.push(pageNumber);
    continue; // Or throw to stop pipeline
  }
}
```

### Files to Change

1. **New: `src/core/utils/retry.ts`** - Retry wrapper utility
2. **Update: `src/core/agents/prose.ts`** - Add repair callback
3. **Update: `src/core/agents/visuals.ts`** - Add repair callback
4. **Update: `src/core/pipeline.ts`** - Add retry logic and progress saving
5. **Update: `src/cli/commands/resume.ts`** - Support resuming from partial progress

### Test Strategy

1. Unit tests for retry wrapper
2. Integration tests with mock agents that fail on specific attempts
3. Manual testing with real LLM calls

## Alternative: `streamObject` with `output: 'array'`

For batch agents (like the original `visualsAgent`), we could use streaming:

```ts
const { elementStream } = streamObject({
  model: getModel(),
  output: 'array',
  schema: IllustratedPageSchema,
  prompt: ...,
});

const pages: IllustratedPage[] = [];
for await (const page of elementStream) {
  pages.push(page);
  onPageComplete?.(page); // Real-time progress
}
```

**Pros:**
- Each element validated independently
- Real-time progress as pages complete

**Cons:**
- Can't easily retry individual failed elements mid-stream
- Less control over context between pages

## Recommendation

1. **Keep atomic per-page agents** (current approach) - more control
2. **Add retry wrapper** - simple, composable
3. **Add repair callbacks** - let model self-correct
4. **Save progress incrementally** - resume from failures

This gives us:
- Small blast radius (one page at a time)
- Automatic retries for transient failures
- Self-healing via repair callback
- Resume capability for hard failures
