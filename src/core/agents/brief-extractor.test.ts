import { describe, it, expect, vi, beforeEach } from 'vitest';
import { briefExtractorAgent } from './brief-extractor';
import type { StoryBrief } from '../schemas';

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

describe('briefExtractorAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts story fields from Q&A pair', async () => {
    const extracted: Partial<StoryBrief> = { title: 'Luna the Brave', storyArc: 'A rabbit finds courage' };
    mockGenerateObject.mockResolvedValue(mockResult(extracted));

    const result = await briefExtractorAgent(
      'What would you like to call your story?',
      'Luna the Brave - about a rabbit finding courage'
    );

    expect(result.brief).toEqual(extracted);
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Question:'),
      }),
      undefined,
      'extractAgent'
    );
  });

  it('merges extracted fields with current brief', async () => {
    const current: Partial<StoryBrief> = { title: 'Luna the Brave' };
    const extracted: Partial<StoryBrief> = { storyArc: 'A rabbit finds courage' };
    mockGenerateObject.mockResolvedValue(mockResult(extracted));

    const result = await briefExtractorAgent(
      'What is the story about?',
      'She discovers her inner strength',
      current
    );

    expect(result.brief).toEqual({ title: 'Luna the Brave', storyArc: 'A rabbit finds courage' });
  });

  it('includes current brief context in prompt', async () => {
    const current: Partial<StoryBrief> = { title: 'Luna the Brave' };
    mockGenerateObject.mockResolvedValue(mockResult({}));

    await briefExtractorAgent('How many pages?', '12 pages', current);

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Current brief:'),
      }),
      undefined,
      'extractAgent'
    );
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Luna the Brave'),
      }),
      undefined,
      'extractAgent'
    );
  });

  it('handles empty current brief', async () => {
    const extracted: Partial<StoryBrief> = { title: 'New Story' };
    mockGenerateObject.mockResolvedValue(mockResult(extracted));

    const result = await briefExtractorAgent(
      'What title?',
      'New Story',
      {}
    );

    expect(result.brief).toEqual(extracted);
    // Should not include "Current brief:" when empty
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.not.stringContaining('Current brief:'),
      }),
      undefined,
      'extractAgent'
    );
  });

  it('includes available styles in system prompt', async () => {
    mockGenerateObject.mockResolvedValue(mockResult({}));

    await briefExtractorAgent(
      'What style?',
      'watercolor',
      {},
      { availableStyles: ['watercolor', 'digital'] }
    );

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('watercolor'),
      }),
      undefined,
      'extractAgent'
    );
  });

  it('passes logger to generateObject', async () => {
    const logger = { debug: vi.fn(), warn: vi.fn() } as unknown as NonNullable<Parameters<typeof briefExtractorAgent>[3]>['logger'];
    mockGenerateObject.mockResolvedValue(mockResult({}));

    await briefExtractorAgent('Question?', 'Answer', {}, { logger });

    expect(mockGenerateObject).toHaveBeenCalledWith(expect.any(Object), logger, 'extractAgent');
  });

  it('extracts from confirmation answers', async () => {
    const current: Partial<StoryBrief> = { storyArc: 'A rabbit adventure' };
    const extracted: Partial<StoryBrief> = { title: "Luna's Big Day" };
    mockGenerateObject.mockResolvedValue(mockResult(extracted));

    // User confirms a title suggested in the question
    const result = await briefExtractorAgent(
      'How about "Luna\'s Big Day" for the title?',
      'Yes, that sounds great!',
      current
    );

    expect(result.brief.title).toBe("Luna's Big Day");
    expect(result.brief.storyArc).toBe('A rabbit adventure');
  });

  it('overwrites fields with new extractions', async () => {
    const current: Partial<StoryBrief> = { title: 'Old Title', pageCount: 12 };
    const extracted: Partial<StoryBrief> = { title: 'New Title' };
    mockGenerateObject.mockResolvedValue(mockResult(extracted));

    const result = await briefExtractorAgent(
      'What title?',
      'Change it to New Title',
      current
    );

    expect(result.brief.title).toBe('New Title');
    expect(result.brief.pageCount).toBe(12);
  });

  // Bug reproduction tests for issue #96
  describe('character extraction (issue #96)', () => {
    it('merges new characters with existing characters instead of overwriting', async () => {
      // Turn 1: User mentioned protagonist
      const current: Partial<StoryBrief> = {
        title: 'Transcendence',
        characters: [
          { name: 'Samus Maximus', description: 'A rogue trader protagonist', role: 'protagonist', traits: [], notes: [] }
        ]
      };

      // Turn 2: User adds a sidekick - extraction returns only the new character
      const extracted: Partial<StoryBrief> = {
        characters: [
          { name: 'Tech-Priest', description: 'An adeptus mechanicus sidekick', role: 'sidekick', traits: [], notes: [] }
        ]
      };
      mockGenerateObject.mockResolvedValue(mockResult(extracted));

      const result = await briefExtractorAgent(
        'Any other characters?',
        'Add an adeptus mechanicus sidekick who provides weapons',
        current
      );

      // Should have BOTH characters, not just the new one
      expect(result.brief.characters).toHaveLength(2);
      expect(result.brief.characters?.map(c => c.name)).toContain('Samus Maximus');
      expect(result.brief.characters?.map(c => c.name)).toContain('Tech-Priest');
    });

    it('does not drop characters that have description but no name', async () => {
      // Model extracts a character with description but fails to provide name
      const extracted: Partial<StoryBrief> = {
        characters: [
          { name: 'Samus', description: 'The protagonist', role: 'protagonist', traits: [], notes: [] },
          { name: '', description: 'An adeptus mechanicus sidekick who provides weapons', role: 'sidekick', traits: [], notes: [] }
        ]
      };
      mockGenerateObject.mockResolvedValue(mockResult(extracted));

      const result = await briefExtractorAgent(
        'Tell me about your characters',
        'A rogue trader named Samus and his mechanicus sidekick',
        {}
      );

      // Currently this silently drops the second character - we should at least preserve it
      // or report it as incomplete so the conversation can ask for the name
      expect(result.missingFields).toContain('characters');
    });

    it('deduplicates characters by name when merging', async () => {
      const current: Partial<StoryBrief> = {
        characters: [
          { name: 'Samus', description: 'Original description', role: 'protagonist', traits: [], notes: [] }
        ]
      };

      // Extraction returns same character with updated info
      const extracted: Partial<StoryBrief> = {
        characters: [
          { name: 'Samus', description: 'Updated description with more detail', role: 'protagonist', traits: ['brave'], notes: [] }
        ]
      };
      mockGenerateObject.mockResolvedValue(mockResult(extracted));

      const result = await briefExtractorAgent(
        'Tell me more about Samus',
        'He is brave and determined',
        current
      );

      // Should not duplicate - should have 1 character (could keep original or update)
      expect(result.brief.characters).toHaveLength(1);
    });
  });
});
