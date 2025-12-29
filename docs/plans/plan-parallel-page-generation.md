# TDD: Parallelize Page Generation

## Overview

**Current State**: Pipeline processes pages sequentially - for each page: prose → visuals → render. This is slow for books with many pages.

**Target State**: Three-phase pipeline with parallelization where possible:
1. Generate all prose pages (sequential - `previousPages` dependency)
2. Generate all visual pages in parallel (`Promise.all`)
3. Render all pages in parallel (heroPage first, then rest)

**Key Considerations**:
- `prosePageAgent` needs `previousPages` context - must stay sequential
- `pageVisualsAgent` only needs its own `prosePage` - can parallelize
- `renderPage` needs heroPage URL for style consistency - first page first
- Progress UI should show meaningful updates for each phase

## Approach

Restructure `runPipelineIncremental` from a single loop to three phases:

```typescript
// Phase 1: Prose (sequential)
for (page of pages) {
  prosePage = await prosePageAgent({ previousPages })
  prosePages.push(prosePage)
}

// Phase 2: Visuals (parallel)
illustratedPages = await Promise.all(
  prosePages.map((prosePage, i) =>
    pageVisualsAgent({ pageNumber: i + 1, prosePage })
  )
)

// Phase 3: Render (parallel, heroPage first)
heroPage = await renderPage(story, 1, options)
restPages = await Promise.all(
  [2..pageCount].map(i => renderPage(story, i, { heroPageUrl: heroPage.url }))
)
```

**Why this approach**:
- Maximizes parallelism within API constraints
- Clean phase separation for progress reporting
- Maintains incremental save capability between phases

## Planned Changes

| File | Change | Reason |
|------|--------|--------|
| `src/core/pipeline.ts` | Restructure `runPipelineIncremental` into 3 phases | Enable parallelization |

## Commits

### 1. feat(pipeline): parallelize page visual and render generation

Restructure `runPipelineIncremental` into three phases:
- Phase 1: Generate all prose pages sequentially (previousPages dependency)
- Phase 2: Generate all page visuals in parallel with Promise.all
- Phase 3: Render pages in parallel (heroPage first for consistency)

Closes #102

## Testing Plan

- [ ] All existing pipeline tests pass
- [ ] Manual test: book generation completes successfully
- [ ] Verify parallel execution in logs (pages processing concurrently)
- [ ] Progress UI shows phase-appropriate messages
