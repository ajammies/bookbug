# Plan: Testing Infrastructure for Bookbug

Set up Vitest testing framework with organized test structure for unit, integration, and future agent eval tests.

## Test Framework: Vitest

Vitest is the recommended choice for this project:
- Native TypeScript/ESM support (no babel)
- Fast execution with HMR
- Built-in mocking capabilities
- Jest-compatible API
- Works seamlessly with the existing build setup

## Directory Structure

**Approach**: Co-located tests (modern best practice)

Tests live next to source files (`file.ts` → `file.test.ts`):
- Easy to find and refactor together
- Clear 1-1 relationship
- Recommended by Vitest/modern tooling
- Common in React, Vue, Vite ecosystems

```
src/
├── cli/
│   ├── utils/
│   │   ├── naming.ts
│   │   ├── naming.test.ts        # Co-located
│   │   ├── output.ts
│   │   └── output.test.ts
│   ├── output/
│   │   ├── display.ts
│   │   ├── display.test.ts
│   │   ├── progress.ts
│   │   └── progress.test.ts
│   └── commands/
│       └── *.test.ts
└── core/
    ├── schemas/
    │   ├── index.ts
    │   └── index.test.ts
    └── agents/
        └── *.test.ts

tests/
└── fixtures/                     # Shared test data only
    ├── brief.json
    ├── plot.json
    └── manuscript.json
```

## Test Categories

### 1. Unit Tests (Priority 1)
Pure functions with no side effects - test immediately.

**`naming.test.ts`**:
- `titleToSlug()` - various inputs, special chars, length limits
- `getTimestamp()` - format validation (mock Date)
- `generateStoryFolder()` - combines slug + timestamp

**`schemas/index.test.ts`**:
- Valid data passes validation
- Invalid data throws with correct errors
- Custom refinements work (ageRange.min <= max)
- Partial schemas work correctly

**`progress.test.ts`**:
- `formatStep()` - step name mapping
- `progressBar()` - progress string generation

### 2. Integration Tests (Priority 2)
Functions with file I/O - mock fs/promises.

**`output.test.ts`**:
- `createOutputManager()` - folder creation
- `loadOutputManager()` - existing folder detection
- `isStoryFolder()` - artifact file detection
- Save methods - JSON serialization

### 3. Agent Tests (Priority 3)
LLM calls - mock `generateObject` from ai sdk.

**`agents/*.test.ts`**:
- Mock `generateObject` to return fixture data
- Test prompt construction
- Test schema validation of responses
- Test error handling

### 4. Agent Eval Tests (Future - V2)
Add to ARCHITECTURE.md for future implementation:
- Evaluation framework for LLM output quality
- Test cases with expected outputs
- Scoring metrics (creativity, consistency, age-appropriateness)

## Implementation Steps

### Step 1: Install dependencies
```bash
npm install -D vitest @vitest/coverage-v8
```

### Step 2: Create vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts']
    }
  }
})
```

### Step 3: Add npm scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Step 4: Create test files (in order)
1. `naming.test.ts` - pure functions, quick win
2. `schemas/index.test.ts` - validation logic
3. `progress.test.ts` - pure functions
4. `output.test.ts` - with fs mocking
5. Fix the `-o` flag bug in `brief.ts` (discovered during testing)

### Step 5: Update ARCHITECTURE.md
Add "Testing" section documenting:
- Test categories and their purposes
- How to run tests
- Future: Agent eval tests for V2

## Files to Create/Modify

1. **New**: `vitest.config.ts`
2. **Edit**: `package.json` - add test scripts and devDependencies
3. **New**: `src/cli/utils/naming.test.ts`
4. **New**: `src/core/schemas/index.test.ts`
5. **New**: `src/cli/output/progress.test.ts`
6. **New**: `src/cli/utils/output.test.ts`
7. **Edit**: `src/cli/commands/brief.ts` - fix unused `-o` flag
8. **Edit**: `ARCHITECTURE.md` - add Testing section

## Bug Fix: `-o` flag in brief.ts

The `-o, --output` option is defined but not used. Current code always auto-saves:
```typescript
// Current (ignores options.output)
const outputManager = await createOutputManager(brief.title);
```

Should respect custom output path if provided.
