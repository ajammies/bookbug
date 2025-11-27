# AI SDK v5 Upgrade Plan

## Overview

Upgrade from AI SDK 4.x to 5.x for improved structured output handling and future compatibility.

**Current versions:**
- `ai@4.3.19`
- `@ai-sdk/anthropic@1.2.12`

**Target versions:**
- `ai@5.x` (latest stable)
- `@ai-sdk/anthropic@2.x` (required for v5)

## Scope Assessment

### What We Use

The codebase has minimal AI SDK surface area:

| Feature | Files | Impact |
|---------|-------|--------|
| `generateObject` | 8 agents | Low - API mostly unchanged |
| `anthropic()` provider | `config.ts` | Low - same API |
| Simple messages | `conversation.ts`, `blurb-conversation.ts` | Low - format unchanged |

### What We Don't Use

- `generateText` / `streamText`
- `useChat` / React hooks
- Tools / function calling
- Streaming APIs
- `CoreMessage` types
- `maxSteps` / step control

## Breaking Changes That Affect Us

Based on the [migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0):

### 1. Package Versions (Required)
```bash
npm install ai@5 @ai-sdk/anthropic@2
```

### 2. Parameter Renames (Check if used)
- `maxTokens` → `maxOutputTokens` (we don't use this)
- `providerMetadata` → `providerOptions` (we don't use this)

### 3. Type Renames (Check imports)
- `CoreMessage` → `ModelMessage` (we don't import this)
- Message `content` → `parts` for UIMessage (we use simple `{role, content}`)

### 4. Temperature Default Removed
- v4: Had a default temperature
- v5: Must explicitly set if needed
- **Action**: Test if current behavior is acceptable, add explicit temperature if needed

## Migration Steps

### Phase 1: Preparation
1. Create branch `feat/ai-sdk-v5`
2. Review current test coverage (153 tests passing)
3. Run the app manually to establish baseline behavior

### Phase 2: Package Update
1. Update `package.json`:
   ```json
   {
     "dependencies": {
       "ai": "^5.0.0",
       "@ai-sdk/anthropic": "^2.0.0"
     }
   }
   ```
2. Run `npm install`
3. Run `npm run typecheck` - fix any type errors

### Phase 3: Code Changes (if needed)
1. Check for any deprecated API usage
2. Add explicit `temperature` if behavior changed
3. Update any type imports if TypeScript errors

### Phase 4: Testing
1. Run `npm run test:run` - all 153 tests should pass
2. Run `npm run dev` - test conversation flow manually
3. Test full pipeline: brief → blurb → manuscript → story

### Phase 5: Finalize
1. Update `CLAUDE.md` if any new patterns needed
2. Create PR with migration notes
3. Test in staging before merge

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Type errors after upgrade | Medium | TypeScript will catch at compile time |
| Behavior changes in `generateObject` | Low | Comprehensive test suite |
| Provider-specific issues | Low | Anthropic is a primary provider |
| Rollback needed | Low | Can pin to v4 if issues found |

## Estimated Effort

- **Best case**: 30 minutes (just update packages, everything works)
- **Expected**: 1-2 hours (minor type fixes, testing)
- **Worst case**: Half day (unexpected behavior changes requiring investigation)

## References

- [AI SDK 5.0 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0)
- [AI SDK 5 Announcement](https://vercel.com/blog/ai-sdk-5)
- [Migration MCP Server](https://github.com/vercel-labs/ai-sdk-5-migration-mcp-server)
