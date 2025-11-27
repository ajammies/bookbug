# Plan: Codebase Cleanup

## Goals
Apply CLAUDE.md principles to fix 6 issues (HIGH + MEDIUM priority).

## Changes

### 1. Extract `getOrCreateOutputManager()` - DRY fix
**Files:** `src/cli/utils/output.ts`
**Pattern appears 5x** - ready to abstract

```typescript
// Add to output.ts
export async function getOrCreateOutputManager(
  filePath: string,
  fallbackTitle: string
): Promise<StoryOutputManager> {
  return (await isStoryFolder(filePath))
    ? await loadOutputManager(filePath)
    : await createOutputManager(fallbackTitle);
}
```

Then update: `write.ts`, `direct.ts`, `render.ts`

### 2. Flatten `createManager()` - simpler first-expression return
**File:** `src/cli/utils/output.ts:81-97`

```typescript
// Before: nested factory
const createManager = (folder: string): StoryOutputManager => {
  const saveJson = async (...) => { ... };
  return { folder, saveBrief: (brief) => saveJson(...), ... };
};

// After: flat, first-expression return
const saveJson = async (folder: string, filename: string, data: unknown) =>
  fs.writeFile(path.join(folder, filename), JSON.stringify(data, null, 2));

const createManager = (folder: string): StoryOutputManager => ({
  folder,
  saveBrief: (brief) => saveJson(folder, 'brief.json', brief),
  ...
});
```

### 3. Consistent error handling
**File:** Create `src/core/errors.ts`

```typescript
export const enhanceError = (error: unknown, context: string): string => {
  if (error instanceof Error) return `${context}: ${error.message}`;
  return `${context}: ${String(error)}`;
};
```

Update commands to use it.

### 4. Remove emojis from display output
**File:** `src/cli/output/display.ts`

Replace `📖`, `📝`, `🎬`, `📚` with plain text headers.

### 5. Clearer naming utils
**File:** `src/cli/utils/naming.ts`

- `titleToSlug` → `titleToFileSafeName`
- `getTimestamp` → `formatTimestamp`
- `generateStoryFolder` → `createStoryFolderName`

### 6. Command boilerplate extraction (if time)
**Files:** `src/cli/commands/*.ts`

Extract shared try/catch/spinner pattern.

## Test Strategy
- Run `npm run test:run` after each change
- Run `npm run typecheck` before PR
- Existing tests should pass (refactor only)

## Order
1 → 2 → 3 → 4 → 5 → 6 (atomic commits each)
