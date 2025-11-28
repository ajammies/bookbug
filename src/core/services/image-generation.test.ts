import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generatePageImage,
  createReplicateClient,
  downloadImage,
} from './image-generation';
import { BOOK_FORMATS } from '../schemas';
import type { PageRenderContext } from '../schemas';
import type Replicate from 'replicate';

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

    expect(mockRun).toHaveBeenCalledWith('google/imagen-3', expect.any(Object));
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

  it('enhances error message for Replicate API errors', async () => {
    const apiError = {
      message: 'Rate limit exceeded',
      response: { status: 429 },
    };
    const mockRun = vi.fn().mockRejectedValue(apiError);
    const mockClient = createMockClient(mockRun);

    await expect(
      generatePageImage(minimalContext, BOOK_FORMATS['square-large'], mockClient)
    ).rejects.toThrow('Image generation failed (429): Rate limit exceeded');
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

describe('downloadImage', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns Buffer on successful download', async () => {
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
    const mockResponse = {
      ok: true,
      arrayBuffer: () => Promise.resolve(imageData.buffer),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await downloadImage('https://example.com/image.png');

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBe(4);
    expect(result[0]).toBe(0x89);
  });

  it('throws error on HTTP error response', async () => {
    const mockResponse = {
      ok: false,
      statusText: 'Not Found',
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(downloadImage('https://example.com/missing.png')).rejects.toThrow(
      'Failed to download image: Not Found'
    );
  });

  it('propagates network errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

    await expect(downloadImage('https://example.com/image.png')).rejects.toThrow(
      'Network timeout'
    );
  });

  it('calls fetch with the provided URL', async () => {
    const mockResponse = {
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await downloadImage('https://replicate.delivery/abc123/image.png');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://replicate.delivery/abc123/image.png'
    );
  });
});
