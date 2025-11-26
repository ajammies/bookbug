import { describe, it, expect } from 'vitest';
import {
  AgeRangeSchema,
  StoryCharacterSchema,
  StoryBriefSchema,
  ManuscriptPageSchema,
  ManuscriptSchema,
  StoryBlurbSchema,
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
      expect(result.data.traits).toEqual([]);
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

  it('applies default empty arrays for optional fields', () => {
    const result = StoryBriefSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interests).toEqual([]);
      expect(result.data.customInstructions).toEqual([]);
    }
  });
});

describe('ManuscriptPageSchema', () => {
  it('accepts valid page', () => {
    const result = ManuscriptPageSchema.safeParse({
      summary: 'Luna enters the garden',
      text: 'Luna pushed open the rusty gate.',
      imageConcept: 'A rabbit opening a garden gate',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty summary', () => {
    const result = ManuscriptPageSchema.safeParse({
      summary: '',
      text: 'Some text',
      imageConcept: 'Some concept',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty text', () => {
    const result = ManuscriptPageSchema.safeParse({
      summary: 'Summary',
      text: '',
      imageConcept: 'Some concept',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty imageConcept', () => {
    const result = ManuscriptPageSchema.safeParse({
      summary: 'Summary',
      text: 'Some text',
      imageConcept: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('ManuscriptSchema', () => {
  const validBlurb = {
    brief: {
      title: 'The Magic Garden',
      storyArc: 'Luna discovers a magical garden',
      setting: 'A hidden garden',
      ageRange: { min: 4, max: 8 },
      characters: [{ name: 'Luna', description: 'A curious rabbit' }],
    },
    plotBeats: ['Luna finds the garden', 'Luna makes a friend'],
    allowCreativeLiberty: true,
  };

  const validPage = {
    summary: 'Luna enters',
    text: 'Luna entered the garden.',
    imageConcept: 'Rabbit in garden',
  };

  const validManuscript = {
    blurb: validBlurb,
    title: 'The Magic Garden',
    logline: 'A rabbit discovers magic',
    theme: 'Curiosity and friendship',
    setting: 'A magical garden',
    ageRange: { min: 4, max: 8 },
    characters: [{ name: 'Luna', description: 'A curious rabbit' }],
    pages: [validPage, validPage, validPage, validPage, validPage, validPage, validPage, validPage],
    pageCount: 8,
  };

  it('accepts valid manuscript', () => {
    const result = ManuscriptSchema.safeParse(validManuscript);
    expect(result.success).toBe(true);
  });

  it('rejects when pages.length !== pageCount', () => {
    const result = ManuscriptSchema.safeParse({
      ...validManuscript,
      pageCount: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'pages.length must equal pageCount'
      );
    }
  });

  it('accepts optional fields', () => {
    const result = ManuscriptSchema.safeParse({
      ...validManuscript,
      moral: 'Be curious',
      tone: 'Whimsical',
      styleNotes: 'Soft colors',
    });
    expect(result.success).toBe(true);
  });
});

describe('StoryBlurbSchema', () => {
  const validBrief = {
    title: 'The Magic Garden',
    storyArc: 'Luna discovers a magical garden',
    setting: 'A hidden garden',
    ageRange: { min: 4, max: 8 },
    characters: [{ name: 'Luna', description: 'A curious rabbit' }],
  };

  it('accepts valid blurb', () => {
    const result = StoryBlurbSchema.safeParse({
      brief: validBrief,
      plotBeats: ['Beat 1', 'Beat 2'],
      allowCreativeLiberty: true,
    });
    expect(result.success).toBe(true);
  });

  it('applies default values', () => {
    const result = StoryBlurbSchema.safeParse({ brief: validBrief });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plotBeats).toEqual([]);
      expect(result.data.allowCreativeLiberty).toBe(true);
    }
  });
});
