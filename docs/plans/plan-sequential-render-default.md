# TDD: Add --parallel Flag with Sequential Default

## Overview

Currently the pipeline runs Phase 2 (visual direction) and Phase 3 (image rendering) in parallel using `Promise.all`. This causes rate limiting issues with Replicate API when users have low credit balances (< $5 reduces limit to 6 req/min).

This change adds a `--parallel` CLI flag that enables parallel execution. **Sequential execution becomes the default** to avoid rate limiting issues out of the box.

Key considerations:
- Only affects Phase 2 and Phase 3 (Phase 1 prose generation already sequential)
- Default to sequential for reliability
- `--parallel` flag enables parallel for users with higher rate limits
- Progress messages should reflect the current mode

## Approach

Add `parallel?: boolean` to `PipelineOptions`, default to `false`. Modify the two `Promise.all` blocks to conditionally use sequential loops when parallel is false.

Sequential over parallel as default because:
- Avoids rate limiting issues for most users
- More predictable behavior
- Users who want speed can opt-in with `--parallel`

## Planned Changes

| File | Change |
|------|--------|
| `src/core/pipeline.ts` | Add `parallel` to `PipelineOptions`, add sequential render logic |
| `src/cli/commands/resume.ts` | Add `--parallel` CLI flag |
| `src/cli/commands/create.ts` | Add `--parallel` CLI flag |
| `src/core/pipeline.test.ts` | Update tests for new default behavior |

## Commits

### 1. feat(pipeline): add parallel option with sequential default
Add `parallel?: boolean` to `PipelineOptions` (default false). Modify Phase 2 and Phase 3 to use sequential loops when parallel is false.

### 2. feat(cli): add --parallel flag to resume and create commands
Add `--parallel` CLI flag to enable parallel processing for users with higher API rate limits.

### 3. test(pipeline): update tests for sequential default
Update pipeline tests to reflect new default behavior.

## Testing Plan

**Manual verification:**
```bash
# Sequential (default) - should work without rate limits
npm run dev resume

# Parallel (opt-in) - faster but may hit rate limits
npm run dev resume --parallel
```

**Automated tests:**
- Run `npm run test:run && npm run typecheck`
- Verify progress messages say "sequentially" or "in parallel" based on flag
