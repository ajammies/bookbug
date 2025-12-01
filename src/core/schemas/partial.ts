import type { PipelineState } from '../pipeline';

// ============================================================================
// Stage Validators - Check if a stage can be skipped
// ============================================================================

/**
 * Check if state has complete brief (can skip intake stage)
 */
export const hasCompleteBrief = (state: PipelineState): boolean =>
  state.brief !== undefined;

/**
 * Check if state has complete plot (can skip plot stage)
 */
export const hasCompletePlot = (state: PipelineState): boolean =>
  state.brief !== undefined && state.plot !== undefined;
