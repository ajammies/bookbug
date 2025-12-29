import type { PipelineState } from '../pipeline';

// ============================================================================
// Stage Validators - Check if a stage can be skipped
// ============================================================================

/**
 * Check if state has complete story (can skip draft stage)
 */
export const hasCompleteStory = (state: PipelineState): boolean =>
  state.story !== undefined;

// Legacy aliases for backward compatibility
export const hasCompleteBrief = hasCompleteStory;
export const hasCompletePlot = hasCompleteStory;
