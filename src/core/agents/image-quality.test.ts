import { describe, it, expect, vi, beforeEach } from 'vitest';
import { imageQualityAgent } from './image-quality';
import type { PageRenderContext, ImageQualityResult } from '../schemas';

vi.mock('../services/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/ai')>();
  return {
    ...actual,
    generateObject: vi.fn(),
  };
});

vi.mock('../config', () => ({
  getModel: vi.fn().mockReturnValue('mock-model'),
}));

import { generateObject } from '../services/ai';

const mockedGenerateObject = vi.mocked(generateObject);

const createMockContext = (): PageRenderContext => ({
  storyTitle: 'Test Story',
  style: {
    art_style: { genre: ['whimsical'], medium: ['watercolor'], technique: ['soft edges'] },
    setting: { landmarks: [], diegetic_lights: [] },
  },
  characterDesigns: [
    {
      character: { name: 'Luna', description: 'A rabbit', personalityTraits: [], notes: [] },
      spriteSheetUrl: 'https://example.com/luna.png',
    },
  ],
  page: {
    pageNumber: 1,
    text: 'Luna found a gate.',
    beats: [
      {
        order: 1,
        purpose: 'setup',
        summary: 'Luna finds gate',
        emotion: 'curious',
        characters: [],
        shot: { size: 'wide', angle: 'eye_level' },
      },
    ],
  },
});

const createMockQualityResult = (overrides?: Partial<ImageQualityResult>): ImageQualityResult => ({
  score: 85,
  characterConsistency: 90,
  environmentConsistency: 80,
  aiArtifacts: 85,
  issues: [],
  passesQualityBar: true,
  ...overrides,
});

describe('imageQualityAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls generateObject with image URL and context', async () => {
    const mockResult = createMockQualityResult();
    mockedGenerateObject.mockResolvedValue({ object: mockResult } as never);

    await imageQualityAgent('https://example.com/page1.png', createMockContext());

    expect(mockedGenerateObject).toHaveBeenCalledTimes(1);
    expect(mockedGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'text' }),
              expect.objectContaining({ type: 'image' }),
            ]),
          }),
        ]),
      }),
      undefined
    );
  });

  it('returns quality result from generateObject', async () => {
    const mockResult = createMockQualityResult({ score: 92, issues: ['Minor shadow issue'] });
    mockedGenerateObject.mockResolvedValue({ object: mockResult } as never);

    const result = await imageQualityAgent('https://example.com/page1.png', createMockContext());

    expect(result.score).toBe(92);
    expect(result.issues).toEqual(['Minor shadow issue']);
    expect(result.passesQualityBar).toBe(true);
  });

  it('passes quality threshold to prompt', async () => {
    const mockResult = createMockQualityResult();
    mockedGenerateObject.mockResolvedValue({ object: mockResult } as never);

    await imageQualityAgent('https://example.com/page1.png', createMockContext(), {
      qualityThreshold: 80,
    });

    const call = mockedGenerateObject.mock.calls[0]![0] as { messages: Array<{ content: Array<{ type: string; text?: string }> }> };
    const textContent = call.messages[0]!.content.find((c) => c.type === 'text');
    expect(textContent?.text).toContain('Quality threshold: 80');
  });

  it('uses default threshold of 70 when not specified', async () => {
    const mockResult = createMockQualityResult();
    mockedGenerateObject.mockResolvedValue({ object: mockResult } as never);

    await imageQualityAgent('https://example.com/page1.png', createMockContext());

    const call = mockedGenerateObject.mock.calls[0]![0] as { messages: Array<{ content: Array<{ type: string; text?: string }> }> };
    const textContent = call.messages[0]!.content.find((c) => c.type === 'text');
    expect(textContent?.text).toContain('Quality threshold: 70');
  });

  it('passes logger to generateObject', async () => {
    const mockResult = createMockQualityResult();
    mockedGenerateObject.mockResolvedValue({ object: mockResult } as never);
    const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    await imageQualityAgent('https://example.com/page1.png', createMockContext(), {
      logger: mockLogger as never,
    });

    expect(mockedGenerateObject).toHaveBeenCalledWith(expect.any(Object), mockLogger);
  });

  it('includes context JSON in prompt', async () => {
    const mockResult = createMockQualityResult();
    mockedGenerateObject.mockResolvedValue({ object: mockResult } as never);
    const context = createMockContext();

    await imageQualityAgent('https://example.com/page1.png', context);

    const call = mockedGenerateObject.mock.calls[0]![0] as { messages: Array<{ content: Array<{ type: string; text?: string }> }> };
    const textContent = call.messages[0]!.content.find((c) => c.type === 'text');
    expect(textContent?.text).toContain('Test Story');
    expect(textContent?.text).toContain('Luna');
  });

  it('creates URL object for image', async () => {
    const mockResult = createMockQualityResult();
    mockedGenerateObject.mockResolvedValue({ object: mockResult } as never);

    await imageQualityAgent('https://example.com/page1.png', createMockContext());

    const call = mockedGenerateObject.mock.calls[0]![0] as { messages: Array<{ content: Array<{ type: string; image?: URL }> }> };
    const imageContent = call.messages[0]!.content.find((c) => c.type === 'image');
    expect(imageContent?.image).toBeInstanceOf(URL);
    expect((imageContent?.image as URL).href).toBe('https://example.com/page1.png');
  });
});
