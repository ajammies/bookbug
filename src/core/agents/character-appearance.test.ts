import { describe, it, expect, vi, beforeEach } from 'vitest';
import { characterAppearanceAgent, generateCharacterAppearances } from './character-appearance';
import type { StoryCharacter, VisualStyleGuide, CharacterAppearance } from '../schemas';

vi.mock('../services/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/ai')>();
  return {
    ...actual,
    generateObject: vi.fn(),
  };
});

vi.mock('../config', () => ({
  getModel: vi.fn(() => 'mock-model'),
}));

import { generateObject } from '../services/ai';

const mockGenerateObject = vi.mocked(generateObject);

// Helper to create mock GenerateObjectResult
const mockResult = <T>(object: T) => ({ object }) as unknown as Awaited<ReturnType<typeof generateObject>>;

const minimalStyleGuide: VisualStyleGuide = {
  art_style: {
    genre: ['childrens-illustration'],
    medium: ['digital illustration'],
    technique: ['soft edges'],
  },
  setting: {
    landmarks: [],
    diegetic_lights: [],
  },
};

const minimalCharacter: StoryCharacter = {
  name: 'Luna',
  description: 'A curious young rabbit who loves adventure',
  personalityTraits: [],
  notes: [],
};

const completeAppearance: CharacterAppearance = {
  eyeStyle: 'large round brown eyes',
  hairStyle: 'fluffy white fur on head',
  skinTone: 'soft white fur',
  bodyType: 'small and round, toddler proportions',
  clothing: 'blue overalls with a yellow star patch',
  accessories: ['tiny red backpack'],
  distinctiveFeatures: ['pink nose', 'floppy ears'],
};

describe('characterAppearanceAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates complete appearance for character with no existing appearance', async () => {
    mockGenerateObject.mockResolvedValue(mockResult(completeAppearance));

    const result = await characterAppearanceAgent(minimalCharacter, minimalStyleGuide);

    expect(result).toEqual(completeAppearance);
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Luna'),
      }),
      undefined
    );
  });

  it('preserves existing appearance values', async () => {
    const existingAppearance: Partial<CharacterAppearance> = {
      eyeStyle: 'big blue button eyes',
      clothing: 'red dress with white polka dots',
    };
    const characterWithAppearance: StoryCharacter = {
      ...minimalCharacter,
      appearance: existingAppearance as CharacterAppearance,
    };

    mockGenerateObject.mockResolvedValue(mockResult(completeAppearance));

    const result = await characterAppearanceAgent(characterWithAppearance, minimalStyleGuide);

    // Existing values should be preserved
    expect(result.eyeStyle).toBe('big blue button eyes');
    expect(result.clothing).toBe('red dress with white polka dots');
    // Generated values should fill gaps
    expect(result.hairStyle).toBe(completeAppearance.hairStyle);
    expect(result.skinTone).toBe(completeAppearance.skinTone);
    expect(result.bodyType).toBe(completeAppearance.bodyType);
  });

  it('preserves existing accessories array when not empty', async () => {
    const characterWithAccessories: StoryCharacter = {
      ...minimalCharacter,
      appearance: {
        accessories: ['round glasses', 'magic wand'],
        distinctiveFeatures: [],
      } as CharacterAppearance,
    };

    mockGenerateObject.mockResolvedValue(mockResult(completeAppearance));

    const result = await characterAppearanceAgent(characterWithAccessories, minimalStyleGuide);

    expect(result.accessories).toEqual(['round glasses', 'magic wand']);
    // Empty distinctiveFeatures should be filled from generated
    expect(result.distinctiveFeatures).toEqual(completeAppearance.distinctiveFeatures);
  });

  it('includes style guide context in system prompt', async () => {
    const styleGuide: VisualStyleGuide = {
      art_style: {
        genre: ['watercolor', 'minimalist'],
        medium: ['hand-painted'],
        technique: ['simple shapes', 'soft colors'],
      },
      setting: {
        landmarks: [],
        diegetic_lights: [],
      },
    };

    mockGenerateObject.mockResolvedValue(mockResult(completeAppearance));

    await characterAppearanceAgent(minimalCharacter, styleGuide);

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('watercolor'),
      }),
      undefined
    );
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('simple shapes'),
      }),
      undefined
    );
  });

  it('includes character species in prompt', async () => {
    const robotCharacter: StoryCharacter = {
      ...minimalCharacter,
      name: 'Beep',
      description: 'A friendly helper robot',
      species: 'robot',
    };

    mockGenerateObject.mockResolvedValue(mockResult(completeAppearance));

    await characterAppearanceAgent(robotCharacter, minimalStyleGuide);

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('robot'),
      }),
      undefined
    );
  });

  it('includes character role in prompt', async () => {
    const sidekickCharacter: StoryCharacter = {
      ...minimalCharacter,
      role: 'sidekick',
    };

    mockGenerateObject.mockResolvedValue(mockResult(completeAppearance));

    await characterAppearanceAgent(sidekickCharacter, minimalStyleGuide);

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('sidekick'),
      }),
      undefined
    );
  });

  it('passes logger to generateObject', async () => {
    const logger = { debug: vi.fn() } as unknown as Parameters<typeof characterAppearanceAgent>[2];
    mockGenerateObject.mockResolvedValue(mockResult(completeAppearance));

    await characterAppearanceAgent(minimalCharacter, minimalStyleGuide, logger);

    expect(mockGenerateObject).toHaveBeenCalledWith(expect.any(Object), logger);
  });
});

describe('generateCharacterAppearances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enriches all characters in array', async () => {
    const characters: StoryCharacter[] = [
      { ...minimalCharacter, name: 'Luna' },
      { ...minimalCharacter, name: 'Max', species: 'dog' },
    ];

    mockGenerateObject.mockResolvedValue(mockResult(completeAppearance));

    const result = await generateCharacterAppearances(characters, minimalStyleGuide);

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe('Luna');
    expect(result[0]?.appearance).toEqual(completeAppearance);
    expect(result[1]?.name).toBe('Max');
    expect(result[1]?.appearance).toEqual(completeAppearance);
    expect(mockGenerateObject).toHaveBeenCalledTimes(2);
  });

  it('preserves all other character fields', async () => {
    const characterWithExtras: StoryCharacter = {
      ...minimalCharacter,
      role: 'protagonist',
      species: 'rabbit',
      personalityTraits: [{ key: 'core', value: 'curious' }],
      notes: ['Main character'],
    };

    mockGenerateObject.mockResolvedValue(mockResult(completeAppearance));

    const result = await generateCharacterAppearances([characterWithExtras], minimalStyleGuide);

    expect(result[0]?.role).toBe('protagonist');
    expect(result[0]?.species).toBe('rabbit');
    expect(result[0]?.personalityTraits).toEqual([{ key: 'core', value: 'curious' }]);
    expect(result[0]?.notes).toEqual(['Main character']);
  });

  it('returns empty array for empty input', async () => {
    const result = await generateCharacterAppearances([], minimalStyleGuide);

    expect(result).toEqual([]);
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });
});
