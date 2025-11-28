# Plan: Incremental Page-by-Page Pipeline

## Goal
Change the pipeline execution to process pages one at a time after getting the plot, while generating the visual style guide upfront.

## Current Flow (Batch)
```
StoryWithPlot
    → proseAgent() → Prose (ALL pages at once)
    → visualsAgent() → VisualDirection (style + ALL illustrated pages)
    → for each page: renderPage()
```

## Proposed Flow (Incremental)
```
StoryWithPlot
    → styleGuideAgent() → VisualStyleGuide (once, upfront)
    → for each page:
        → prosePageAgent() → ProsePage (single page)
        → pageVisualsAgent() → IllustratedPage (single page)
        → renderPage() → RenderedPage
    → assemble final book
```

## Key Changes

### 1. Split `visualsAgent` into Two Agents
- **`styleGuideAgent`**: Generates `VisualStyleGuide` (art direction, setting, character designs)
  - Input: `StoryWithPlot`
  - Output: `VisualStyleGuide`
  - Called once at pipeline start

- **`pageVisualsAgent`**: Generates `IllustratedPage` for a single page
  - Input: `{ story: StoryWithPlot, styleGuide: VisualStyleGuide, pageNumber: number, prosePage: ProsePage }`
  - Output: `IllustratedPage`
  - Called once per page

### 2. Split `proseAgent` into Setup + Per-Page
- **`proseSetupAgent`**: Generates logline, theme (story-wide prose metadata)
  - Input: `StoryWithPlot`
  - Output: `{ logline: string, theme: string }`
  - Called once at pipeline start

- **`prosePageAgent`**: Generates prose for a single page
  - Input: `{ story: StoryWithPlot, proseSetup: { logline, theme }, pageNumber: number, previousPages: ProsePage[] }`
  - Output: `ProsePage`
  - Called once per page, with context of previous pages for coherence

### 3. New Pipeline Function: `executeIncrementalPipeline`
```typescript
export async function executeIncrementalPipeline(
  storyWithPlot: StoryWithPlot,
  options: IncrementalPipelineOptions = {}
): Promise<PipelineResult>
```

Options include:
- `onPageComplete?: (pageNumber: number, page: RenderedPage) => void` - callback after each page
- `onProgress?: OnStepProgress` - existing progress callback
- `outputManager?: StoryOutputManager` - for saving artifacts
- `stopAfter?: 'prose' | 'visuals' | 'book'` - early termination

### 4. Update `executePipeline` to Use Incremental by Default
Keep the existing function signature but change internal implementation.

## Files to Change

| File | Changes |
|------|---------|
| `src/core/schemas/prose.ts` | No change needed - `ProsePage` already exists |
| `src/core/schemas/visuals.ts` | No change needed - schemas already modular |
| `src/core/agents/prose.ts` | Add `proseSetupAgent`, `prosePageAgent` |
| `src/core/agents/visuals.ts` | Add `styleGuideAgent`, `pageVisualsAgent` |
| `src/core/agents/index.ts` | Export new agents |
| `src/core/pipeline.ts` | Implement incremental execution flow |
| `src/core/pipeline.test.ts` | Update tests for incremental flow |

## Implementation Steps

1. **Add `proseSetupAgent` and `prosePageAgent`** in `prose.ts`
   - Setup agent extracts logline/theme from plot
   - Page agent generates one page with context of previous pages

2. **Add `styleGuideAgent` and `pageVisualsAgent`** in `visuals.ts`
   - Style guide agent generates visual style from story
   - Page visuals agent creates beats for one page

3. **Update `pipeline.ts`** with incremental execution
   - Generate style guide upfront
   - Generate prose setup upfront
   - Loop through pages: prose → visuals → render
   - Assemble final composed story and book

4. **Update tests** to verify incremental behavior

5. **Update CLI** if needed (progress callbacks may need adjustment)

## Test Strategy

- Unit tests for new per-page agents
- Integration test verifying page-by-page execution order
- Test that `onPageComplete` callback fires after each page
- Test that early pages provide context for later pages
- Verify final output matches batch pipeline output structure

## Benefits

1. **Memory efficiency**: Don't hold all pages in memory at once
2. **Better progress UX**: Can show each page as it completes
3. **Fail-fast**: Errors in page N don't waste work on pages N+1...
4. **Streaming potential**: Could stream pages to user as they complete
