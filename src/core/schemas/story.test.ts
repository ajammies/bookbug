/**
 * Tests for Story schema and policy utilities
 */
import { describe, it, expect } from 'vitest';
import {
  StorySchema,
  PlotBeatSchema,
  parseFieldPolicy,
  getCleanDescription,
  getFieldPolicies,
  getRequiredFields,
  getMissingRequiredFields,
  hasAllRequiredFields,
  type Story,
  type FieldPolicy,
} from './story';

describe('PlotBeatSchema', () => {
  it('validates a valid plot beat', () => {
    const beat = { purpose: 'setup', description: 'Luna lives in a cozy burrow' };
    expect(PlotBeatSchema.parse(beat)).toEqual(beat);
  });

  it('rejects invalid purpose', () => {
    expect(() => PlotBeatSchema.parse({ purpose: 'invalid', description: 'Test' })).toThrow();
  });

  it('rejects empty description', () => {
    expect(() => PlotBeatSchema.parse({ purpose: 'setup', description: '' })).toThrow();
  });
});

describe('StorySchema', () => {
  const validStory: Story = {
    title: 'Luna\'s Adventure',
    storyArc: 'A rabbit learns to be brave',
    setting: 'A magical forest',
    characters: [{ name: 'Luna', description: 'A curious little rabbit', traits: [], notes: [] }],
    plotBeats: [
      { purpose: 'setup', description: 'Luna lives peacefully' },
      { purpose: 'conflict', description: 'A storm approaches' },
      { purpose: 'climax', description: 'Luna finds courage' },
    ],
    pageCount: 24,
    interests: [],
    allowCreativeLiberty: true,
  };

  it('validates a complete story', () => {
    expect(StorySchema.parse(validStory)).toMatchObject(validStory);
  });

  it('applies default values', () => {
    const minimalStory = {
      title: 'Test',
      storyArc: 'Test arc',
      setting: 'Test setting',
      characters: [{ name: 'A', description: 'B', traits: [], notes: [] }],
      plotBeats: [
        { purpose: 'setup', description: '1' },
        { purpose: 'conflict', description: '2' },
        { purpose: 'climax', description: '3' },
      ],
    };
    const parsed = StorySchema.parse(minimalStory);
    expect(parsed.pageCount).toBe(24);
    expect(parsed.interests).toEqual([]);
    expect(parsed.allowCreativeLiberty).toBe(true);
  });

  it('rejects empty title', () => {
    expect(() => StorySchema.parse({ ...validStory, title: '' })).toThrow();
  });

  it('rejects fewer than 3 plot beats', () => {
    expect(() => StorySchema.parse({
      ...validStory,
      plotBeats: [{ purpose: 'setup', description: 'Only one' }],
    })).toThrow();
  });

  it('rejects empty characters array', () => {
    expect(() => StorySchema.parse({ ...validStory, characters: [] })).toThrow();
  });
});

describe('parseFieldPolicy', () => {
  it('returns "required" for [required] prefix', () => {
    expect(parseFieldPolicy('[required] Some description')).toBe('required');
  });

  it('returns "prompted" for [prompted] prefix', () => {
    expect(parseFieldPolicy('[prompted] Some description')).toBe('prompted');
  });

  it('returns "optional" for no prefix', () => {
    expect(parseFieldPolicy('Some description')).toBe('optional');
  });

  it('returns "optional" for undefined', () => {
    expect(parseFieldPolicy(undefined)).toBe('optional');
  });
});

describe('getCleanDescription', () => {
  it('removes [required] prefix', () => {
    expect(getCleanDescription('[required] Some description')).toBe('Some description');
  });

  it('removes [prompted] prefix', () => {
    expect(getCleanDescription('[prompted] Some description')).toBe('Some description');
  });

  it('returns description unchanged if no prefix', () => {
    expect(getCleanDescription('Some description')).toBe('Some description');
  });

  it('returns empty string for undefined', () => {
    expect(getCleanDescription(undefined)).toBe('');
  });
});

describe('getFieldPolicies', () => {
  it('extracts policies from schema', () => {
    const policies = getFieldPolicies(StorySchema);

    // Required fields
    expect(policies.title).toBe('required');
    expect(policies.storyArc).toBe('required');
    expect(policies.setting).toBe('required');
    expect(policies.characters).toBe('required');
    expect(policies.plotBeats).toBe('required');

    // Prompted fields
    expect(policies.ageRange).toBe('prompted');
    expect(policies.stylePreset).toBe('prompted');

    // Optional fields
    expect(policies.pageCount).toBe('optional');
    expect(policies.tone).toBe('optional');
    expect(policies.moral).toBe('optional');
  });
});

describe('getRequiredFields', () => {
  it('returns only required field names', () => {
    const required = getRequiredFields(StorySchema);
    expect(required).toContain('title');
    expect(required).toContain('storyArc');
    expect(required).toContain('setting');
    expect(required).toContain('characters');
    expect(required).toContain('plotBeats');
    expect(required).not.toContain('ageRange');
    expect(required).not.toContain('pageCount');
  });
});

describe('getMissingRequiredFields', () => {
  it('returns all required fields for empty draft', () => {
    const missing = getMissingRequiredFields({});
    expect(missing).toContain('title');
    expect(missing).toContain('storyArc');
    expect(missing).toContain('setting');
    expect(missing).toContain('characters');
    expect(missing).toContain('plotBeats');
  });

  it('returns empty array when all required fields filled', () => {
    const draft: Partial<Story> = {
      title: 'Test',
      storyArc: 'Test arc',
      setting: 'Test setting',
      characters: [{ name: 'A', description: 'B', traits: [], notes: [] }],
      plotBeats: [
        { purpose: 'setup', description: '1' },
        { purpose: 'conflict', description: '2' },
        { purpose: 'climax', description: '3' },
      ],
    };
    expect(getMissingRequiredFields(draft)).toEqual([]);
  });

  it('treats empty arrays as missing', () => {
    const draft: Partial<Story> = {
      title: 'Test',
      storyArc: 'Arc',
      setting: 'Setting',
      characters: [],
      plotBeats: [],
    };
    const missing = getMissingRequiredFields(draft);
    expect(missing).toContain('characters');
    expect(missing).toContain('plotBeats');
  });
});

describe('hasAllRequiredFields', () => {
  it('returns false for empty draft', () => {
    expect(hasAllRequiredFields({})).toBe(false);
  });

  it('returns true when all required fields filled', () => {
    const draft: Partial<Story> = {
      title: 'Test',
      storyArc: 'Test arc',
      setting: 'Test setting',
      characters: [{ name: 'A', description: 'B', traits: [], notes: [] }],
      plotBeats: [
        { purpose: 'setup', description: '1' },
        { purpose: 'conflict', description: '2' },
        { purpose: 'climax', description: '3' },
      ],
    };
    expect(hasAllRequiredFields(draft)).toBe(true);
  });
});
