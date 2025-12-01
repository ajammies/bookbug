import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractorAgent } from './extractor';
import type { PartialStory } from '../schemas';

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

describe('extractorAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts story fields from user message', async () => {
    const extracted: PartialStory = { title: 'Luna the Brave', storyArc: 'A rabbit finds courage' };
    mockGenerateObject.mockResolvedValue({ object: extracted });

    const result = await extractorAgent('A story about Luna, a brave rabbit');

    expect(result).toEqual(extracted);
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'A story about Luna, a brave rabbit',
      }),
      undefined
    );
  });

  it('merges extracted fields with current story', async () => {
    const current: PartialStory = { title: 'Luna the Brave' };
    const extracted: PartialStory = { storyArc: 'A rabbit finds courage' };
    mockGenerateObject.mockResolvedValue({ object: extracted });

    const result = await extractorAgent('She discovers her inner strength', current);

    expect(result).toEqual({ title: 'Luna the Brave', storyArc: 'A rabbit finds courage' });
  });

  it('includes current story context in prompt', async () => {
    const current: PartialStory = { title: 'Luna the Brave' };
    mockGenerateObject.mockResolvedValue({ object: {} });

    await extractorAgent('Make it 12 pages', current);

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Current story:'),
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

  it('handles empty current story', async () => {
    const extracted: PartialStory = { title: 'New Story' };
    mockGenerateObject.mockResolvedValue({ object: extracted });

    const result = await extractorAgent('A new story', {});

    expect(result).toEqual(extracted);
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'A new story',
      }),
      undefined
    );
  });

  it('includes available styles in system prompt', async () => {
    mockGenerateObject.mockResolvedValue({ object: {} });

    await extractorAgent('Use watercolor style', {}, { availableStyles: ['watercolor', 'digital'] });

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('watercolor'),
      }),
      undefined
    );
  });

  it('passes logger to generateObject', async () => {
    const logger = { debug: vi.fn() } as unknown as Parameters<typeof extractorAgent>[2]['logger'];
    mockGenerateObject.mockResolvedValue({ object: {} });

    await extractorAgent('test', {}, { logger });

    expect(mockGenerateObject).toHaveBeenCalledWith(expect.any(Object), logger);
  });

  it('extracts plot fields when present in story context', async () => {
    const current: PartialStory = {
      title: 'Luna the Brave',
      storyArc: 'A rabbit finds courage',
      pageCount: 12,
    };
    const extracted: PartialStory = {
      plot: {
        storyArcSummary: 'Luna overcomes her fear of the forest',
        plotBeats: [
          { purpose: 'setup', description: 'Luna is afraid' },
          { purpose: 'conflict', description: 'She must cross the forest' },
          { purpose: 'climax', description: 'She faces her fear' },
          { purpose: 'payoff', description: 'She discovers courage' },
        ],
      },
    };
    mockGenerateObject.mockResolvedValue({ object: extracted });

    const result = await extractorAgent('Make the climax more dramatic', current);

    expect(result.plot).toBeDefined();
    expect(result.plot?.plotBeats).toHaveLength(4);
  });

  it('overwrites fields with new extractions', async () => {
    const current: PartialStory = { title: 'Old Title', pageCount: 12 };
    const extracted: PartialStory = { title: 'New Title' };
    mockGenerateObject.mockResolvedValue({ object: extracted });

    const result = await extractorAgent('Change title to New Title', current);

    expect(result.title).toBe('New Title');
    expect(result.pageCount).toBe(12);
  });
});
