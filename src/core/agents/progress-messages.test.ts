import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StoryWithPlot } from '../schemas';

// Mock the ai utils wrapper
vi.mock('../services/ai', () => ({
  generateObject: vi.fn(),
}));

// Mock anthropic
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-model'),
}));

import { generateObject } from '../services/ai';
import { progressMessagesAgent } from './progress-messages';

const mockStory: StoryWithPlot = {
  title: 'The Brave Little Fox',
  storyArc: 'overcoming fear',
  setting: 'A magical forest',
  ageRange: { min: 4, max: 6 },
  pageCount: 24,
  characters: [
    { name: 'Felix', description: 'A small orange fox', role: 'protagonist', personalityTraits: [{ key: 'core', value: 'brave' }, { key: 'core', value: 'curious' }], visualTraits: [], notes: [] },
    { name: 'Olive', description: 'A grey owl', role: 'sidekick', personalityTraits: [{ key: 'core', value: 'wise' }, { key: 'core', value: 'calm' }], visualTraits: [], notes: [] },
  ],
  tone: 'whimsical',
  interests: ['animals', 'adventure'],
  plot: {
    storyArcSummary: 'Felix overcomes his fear of the dark to find treasure',
    plotBeats: [
      { purpose: 'setup', description: 'Felix discovers a mysterious cave' },
      { purpose: 'conflict', description: 'Felix is scared to enter' },
      { purpose: 'climax', description: 'Felix overcomes his fear' },
      { purpose: 'payoff', description: 'Felix finds treasure inside' },
    ],
    allowCreativeLiberty: true,
  },
};

describe('progressMessagesAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of witty messages', async () => {
    const mockMessages = [
      'Felix is practicing hero poses...',
      'Olive watches from her branch...',
      'The forest grows quiet...',
      'Something magical is happening...',
      'Felix takes a deep breath...',
      'The cave entrance glows softly...',
      'Our heroes prepare for adventure...',
      'Sprinkling extra magic dust...',
      'Felix finds his courage...',
      'The treasure awaits...',
    ];

    const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;
    mockGenerateObject.mockResolvedValue({
      object: { messages: mockMessages },
    });

    const result = await progressMessagesAgent(mockStory);

    expect(result).toEqual(mockMessages);
    expect(result.length).toBeGreaterThanOrEqual(10);
  });

  it('passes story context to the model', async () => {
    const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;
    mockGenerateObject.mockResolvedValue({
      object: { messages: Array(10).fill('test message') },
    });

    await progressMessagesAgent(mockStory);

    expect(mockGenerateObject).toHaveBeenCalled();
    const callArgs = mockGenerateObject.mock.calls[0]?.[0] as { prompt: string };
    expect(callArgs).toBeDefined();
    expect(callArgs.prompt).toContain('Felix');
    expect(callArgs.prompt).toContain('Olive');
    expect(callArgs.prompt).toContain('magical forest');
  });

  it('uses haiku model for speed', async () => {
    const mockGenerateObject = generateObject as ReturnType<typeof vi.fn>;
    mockGenerateObject.mockResolvedValue({
      object: { messages: Array(10).fill('test message') },
    });

    await progressMessagesAgent(mockStory);

    const { anthropic } = await import('@ai-sdk/anthropic');
    expect(anthropic).toHaveBeenCalledWith('claude-3-5-haiku-latest');
  });
});
