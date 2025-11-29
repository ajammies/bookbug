# Plan: Add Repair Support to streamObjectWithProgress

## Goal

Add repair support to `streamObjectWithProgress` to handle `NoObjectGeneratedError` when schema validation fails after streaming completes.

## Problem

- `generateObject` supports `experimental_repairText` for fixing validation errors
- `streamObject` in AI SDK does not support this feature
- When streaming completes with invalid schema output, `NoObjectGeneratedError` is thrown
- `visualsAgent` uses streaming and is vulnerable to validation failures

## Approach

Add optional `repair` parameter to `streamObjectWithProgress` that catches validation errors and attempts repair using the existing `createRepairFunction` utility.

## Files to Change

1. `src/core/utils/ai.ts` - Add repair parameter and error handling
2. `src/core/agents/visuals.ts` - Use repair function in `visualsAgent`
3. `src/core/agents/prose.ts` - Use repair function in `proseAgent`
4. `src/core/utils/ai.test.ts` - Add tests for repair flow

## Implementation

### 1. Update streamObjectWithProgress signature

```typescript
type RepairFunction = (opts: {
  text: string;
  error: JSONParseError | TypeValidationError;
}) => Promise<string | null>;

export async function streamObjectWithProgress<T>(
  options: StreamObjectParams & { schema: { parse: (data: unknown) => T } },
  onProgress?: (message: string) => void,
  sampleIntervalMs?: number,
  repair?: RepairFunction
): Promise<T>
```

### 2. Add error handling after streaming

```typescript
try {
  return (await result.object) as T;
} catch (error) {
  if (!repair || !NoObjectGeneratedError.isInstance(error)) {
    throw error;
  }

  const repaired = await repair({ text: error.text, error: error.cause });
  if (!repaired) throw error;

  return options.schema.parse(JSON.parse(repaired));
}
```

### 3. Update agents to pass repair function

```typescript
return streamObjectWithProgress(
  { model, schema, system, prompt },
  onProgress,
  3000,
  createRepairFunction()
);
```

## Test Strategy

- Mock `streamObject` to return invalid JSON
- Verify repair function is called with correct parameters
- Verify repaired output is returned
- Verify original error is thrown when repair fails
