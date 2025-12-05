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

    expect(result).toEqual(extracted);
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Question:'),
      }),
      undefined
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

    expect(result).toEqual({ title: 'Luna the Brave', storyArc: 'A rabbit finds courage' });
  });

  it('includes current brief context in prompt', async () => {
    const current: Partial<StoryBrief> = { title: 'Luna the Brave' };
    mockGenerateObject.mockResolvedValue(mockResult({}));

    await briefExtractorAgent('How many pages?', '12 pages', current);

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Current brief:'),
      }),
      undefined
    );
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Luna the Brave'),
      }),
      undefined
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

    expect(result).toEqual(extracted);
    // Should not include "Current brief:" when empty
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.not.stringContaining('Current brief:'),
      }),
      undefined
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
      undefined
    );
  });

  it('passes logger to generateObject', async () => {
    const logger = { debug: vi.fn(), warn: vi.fn() } as unknown as NonNullable<Parameters<typeof briefExtractorAgent>[3]>['logger'];
    mockGenerateObject.mockResolvedValue(mockResult({}));

    await briefExtractorAgent('Question?', 'Answer', {}, { logger });

    expect(mockGenerateObject).toHaveBeenCalledWith(expect.any(Object), logger);
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

    expect(result.title).toBe("Luna's Big Day");
    expect(result.storyArc).toBe('A rabbit adventure');
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

    expect(result.title).toBe('New Title');
    expect(result.pageCount).toBe(12);
  });
});
