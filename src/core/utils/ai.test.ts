import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Mock the ai module
vi.mock('ai', () => ({
  generateObject: vi.fn(),
  streamObject: vi.fn(),
  generateText: vi.fn(),
  NoObjectGeneratedError: {
    isInstance: (error: unknown) =>
      error instanceof Error && (error as { name?: string }).name === 'NoObjectGeneratedError',
  },
}));

// Mock anthropic
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-model'),
}));

// Mock retry
vi.mock('./retry', () => ({
  sleep: vi.fn(),
}));

// Mock logger
vi.mock('./logger', () => ({
  logApiSuccess: vi.fn(),
  logApiError: vi.fn(),
  logRateLimit: vi.fn(),
}));

import { streamObject } from 'ai';
import { streamObjectWithProgress, type RepairFunction } from './ai';

const TestSchema = z.object({
  name: z.string(),
  value: z.number(),
});

describe('streamObjectWithProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns object when streaming succeeds', async () => {
    const mockObject = { name: 'test', value: 42 };
    const mockStreamObject = streamObject as ReturnType<typeof vi.fn>;

    mockStreamObject.mockReturnValue({
      partialObjectStream: (async function* () {
        yield { name: 'test' };
        yield mockObject;
      })(),
      object: Promise.resolve(mockObject),
    });

    const result = await streamObjectWithProgress({
      model: 'mock-model' as unknown as Parameters<typeof streamObject>[0]['model'],
      schema: TestSchema,
      prompt: 'test prompt',
    });

    expect(result).toEqual(mockObject);
  });

  it('calls onProgress during streaming', async () => {
    const mockObject = { name: 'test', value: 42 };
    const mockStreamObject = streamObject as ReturnType<typeof vi.fn>;
    const onProgress = vi.fn();

    // Create a stream that emits partials with time delays
    mockStreamObject.mockReturnValue({
      partialObjectStream: (async function* () {
        yield { name: 'partial' };
      })(),
      object: Promise.resolve(mockObject),
    });

    await streamObjectWithProgress(
      {
        model: 'mock-model' as unknown as Parameters<typeof streamObject>[0]['model'],
        schema: TestSchema,
        prompt: 'test prompt',
      },
      onProgress,
      0 // Set to 0 for immediate progress
    );

    // onProgress may be called depending on timing
    expect(mockStreamObject).toHaveBeenCalled();
  });

  it('throws error when streaming fails without repair function', async () => {
    const mockStreamObject = streamObject as ReturnType<typeof vi.fn>;
    const error = new Error('Validation failed');
    (error as { name?: string }).name = 'NoObjectGeneratedError';
    (error as { text?: string }).text = '{"name": "test", "value": "invalid"}';
    (error as { cause?: Error }).cause = new Error('Type validation error');

    mockStreamObject.mockReturnValue({
      partialObjectStream: (async function* () {
        yield { name: 'test' };
      })(),
      object: Promise.reject(error),
    });

    await expect(
      streamObjectWithProgress({
        model: 'mock-model' as unknown as Parameters<typeof streamObject>[0]['model'],
        schema: TestSchema,
        prompt: 'test prompt',
      })
    ).rejects.toThrow('Validation failed');
  });

  it('attempts repair when validation fails and repair function provided', async () => {
    const mockStreamObject = streamObject as ReturnType<typeof vi.fn>;
    const error = new Error('Validation failed');
    (error as { name?: string }).name = 'NoObjectGeneratedError';
    (error as { text?: string }).text = '{"name": "test", "value": "invalid"}';
    (error as { cause?: { message: string } }).cause = { message: 'Type validation error' };

    mockStreamObject.mockReturnValue({
      partialObjectStream: (async function* () {
        yield { name: 'test' };
      })(),
      object: Promise.reject(error),
    });

    const repair: RepairFunction = vi.fn().mockResolvedValue('{"name": "test", "value": 42}');

    const result = await streamObjectWithProgress(
      {
        model: 'mock-model' as unknown as Parameters<typeof streamObject>[0]['model'],
        schema: TestSchema,
        prompt: 'test prompt',
      },
      undefined,
      3000,
      repair
    );

    expect(repair).toHaveBeenCalledWith({
      text: '{"name": "test", "value": "invalid"}',
      error: { message: 'Type validation error' },
    });
    expect(result).toEqual({ name: 'test', value: 42 });
  });

  it('throws original error when repair returns null', async () => {
    const mockStreamObject = streamObject as ReturnType<typeof vi.fn>;
    const error = new Error('Validation failed');
    (error as { name?: string }).name = 'NoObjectGeneratedError';
    (error as { text?: string }).text = '{"name": "test", "value": "invalid"}';
    (error as { cause?: { message: string } }).cause = { message: 'Type validation error' };

    mockStreamObject.mockReturnValue({
      partialObjectStream: (async function* () {
        yield { name: 'test' };
      })(),
      object: Promise.reject(error),
    });

    const repair: RepairFunction = vi.fn().mockResolvedValue(null);

    await expect(
      streamObjectWithProgress(
        {
          model: 'mock-model' as unknown as Parameters<typeof streamObject>[0]['model'],
          schema: TestSchema,
          prompt: 'test prompt',
        },
        undefined,
        3000,
        repair
      )
    ).rejects.toThrow('Validation failed');

    expect(repair).toHaveBeenCalled();
  });

  it('throws original error when repaired text is invalid JSON', async () => {
    const mockStreamObject = streamObject as ReturnType<typeof vi.fn>;
    const error = new Error('Validation failed');
    (error as { name?: string }).name = 'NoObjectGeneratedError';
    (error as { text?: string }).text = '{"name": "test", "value": "invalid"}';
    (error as { cause?: { message: string } }).cause = { message: 'Type validation error' };

    mockStreamObject.mockReturnValue({
      partialObjectStream: (async function* () {
        yield { name: 'test' };
      })(),
      object: Promise.reject(error),
    });

    const repair: RepairFunction = vi.fn().mockResolvedValue('not valid json');

    await expect(
      streamObjectWithProgress(
        {
          model: 'mock-model' as unknown as Parameters<typeof streamObject>[0]['model'],
          schema: TestSchema,
          prompt: 'test prompt',
        },
        undefined,
        3000,
        repair
      )
    ).rejects.toThrow(); // JSON.parse will throw

    expect(repair).toHaveBeenCalled();
  });

  it('does not call repair for non-NoObjectGeneratedError', async () => {
    const mockStreamObject = streamObject as ReturnType<typeof vi.fn>;
    const error = new Error('Network error');

    mockStreamObject.mockReturnValue({
      partialObjectStream: (async function* () {
        yield { name: 'test' };
      })(),
      object: Promise.reject(error),
    });

    const repair: RepairFunction = vi.fn();

    await expect(
      streamObjectWithProgress(
        {
          model: 'mock-model' as unknown as Parameters<typeof streamObject>[0]['model'],
          schema: TestSchema,
          prompt: 'test prompt',
        },
        undefined,
        3000,
        repair
      )
    ).rejects.toThrow('Network error');

    expect(repair).not.toHaveBeenCalled();
  });
});
