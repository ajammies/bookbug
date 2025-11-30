import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PartialStory } from '../schemas';

// Mock the ai service
vi.mock('../services/ai', () => ({
  generateObject: vi.fn(),
}));

// Mock config
vi.mock('../config', () => ({
  getModel: vi.fn(() => 'mock-model'),
}));

import { generateObject } from '../services/ai';
import { extractorAgent } from './extractor';

describe('extractorAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts story fields from natural language', async () => {
    const mockExtracted: PartialStory = {
      title: 'The Brave Fox',
      setting: 'A magical forest',
      characters: [
        { name: 'Felix', description: 'A small orange fox', role: 'protagonist', traits: ['brave'], notes: [] },
      ],
    };

    const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;
    mockGenerateObject.mockResolvedValue({ object: mockExtracted });

    const result = await extractorAgent('A story about a brave fox named Felix in a magical forest');

    expect(result.title).toBe('The Brave Fox');
    expect(result.setting).toBe('A magical forest');
    expect(result.characters).toHaveLength(1);
  });

  it('merges with existing story state', async () => {
    const currentStory: PartialStory = {
      title: 'Existing Title',
      pageCount: 10,
    };

    const mockExtracted: PartialStory = {
      setting: 'New setting',
      tone: 'whimsical',
    };

    const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;
    mockGenerateObject.mockResolvedValue({ object: mockExtracted });

    const result = await extractorAgent('Set it in a new setting', currentStory);

    expect(result.title).toBe('Existing Title');
    expect(result.pageCount).toBe(10);
    expect(result.setting).toBe('New setting');
    expect(result.tone).toBe('whimsical');
  });

  it('extracts plot structure', async () => {
    const mockExtracted: PartialStory = {
      plot: {
        storyArcSummary: 'Hero overcomes fear',
        plotBeats: [
          { purpose: 'setup', description: 'Hero enters forest' },
          { purpose: 'climax', description: 'Hero faces fear' },
          { purpose: 'payoff', description: 'Hero succeeds' },
        ],
        allowCreativeLiberty: true,
      },
    };

    const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;
    mockGenerateObject.mockResolvedValue({ object: mockExtracted });

    const result = await extractorAgent('The plot: hero enters forest, faces fear, succeeds');

    expect(result.plot?.storyArcSummary).toBe('Hero overcomes fear');
    expect(result.plot?.plotBeats).toHaveLength(3);
  });

  it('passes available styles to prompt', async () => {
    const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;
    mockGenerateObject.mockResolvedValue({ object: {} });

    await extractorAgent('Use cut-paper style', {}, { availableStyles: ['cut-paper', 'watercolor'] });

    expect(mockGenerateObject).toHaveBeenCalled();
    const callArgs = mockGenerateObject.mock.calls[0]?.[0] as { system: string };
    expect(callArgs.system).toContain('cut-paper');
    expect(callArgs.system).toContain('watercolor');
  });

  it('includes current story context in prompt', async () => {
    const currentStory: PartialStory = {
      title: 'Existing Story',
    };

    const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;
    mockGenerateObject.mockResolvedValue({ object: {} });

    await extractorAgent('Add more details', currentStory);

    const callArgs = mockGenerateObject.mock.calls[0]?.[0] as { prompt: string };
    expect(callArgs.prompt).toContain('Current story context');
    expect(callArgs.prompt).toContain('Existing Story');
  });
});
