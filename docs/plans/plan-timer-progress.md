# Plan: Timer-Based Progress Messages

**Issue:** #50 - Replace streaming progress with timer-based witty messages

## Goal
Replace unreliable `summarizePartial` mechanism with pre-generated witty messages displayed on a timer.

## Changes

### 1. Create `progressMessagesAgent`
**File:** `src/core/agents/progress-messages.ts`

```typescript
export const progressMessagesAgent = async (
  story: StoryWithPlot,
  logger?: Logger
): Promise<string[]>
```

- Uses Haiku model (fast, cheap)
- Generates 10-15 witty messages based on story context
- Mixed character actions + narrator commentary

### 2. Create `ProgressRotator` component
**File:** `src/cli/components/progress-rotator.ts`

```typescript
export interface ProgressRotator {
  start: () => void;
  stop: () => void;
}

export const createProgressRotator = (
  messages: string[],
  intervalMs: number,
  onMessage: (msg: string) => void
): ProgressRotator
```

- Simple `setInterval` timer cycling through messages
- No streaming dependencies

### 3. Simplify `streamObjectWithProgress`
**File:** `src/core/utils/ai.ts`

Remove:
- `summarizePartial` function
- `hasSubstantialData` function
- `onProgress` parameter
- `sampleIntervalMs` parameter

Keep streaming + repair logic only.

### 4. Update agents
**Files:** `src/core/agents/prose.ts`, `src/core/agents/visuals.ts`

Remove `onProgress` parameter from both agents.

### 5. Update pipeline
**File:** `src/core/pipeline.ts`

- Call `progressMessagesAgent` before prose/visuals generation
- Pass messages to CLI via callback
- Remove `onThinking` parameter from agent calls

### 6. Update CLI
**File:** `src/cli/commands/create.ts`

- Create `ProgressRotator` instance
- Start rotator when prose/visuals begin
- Stop rotator when complete

## Test Strategy

| File | Tests |
|------|-------|
| `progress-messages.test.ts` | Agent returns string array, messages reference story context |
| `progress-rotator.test.ts` | Timer fires at interval, stop clears timer |
| `ai.test.ts` | Update for simplified signature (no onProgress) |

## Implementation Order

1. Create `progressMessagesAgent` + tests
2. Create `ProgressRotator` + tests
3. Simplify `streamObjectWithProgress` + update tests
4. Remove `onProgress` from prose/visuals agents
5. Wire up in pipeline and CLI
6. Run full test suite
