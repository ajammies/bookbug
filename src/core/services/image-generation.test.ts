import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generatePageImage,
  _resetClient,
  _setClient,
} from './image-generation';
import { BOOK_FORMATS } from '../schemas';
import type Replicate from 'replicate';

describe('generatePageImage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, REPLICATE_API_TOKEN: 'test-token' };
    _resetClient();
  });

  afterEach(() => {
    process.env = originalEnv;
    _resetClient();
    vi.clearAllMocks();
  });

  const minimalStorySlice = {
    storyTitle: 'The Magic Garden',
    style: {
      art_direction: {
        genre: ['whimsical'],
        medium: ['watercolor'],
        technique: ['soft edges'],
      },
    },
    page: {
      pageNumber: 1,
      text: 'Luna found an old garden gate.',
      beats: [{ summary: 'Luna discovers the gate' }],
    },
  };

  it('throws error when REPLICATE_API_TOKEN is not set', async () => {
    delete process.env.REPLICATE_API_TOKEN;

    await expect(
      generatePageImage({
        storySlice: minimalStorySlice,
        format: BOOK_FORMATS['square-large'],
      })
    ).rejects.toThrow('REPLICATE_API_TOKEN environment variable is required');
  });

  it('calls Replicate with correct model', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await generatePageImage({
      storySlice: minimalStorySlice,
      format: BOOK_FORMATS['square-large'],
    });

    expect(mockRun).toHaveBeenCalledWith(
      'google/imagen-3',
      expect.any(Object)
    );
  });

  it('handles array output with string URL', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/page.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    const result = await generatePageImage({
      storySlice: minimalStorySlice,
      format: BOOK_FORMATS['square-large'],
    });

    expect(result.url).toBe('https://example.com/page.png');
  });

  it('handles FileOutput object format', async () => {
    const mockFileOutput = {
      url: () => 'https://example.com/file-output.png',
    };
    const mockRun = vi.fn().mockResolvedValue([mockFileOutput]);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    const result = await generatePageImage({
      storySlice: minimalStorySlice,
      format: BOOK_FORMATS['square-large'],
    });

    expect(result.url).toBe('https://example.com/file-output.png');
  });

  it('handles string output format', async () => {
    const mockRun = vi.fn().mockResolvedValue('https://example.com/single.png');
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    const result = await generatePageImage({
      storySlice: minimalStorySlice,
      format: BOOK_FORMATS['square-large'],
    });

    expect(result.url).toBe('https://example.com/single.png');
  });

  it('throws on unexpected output format', async () => {
    const mockRun = vi.fn().mockResolvedValue({ unexpected: 'format' });
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await expect(
      generatePageImage({
        storySlice: minimalStorySlice,
        format: BOOK_FORMATS['square-large'],
      })
    ).rejects.toThrow('Unexpected output format from model');
  });

  it('passes story slice as JSON string prompt', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await generatePageImage({
      storySlice: minimalStorySlice,
      format: BOOK_FORMATS['square-large'],
    });

    const callArgs = mockRun.mock.calls[0]?.[1] as { input: { prompt: string } };
    const prompt = callArgs.input.prompt;

    // Should be valid JSON containing the story slice
    const parsed = JSON.parse(prompt);
    expect(parsed.storyTitle).toBe('The Magic Garden');
    expect(parsed.page.text).toBe('Luna found an old garden gate.');
  });

  it('uses correct aspect ratio for square format', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await generatePageImage({
      storySlice: minimalStorySlice,
      format: BOOK_FORMATS['square-large'],
    });

    const callArgs = mockRun.mock.calls[0]?.[1] as { input: { aspect_ratio: string } };
    expect(callArgs.input.aspect_ratio).toBe('1:1');
  });

  it('uses correct aspect ratio for landscape format', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await generatePageImage({
      storySlice: minimalStorySlice,
      format: BOOK_FORMATS['landscape'],
    });

    const callArgs = mockRun.mock.calls[0]?.[1] as { input: { aspect_ratio: string } };
    expect(callArgs.input.aspect_ratio).toBe('4:3');
  });

  it('uses correct aspect ratio for portrait format', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await generatePageImage({
      storySlice: minimalStorySlice,
      format: BOOK_FORMATS['portrait-small'],
    });

    // 6x9 portrait is closer to 3:4 than 2:3
    const callArgs = mockRun.mock.calls[0]?.[1] as { input: { aspect_ratio: string } };
    expect(callArgs.input.aspect_ratio).toBe('3:4');
  });
});
