import { describe, it, expect } from 'vitest';
import { hasCompleteStory, hasCompleteBrief, hasCompletePlot } from './partial';
import type { PipelineState } from '../pipeline';
import type { Story } from './story';

const validStory: Story = {
  title: 'Test Story',
  storyArc: 'hero overcomes fear',
  setting: 'magical forest',
  ageRange: { min: 4, max: 8 },
  pageCount: 10,
  characters: [
    { name: 'Hero', description: 'brave child', role: 'protagonist', traits: ['brave'], notes: [] },
  ],
  interests: [],
  plotBeats: [
    { purpose: 'setup', description: 'Hero enters forest' },
    { purpose: 'conflict', description: 'Hero faces fear' },
    { purpose: 'climax', description: 'Hero overcomes' },
    { purpose: 'payoff', description: 'Hero returns' },
  ],
  allowCreativeLiberty: true,
};

describe('hasCompleteStory', () => {
  it('returns false when story is undefined', () => {
    const state: PipelineState = {};
    expect(hasCompleteStory(state)).toBe(false);
  });

  it('returns true when story is defined', () => {
    const state: PipelineState = { story: validStory };
    expect(hasCompleteStory(state)).toBe(true);
  });
});

describe('legacy aliases', () => {
  it('hasCompleteBrief is alias for hasCompleteStory', () => {
    expect(hasCompleteBrief({})).toBe(false);
    expect(hasCompleteBrief({ story: validStory })).toBe(true);
  });

  it('hasCompletePlot is alias for hasCompleteStory', () => {
    expect(hasCompletePlot({})).toBe(false);
    expect(hasCompletePlot({ story: validStory })).toBe(true);
  });
});
