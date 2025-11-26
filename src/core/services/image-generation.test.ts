import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateImage,
  downloadImage,
  MODEL_CONFIGS,
  _resetClient,
  _setClient,
} from './image-generation';
import type Replicate from 'replicate';

describe('generateImage', () => {
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

  it('throws error when REPLICATE_API_TOKEN is not set', async () => {
    delete process.env.REPLICATE_API_TOKEN;

    await expect(generateImage({ prompt: 'test' })).rejects.toThrow(
      'REPLICATE_API_TOKEN environment variable is required'
    );
  });

  it('uses flux-schnell as default model', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await generateImage({ prompt: 'test prompt' });

    expect(mockRun).toHaveBeenCalledWith(
      'black-forest-labs/flux-schnell',
      expect.any(Object)
    );
  });

  it('handles array output format', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    const result = await generateImage({ prompt: 'test' });

    expect(result.url).toBe('https://example.com/image.png');
  });

  it('handles string output format', async () => {
    const mockRun = vi.fn().mockResolvedValue('https://example.com/single.png');
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    const result = await generateImage({ prompt: 'test' });

    expect(result.url).toBe('https://example.com/single.png');
  });

  it('handles FileOutput object format', async () => {
    const mockFileOutput = {
      url: () => 'https://example.com/file-output.png',
    };
    const mockRun = vi.fn().mockResolvedValue([mockFileOutput]);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    const result = await generateImage({ prompt: 'test' });

    expect(result.url).toBe('https://example.com/file-output.png');
  });

  it('throws on unexpected output format', async () => {
    const mockRun = vi.fn().mockResolvedValue({ unexpected: 'format' });
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await expect(generateImage({ prompt: 'test' })).rejects.toThrow(
      'Unexpected output format from model'
    );
  });

  it('throws on empty array output', async () => {
    const mockRun = vi.fn().mockResolvedValue([]);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await expect(generateImage({ prompt: 'test' })).rejects.toThrow(
      'Unexpected output format from model'
    );
  });

  it('uses custom dimensions when provided', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    const result = await generateImage({
      prompt: 'test',
      width: 512,
      height: 768,
    });

    expect(result.width).toBe(512);
    expect(result.height).toBe(768);
    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        input: expect.objectContaining({
          width: 512,
          height: 768,
        }),
      })
    );
  });

  it('uses default dimensions when not provided', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    const result = await generateImage({ prompt: 'test' });

    expect(result.width).toBe(1024);
    expect(result.height).toBe(1024);
  });

  it('includes negative prompt when provided', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await generateImage({
      prompt: 'test',
      negativePrompt: 'blurry, low quality',
    });

    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        input: expect.objectContaining({
          negative_prompt: 'blurry, low quality',
        }),
      })
    );
  });

  it('omits negative prompt when not provided', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await generateImage({ prompt: 'test' });

    const callArgs = mockRun.mock.calls[0]?.[1] as { input: Record<string, unknown> } | undefined;
    expect(callArgs?.input.negative_prompt).toBeUndefined();
  });

  it('uses sdxl model when specified', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await generateImage({ prompt: 'test', model: 'sdxl' });

    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining('stability-ai/sdxl'),
      expect.any(Object)
    );
  });

  it('uses nano-banana-pro model when specified', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await generateImage({ prompt: 'test', model: 'nano-banana-pro' });

    expect(mockRun).toHaveBeenCalledWith(
      'google/nano-banana-pro',
      expect.any(Object)
    );
  });

  it('adds flux-specific options for flux-schnell model', async () => {
    const mockRun = vi.fn().mockResolvedValue(['https://example.com/image.png']);
    const mockClient = { run: mockRun } as unknown as Replicate;
    _setClient(mockClient);

    await generateImage({ prompt: 'test', model: 'flux-schnell' });

    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        input: expect.objectContaining({
          num_outputs: 1,
          aspect_ratio: '4:3',
          output_format: 'png',
          output_quality: 90,
        }),
      })
    );
  });
});

describe('downloadImage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('downloads image and returns buffer', async () => {
    const mockImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockImageData.buffer),
    });

    const result = await downloadImage('https://example.com/image.png');

    expect(result).toBeInstanceOf(Buffer);
    expect(result[0]).toBe(0x89);
    expect(result[1]).toBe(0x50);
  });

  it('throws error when download fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    });

    await expect(downloadImage('https://example.com/404.png')).rejects.toThrow(
      'Failed to download image: Not Found'
    );
  });

  it('calls fetch with the correct URL', async () => {
    const mockImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockImageData.buffer),
    });

    await downloadImage('https://example.com/test-image.png');

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/test-image.png');
  });
});

describe('MODEL_CONFIGS', () => {
  it('has correct config for flux-schnell', () => {
    expect(MODEL_CONFIGS['flux-schnell'].identifier).toBe('black-forest-labs/flux-schnell');
    expect(MODEL_CONFIGS['flux-schnell'].defaultWidth).toBe(1024);
    expect(MODEL_CONFIGS['flux-schnell'].defaultHeight).toBe(1024);
  });

  it('has correct config for sdxl', () => {
    expect(MODEL_CONFIGS['sdxl'].identifier).toContain('stability-ai/sdxl');
  });

  it('has correct config for nano-banana-pro', () => {
    expect(MODEL_CONFIGS['nano-banana-pro'].identifier).toBe('google/nano-banana-pro');
  });
});
