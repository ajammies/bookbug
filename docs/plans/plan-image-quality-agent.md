# Plan: Image Quality Agent

## Goal
Analyze rendered images for quality issues (character/environment consistency, AI artifacts). Score them, save results, retry if below threshold.

## Atomic Commits

### Commit 1: Add ImageQualityResult schema
- `src/core/schemas/render.ts` - Add schema with score, issues, passesQualityBar
- `src/core/schemas/index.ts` - Export it

### Commit 2: Create imageQualityAgent
- `src/core/agents/image-quality.ts` - Vision agent analyzes image vs context
- `src/core/agents/index.ts` - Export it

### Commit 3: Add quality result saving to output manager
- `src/cli/utils/output.ts` - Add `saveQualityResult(pageNumber, result)` method
- Saves to `assets/quality/page-N.json`

### Commit 4: Integrate quality check into image generation
- `src/core/services/image-generation.ts` - Add optional quality check after render
- Returns `{ url, quality? }`
- Retry logic if `!passesQualityBar` (up to 2 retries)
- Save failed images to `assets/failed/` for debugging

### Commit 5: Wire up in pipeline with options
- `src/core/pipeline.ts` - Pass quality options through
- `src/core/pipeline.ts` - Save quality results via outputManager

### Commit 6: Add tests
- `src/core/agents/image-quality.test.ts`
- Update `src/core/services/image-generation.test.ts`

## Key Design Decisions
- Quality threshold: 70 (configurable)
- Max retries: 2
- Save ALL quality results (pass or fail)
- Save failed images separately for debugging
- Vision model analyzes image URL directly
