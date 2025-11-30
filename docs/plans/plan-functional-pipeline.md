# Plan: Simple Pipeline Refactor

## Goal
Unify create and resume with a single pipeline that takes state and fills in what's missing.

## Approach: PipelineState + Fill-in-the-nulls

```typescript
interface PipelineState {
  // Foundation (at least brief required to start)
  brief: StoryBrief;
  plot?: PlotStructure;

  // Setup artifacts
  styleGuide?: VisualStyleGuide;
  proseSetup?: ProseSetup;
  characterDesigns?: CharacterDesign[];

  // Content (per-page)
  prosePages?: ProsePage[];
  illustratedPages?: IllustratedPage[];

  // Rendered
  renderedPages?: RenderedPage[];
  heroPage?: RenderedPage;  // first rendered page, anchors style
}

// Single entry point
runPipelineIncremental(state: PipelineState, options?: PipelineOptions)
  → Promise<{ story: ComposedStory; book: RenderedBook }>
```

Inside `runPipelineIncremental`:
```typescript
const plot = state.plot ?? await generatePlot(state.brief);
const storyWithPlot = assembleStoryWithPlot(state.brief, plot);
const styleGuide = state.styleGuide ?? await generateStyleGuide(storyWithPlot);
const proseSetup = state.proseSetup ?? await generateProseSetup(storyWithPlot);
const characterDesigns = state.characterDesigns ?? await generateCharacterDesigns(...);
// ... etc for each stage
```

## Usage

**Create command:**
```typescript
const state = { brief, plot };  // after intake, has brief + plot
const { story, book } = await runPipelineIncremental(state, options);
```

**Resume command:**
```typescript
const state = loadPipelineState(folder);  // loads whatever exists from disk
const { story, book } = await runPipelineIncremental(state, options);
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/core/pipeline.ts` | Add `PipelineState`, `runPipelineIncremental`, delete old functions |
| `src/cli/commands/resume.ts` | Add `loadPipelineState`, simplify to single call |
| `src/cli/commands/create.ts` | Call `runPipelineIncremental({ storyWithPlot })` |

## Implementation Steps

1. Add `PipelineState` interface
2. Add `runPipelineIncremental` with null-coalescing for each stage
3. Add `loadPipelineState(folder)` helper to build state from disk
4. Update create.ts
5. Update resume.ts
6. Delete old `executePipeline` and `executeIncrementalPipeline`
7. Update tests

## Key Points

- Single state object, single entry point
- Each field: use if exists, generate if missing
- `loadPipelineState` reads whatever JSONs exist and builds state
- No type detection magic - explicit fields
