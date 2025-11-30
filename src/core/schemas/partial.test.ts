import { describe, it, expect } from 'vitest';
import {
  PartialStorySchema,
  hasCompleteBrief,
  hasCompletePlot,
  hasCompleteProse,
  hasCompleteVisuals,
  type PartialStory,
} from './partial';

const minimalBrief: PartialStory = {
  title: 'Test Story',
  storyArc: 'hero overcomes fear',
  setting: 'magical forest',
  ageRange: { min: 4, max: 8 },
  pageCount: 10,
  characters: [
    { name: 'Hero', description: 'brave child', role: 'protagonist', traits: ['brave'], notes: [] },
  ],
};

const withPlot: PartialStory = {
  ...minimalBrief,
  plot: {
    storyArcSummary: 'Hero overcomes fear in the forest',
    plotBeats: [
      { purpose: 'setup', description: 'Hero enters forest' },
      { purpose: 'conflict', description: 'Hero faces fear' },
      { purpose: 'climax', description: 'Hero overcomes' },
      { purpose: 'payoff', description: 'Hero returns' },
    ],
    allowCreativeLiberty: true,
  },
};

describe('PartialStorySchema', () => {
  it('accepts empty object', () => {
    const result = PartialStorySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial brief fields', () => {
    const result = PartialStorySchema.safeParse({ title: 'Test' });
    expect(result.success).toBe(true);
  });

  it('accepts complete story', () => {
    const result = PartialStorySchema.safeParse(withPlot);
    expect(result.success).toBe(true);
  });
});

describe('hasCompleteBrief', () => {
  it('returns false for empty story', () => {
    expect(hasCompleteBrief({})).toBe(false);
  });

  it('returns false for incomplete brief', () => {
    expect(hasCompleteBrief({ title: 'Test' })).toBe(false);
  });

  it('returns true for complete brief', () => {
    expect(hasCompleteBrief(minimalBrief)).toBe(true);
  });

  it('returns true when plot is also present', () => {
    expect(hasCompleteBrief(withPlot)).toBe(true);
  });
});

describe('hasCompletePlot', () => {
  it('returns false for brief without plot', () => {
    expect(hasCompletePlot(minimalBrief)).toBe(false);
  });

  it('returns true for story with plot', () => {
    expect(hasCompletePlot(withPlot)).toBe(true);
  });
});

describe('hasCompleteProse', () => {
  it('returns false without prose', () => {
    expect(hasCompleteProse(withPlot)).toBe(false);
  });
});

describe('hasCompleteVisuals', () => {
  it('returns false without visuals', () => {
    expect(hasCompleteVisuals(withPlot)).toBe(false);
  });
});
