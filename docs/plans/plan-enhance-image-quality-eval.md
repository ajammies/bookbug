# TDD: Enhance Image Quality Evaluation

## Overview

**Current State**: `imageQualityAgent` evaluates 3 dimensions (character consistency, environment consistency, AI artifacts) using Claude vision. No physical coherence check. No model flexibility. No benchmarking infrastructure.

**Target State**: Enhanced quality evaluation with:
1. 4th dimension: Physical scene coherence (impossible arrangements, gravity, proportions)
2. Configurable model (default GPT-4o, research shows higher accuracy)
3. Evaluation dataset infrastructure for model/prompt comparison

**Key Considerations**:
- Research shows GPT-4o has 0.775 correlation with human judgment vs Claude's lower scores
- Physical coherence is a distinct failure mode from AI artifacts (scene logic vs rendering errors)
- Benchmarking needs: save results, run on test sets, compare across runs
- Keep changes minimal - enhance existing system, don't replace it

## Approach

### 1. Add Physical Coherence Dimension

Add 4th scoring dimension to `ImageQualityResultSchema` and update agent prompt:

```typescript
// In render.ts schema
physicalCoherence: z.number()
  .describe('0-100: Physical plausibility. Check gravity, proportions, impossible object arrangements, spatial relationships')
```

Update overall score calculation to average 4 dimensions instead of 3.

### 2. Configurable Model

Add model option to `imageQualityAgent`:

```typescript
export interface ImageQualityOptions {
  qualityThreshold?: number;
  logger?: Logger;
  model?: 'claude' | 'gpt-4o';  // default: 'gpt-4o'
}
```

Use AI SDK's OpenAI provider when `model: 'gpt-4o'` is selected.

### 3. Evaluation Infrastructure

Create `eval` CLI command that:
- Runs quality checks on a folder of images
- Saves results with metadata (model, timestamp, config)
- Compares results across runs
- Outputs summary statistics

## Planned Changes

| File | Change | Reason |
|------|--------|--------|
| `src/core/schemas/render.ts` | Add `physicalCoherence` to `ImageQualityResultSchema` | 4th quality dimension |
| `src/core/agents/image-quality.ts` | Update prompt for physical coherence, add model option | Enhanced evaluation |
| `src/core/config.ts` | Add OpenAI model config for quality checks | GPT-4o support |
| `src/cli/commands/quality.ts` | Add `--model` flag, enhance output | Model selection |
| `src/cli/commands/eval.ts` | New command for batch evaluation and comparison | Benchmarking |

## Commits

### 1. feat(quality): add physical coherence dimension

Add 4th quality dimension to evaluate physical scene plausibility.
- Add `physicalCoherence` field to `ImageQualityResultSchema`
- Update `imageQualityAgent` prompt to evaluate gravity, proportions, impossible arrangements
- Update overall score calculation to average 4 dimensions

### 2. feat(quality): add configurable model with GPT-4o default

Allow model selection for quality checks, defaulting to GPT-4o for higher accuracy.
- Add `model` option to `ImageQualityOptions`
- Add OpenAI provider configuration
- Update quality CLI command with `--model` flag

### 3. feat(cli): add eval command for benchmarking

Add evaluation infrastructure for comparing models and prompts.
- Create `eval` command that runs quality checks on image folders
- Save results with metadata (model, timestamp, config)
- Add comparison mode to diff results across runs
- Output summary statistics (mean, std, pass rate)

## Testing Plan

- [ ] Existing quality tests pass with new dimension
- [ ] Manual test: physical coherence scores reasonable values
- [ ] Test GPT-4o model option works
- [ ] Test eval command on sample images
- [ ] Verify comparison output format

## Dependencies

- `@ai-sdk/openai` - Already in package.json, need to configure for vision
