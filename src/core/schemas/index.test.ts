import { describe, it, expect } from 'vitest';
import {
  AgeRangeSchema,
  StoryCharacterSchema,
  StoryBriefSchema,
  ProsePageSchema,
  PlotBeatSchema,
  PlotBeatPurposeSchema,
} from './index';

describe('AgeRangeSchema', () => {
  it('accepts valid age range', () => {
    const result = AgeRangeSchema.safeParse({ min: 4, max: 8 });
    expect(result.success).toBe(true);
  });

  it('accepts same min and max', () => {
    const result = AgeRangeSchema.safeParse({ min: 5, max: 5 });
    expect(result.success).toBe(true);
  });

  it('rejects min > max', () => {
    const result = AgeRangeSchema.safeParse({ min: 8, max: 4 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'ageRange.min must be <= ageRange.max'
      );
    }
  });

  it('rejects min below 2', () => {
    const result = AgeRangeSchema.safeParse({ min: 1, max: 8 });
    expect(result.success).toBe(false);
  });

  it('rejects max above 12', () => {
    const result = AgeRangeSchema.safeParse({ min: 4, max: 15 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer values', () => {
    const result = AgeRangeSchema.safeParse({ min: 4.5, max: 8 });
    expect(result.success).toBe(false);
  });
});

describe('StoryCharacterSchema', () => {
  it('accepts valid character with all fields', () => {
    const result = StoryCharacterSchema.safeParse({
      name: 'Luna',
      description: 'A curious rabbit',
      role: 'protagonist',
      traits: ['curious', 'brave'],
      notes: ['Loves carrots'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal character (name and description only)', () => {
    const result = StoryCharacterSchema.safeParse({
      name: 'Luna',
      description: 'A curious rabbit',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.personalityTraits).toEqual([]);
      expect(result.data.visualTraits).toEqual([]);
      expect(result.data.notes).toEqual([]);
    }
  });

  it('rejects empty name', () => {
    const result = StoryCharacterSchema.safeParse({
      name: '',
      description: 'A curious rabbit',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    const result = StoryCharacterSchema.safeParse({
      name: 'Luna',
      description: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('StoryBriefSchema', () => {
  const validBrief = {
    title: 'The Magic Garden',
    storyArc: 'Luna discovers a magical garden',
    setting: 'A hidden garden behind an old cottage',
    ageRange: { min: 4, max: 8 },
    characters: [{ name: 'Luna', description: 'A curious rabbit' }],
  };

  it('accepts valid brief with all required fields', () => {
    const result = StoryBriefSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
  });

  it('applies default pageCount of 24', () => {
    const result = StoryBriefSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageCount).toBe(24);
    }
  });

  it('accepts custom pageCount within range', () => {
    const result = StoryBriefSchema.safeParse({ ...validBrief, pageCount: 16 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageCount).toBe(16);
    }
  });

  it('rejects pageCount below 8', () => {
    const result = StoryBriefSchema.safeParse({ ...validBrief, pageCount: 4 });
    expect(result.success).toBe(false);
  });

  it('rejects pageCount above 32', () => {
    const result = StoryBriefSchema.safeParse({ ...validBrief, pageCount: 64 });
    expect(result.success).toBe(false);
  });

  it('rejects empty characters array', () => {
    const result = StoryBriefSchema.safeParse({ ...validBrief, characters: [] });
    expect(result.success).toBe(false);
  });

  it('applies defaults for optional fields', () => {
    const result = StoryBriefSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interests).toEqual([]);
      expect(result.data.customInstructions).toBeUndefined();
    }
  });
});

describe('ProsePageSchema', () => {
  it('accepts valid page', () => {
    const result = ProsePageSchema.safeParse({
      summary: 'Luna enters the garden',
      text: 'Luna pushed open the rusty gate.',
      imageConcept: 'A rabbit opening a garden gate',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty summary', () => {
    const result = ProsePageSchema.safeParse({
      summary: '',
      text: 'Some text',
      imageConcept: 'Some concept',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty text', () => {
    const result = ProsePageSchema.safeParse({
      summary: 'Summary',
      text: '',
      imageConcept: 'Some concept',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty imageConcept', () => {
    const result = ProsePageSchema.safeParse({
      summary: 'Summary',
      text: 'Some text',
      imageConcept: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('PlotBeatSchema', () => {
  it('accepts valid plot beat', () => {
    const result = PlotBeatSchema.safeParse({
      purpose: 'setup',
      description: 'Luna finds the garden',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid purposes', () => {
    const purposes = ['setup', 'build', 'conflict', 'twist', 'climax', 'payoff', 'button'];
    for (const purpose of purposes) {
      const result = PlotBeatPurposeSchema.safeParse(purpose);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid purpose', () => {
    const result = PlotBeatSchema.safeParse({
      purpose: 'invalid',
      description: 'Some beat',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    const result = PlotBeatSchema.safeParse({
      purpose: 'setup',
      description: '',
    });
    expect(result.success).toBe(false);
  });
});
