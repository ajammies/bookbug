import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generatePageImage, createReplicateClient } from './image-generation';
import { BOOK_FORMATS } from '../schemas';
import type { PageRenderContext } from '../schemas';
import type Replicate from 'replicate';
import { RateLimitError } from '../utils/retry';

describe('createReplicateClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws error when REPLICATE_API_TOKEN is not set', () => {
    delete process.env.REPLICATE_API_TOKEN;

    expect(() => createReplicateClient()).toThrow(
      'REPLICATE_API_TOKEN environment variable is required'
    );
  });

  it('creates client when token is set', () => {
    process.env.REPLICATE_API_TOKEN = 'test-token';

    const client = createReplicateClient();

    expect(client).toBeDefined();
    expect(typeof client.run).toBe('function');
  });
});

describe('generatePageImage', () => {
  const minimalContext: PageRenderContext = {
    storyTitle: 'The Magic Garden',
    style: {
      art_direction: {
        genre: ['whimsical'],
        medium: ['watercolor'],
        technique: ['soft edges'],
      },
      setting: {
        landmarks: [],
        diegetic_lights: [],
      },
    },
    characters: {},
    page: {
      pageNumber: 1,
      text: 'Luna found an old garden gate.',
    },
  };

  const createMockClient = (mockRun: ReturnType<typeof vi.fn>) =>
    ({ run: mockRun }) as unknown as Replicate;

  it('calls Replicate with correct model', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = createMockClient(mockRun);

    await generatePageImage(minimalContext, BOOK_FORMATS['square-large'], mockClient);

    expect(mockRun).toHaveBeenCalledWith('google/nano-banana-pro', expect.any(Object));
  });

  it('handles array output with string URL', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/page.png']);
    const mockClient = createMockClient(mockRun);

    const result = await generatePageImage(
      minimalContext,
      BOOK_FORMATS['square-large'],
      mockClient
    );

    expect(result.url).toBe('https://example.com/page.png');
  });

  it('handles FileOutput object format', async () => {
    const mockFileOutput = {
      url: () => 'https://example.com/file-output.png',
    };
    const mockRun = vi.fn().mockResolvedValue([mockFileOutput]);
    const mockClient = createMockClient(mockRun);

    const result = await generatePageImage(
      minimalContext,
      BOOK_FORMATS['square-large'],
      mockClient
    );

    expect(result.url).toBe('https://example.com/file-output.png');
  });

  it('handles string output format', async () => {
    const mockRun = vi.fn().mockResolvedValue('https://example.com/single.png');
    const mockClient = createMockClient(mockRun);

    const result = await generatePageImage(
      minimalContext,
      BOOK_FORMATS['square-large'],
      mockClient
    );

    expect(result.url).toBe('https://example.com/single.png');
  });

  it('throws on unexpected output format', async () => {
    const mockRun = vi.fn().mockResolvedValue({ unexpected: 'format' });
    const mockClient = createMockClient(mockRun);

    await expect(
      generatePageImage(minimalContext, BOOK_FORMATS['square-large'], mockClient)
    ).rejects.toThrow('Unexpected output format from Replicate model');
  });

  it('passes story slice as JSON string prompt', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = createMockClient(mockRun);

    await generatePageImage(minimalContext, BOOK_FORMATS['square-large'], mockClient);

    const callArgs = mockRun.mock.calls[0]?.[1] as { input: { prompt: string } };
    const prompt = callArgs.input.prompt;

    const parsed = JSON.parse(prompt);
    expect(parsed.storyTitle).toBe('The Magic Garden');
    expect(parsed.page.text).toBe('Luna found an old garden gate.');
  });

  it('uses correct aspect ratio for square format', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = createMockClient(mockRun);

    await generatePageImage(minimalContext, BOOK_FORMATS['square-large'], mockClient);

    const callArgs = mockRun.mock.calls[0]?.[1] as { input: { aspect_ratio: string } };
    expect(callArgs.input.aspect_ratio).toBe('1:1');
  });

  it('uses correct aspect ratio for landscape format', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = createMockClient(mockRun);

    await generatePageImage(minimalContext, BOOK_FORMATS['landscape'], mockClient);

    const callArgs = mockRun.mock.calls[0]?.[1] as { input: { aspect_ratio: string } };
    expect(callArgs.input.aspect_ratio).toBe('4:3');
  });

  it('uses correct aspect ratio for portrait format', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = createMockClient(mockRun);

    await generatePageImage(minimalContext, BOOK_FORMATS['portrait-small'], mockClient);

    const callArgs = mockRun.mock.calls[0]?.[1] as { input: { aspect_ratio: string } };
    expect(callArgs.input.aspect_ratio).toBe('3:4');
  });

  it('throws RateLimitError for 429 responses', async () => {
    const apiError = {
      message: 'Rate limit exceeded',
      response: { status: 429, headers: { get: () => '30' } },
    };
    const mockRun = vi.fn().mockRejectedValue(apiError);
    const mockClient = createMockClient(mockRun);

    await expect(
      generatePageImage(minimalContext, BOOK_FORMATS['square-large'], mockClient)
    ).rejects.toThrow(RateLimitError);
  });

  it('uses default 60s delay when retry-after header is missing', async () => {
    const apiError = {
      message: 'Rate limit exceeded',
      response: { status: 429 },
    };
    const mockRun = vi.fn().mockRejectedValue(apiError);
    const mockClient = createMockClient(mockRun);

    try {
      await generatePageImage(minimalContext, BOOK_FORMATS['square-large'], mockClient);
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfterMs).toBe(60000);
    }
  });

  it('enhances error message for non-429 API errors', async () => {
    const apiError = {
      message: 'Server error',
      response: { status: 500 },
    };
    const mockRun = vi.fn().mockRejectedValue(apiError);
    const mockClient = createMockClient(mockRun);

    await expect(
      generatePageImage(minimalContext, BOOK_FORMATS['square-large'], mockClient)
    ).rejects.toThrow('Image generation failed (500): Server error');
  });

  it('re-throws non-API errors unchanged', async () => {
    const networkError = new Error('Network connection failed');
    const mockRun = vi.fn().mockRejectedValue(networkError);
    const mockClient = createMockClient(mockRun);

    await expect(
      generatePageImage(minimalContext, BOOK_FORMATS['square-large'], mockClient)
    ).rejects.toThrow('Network connection failed');
  });
});

