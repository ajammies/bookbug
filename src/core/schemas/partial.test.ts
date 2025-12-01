import { describe, it, expect } from 'vitest';
import { hasCompleteBrief, hasCompletePlot } from './partial';
import type { PipelineState } from '../pipeline';
import type { StoryBrief, PlotStructure } from './index';

const minimalBrief: StoryBrief = {
  title: 'Test Story',
  storyArc: 'hero overcomes fear',
  setting: 'magical forest',
  ageRange: { min: 4, max: 8 },
  pageCount: 10,
  characters: [
    { name: 'Hero', description: 'brave child', role: 'protagonist', traits: ['brave'], notes: [] },
  ],
  interests: [],
};

const validPlot: PlotStructure = {
  storyArcSummary: 'Hero overcomes fear in the forest',
  plotBeats: [
    { purpose: 'setup', description: 'Hero enters forest' },
    { purpose: 'conflict', description: 'Hero faces fear' },
    { purpose: 'climax', description: 'Hero overcomes' },
    { purpose: 'payoff', description: 'Hero returns' },
  ],
  allowCreativeLiberty: true,
};

describe('hasCompleteBrief', () => {
  it('returns false when brief is undefined', () => {
    const state: PipelineState = { history: [] };
    expect(hasCompleteBrief(state)).toBe(false);
  });

  it('returns true when brief is defined', () => {
    const state: PipelineState = { history: [], brief: minimalBrief };
    expect(hasCompleteBrief(state)).toBe(true);
  });

  it('returns true when both brief and plot are present', () => {
    const state: PipelineState = { history: [], brief: minimalBrief, plot: validPlot };
    expect(hasCompleteBrief(state)).toBe(true);
  });
});

describe('hasCompletePlot', () => {
  it('returns false when brief is undefined', () => {
    const state: PipelineState = { history: [] };
    expect(hasCompletePlot(state)).toBe(false);
  });

  it('returns false when plot is undefined', () => {
    const state: PipelineState = { history: [], brief: minimalBrief };
    expect(hasCompletePlot(state)).toBe(false);
  });

  it('returns true when both brief and plot are defined', () => {
    const state: PipelineState = { history: [], brief: minimalBrief, plot: validPlot };
    expect(hasCompletePlot(state)).toBe(true);
  });
});
