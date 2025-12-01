# Plan: Unified Pipeline with Intake/Plot Stages

## Goal
Move intake and plot conversation stages into the pipeline, enabling:
- Paste-to-render: paste full story → skip to rendering
- Single extractor agent for all parsing
- Conversation history flows between stages
- Delete cli/prompts - all logic lives in pipeline

## Prerequisites (already merged)
- `withOptionsResponse` composable pattern (PR #71)
- `PartialStorySchema` + stage validators (PR #72)
- `showSelector` utility in `src/utils/cli/` (PR #74)

## Design Principles (from code-rules)

- **Pure functions**: Stage functions take state in, return new state out
- **Easy to delete**: Each stage is self-contained, no tentacles
- **Schema-first**: Define Zod schema before writing agent prompt
- **Trust the model**: Don't over-prescribe extraction logic

## Design

### 1. ExtractorAgent (outputs PartialStory)
Schema-first approach - define what we extract:
```typescript
// Schema defines the contract
const ExtractedFieldsSchema = PartialStorySchema;  // Reuse existing

// Agent is a pure function: (input, context) → output
export const extractorAgent = async (
  userMessage: string,
  currentStory: PartialStory = {},
  options?: { availableStyles?: string[]; logger?: Logger }
): Promise<PartialStory>
```
- Outputs `PartialStory` (named after output pattern)
- Replaces `interpreterAgent` and `plotInterpreterAgent`
- Trust LLM to extract what's mentioned, omit what isn't

### 2. Stage Functions (pure, easy to delete)
Each stage is a pure function: `(state, options) → state`
```typescript
// Pure function - no side effects, just transforms state
const runIntakeStage = async (
  state: StageState,
  options: StageOptions
): Promise<StageState> => {
  if (hasCompleteBrief(state.story)) return state;  // Skip if complete
  // ... conversation loop
  return { story: updatedStory, history: newHistory };
};
```

### 3. Unified Entry Point
```typescript
export const runPipeline = async (
  initialInput: string | PartialStory,
  options: UnifiedPipelineOptions
): Promise<{ story: ComposedStory; book: RenderedBook }>
```

### 4. PromptUser Callback (dependency injection)
Pipeline doesn't know about CLI - receives callback:
```typescript
type PromptUser = (config: PromptConfig) => Promise<string>;

interface PromptConfig {
  question: string;
  options: string[];
}
```
CLI provides: `(config) => showSelector(config)`

## Files to Change

| Action | File | Description |
|--------|------|-------------|
| Create | `src/core/agents/extractor.ts` | Pure extractor agent |
| Create | `src/core/agents/extractor.test.ts` | Co-located tests |
| Modify | `src/core/pipeline.ts` | Add pure stage functions |
| Modify | `src/core/agents/index.ts` | Export extractor |
| Modify | `src/cli/commands/create.ts` | Thin wrapper with showSelector |
| Modify | `src/cli/commands/resume.ts` | Use runPipeline for brief case |
| Delete | `src/cli/prompts/story-intake.ts` | Logic moved to pipeline |
| Delete | `src/cli/prompts/plot-intake.ts` | Logic moved to pipeline |
| Modify | `docs/ARCHITECTURE.md` | Document extractorAgent |

## Implementation Order

1. **ExtractorAgent** - Schema-first, pure function, with co-located tests
2. **Pipeline stages** - Pure functions with history passing
3. **runPipeline** - Unified entry point with dependency injection
4. **CLI simplification** - Thin wrappers, delete prompts
5. **Docs** - Update ARCHITECTURE.md

## Code Rules Checklist
- [ ] Pure functions (state in → state out)
- [ ] Schema-first for extractorAgent
- [ ] Co-located tests (extractor.test.ts)
- [ ] Easy to delete (stages are self-contained)
- [ ] Dependency injection (PromptUser callback)
- [ ] Trust the model (simple extraction prompt)
