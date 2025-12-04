import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Mock the ai module
vi.mock('ai', () => ({
  generateObject: vi.fn(),
  streamObject: vi.fn(),
  NoObjectGeneratedError: {
    isInstance: (error: unknown) =>
      error instanceof Error && (error as { name?: string }).name === 'NoObjectGeneratedError',
  },
  APICallError: {
    isInstance: (error: unknown) =>
      error instanceof Error && (error as { name?: string }).name === 'APICallError',
  },
}));

// Mock retry
vi.mock('../utils/retry', () => ({
  sleep: vi.fn(),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logApiSuccess: vi.fn(),
  logApiError: vi.fn(),
  logRateLimit: vi.fn(),
}));

import { streamObject, generateObject as aiGenerateObject } from 'ai';
import { streamObjectWithProgress, generateObject, type RepairFunction } from './ai';
import { sleep } from '../utils/retry';
import { logRateLimit, logApiSuccess } from '../utils/logger';

const TestSchema = z.object({
  name: z.string(),
  value: z.number(),
});

describe('generateObject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns result on success', async () => {
    const mockResult = { object: { name: 'test', value: 42 } };
    const mockGenerateObject = aiGenerateObject as ReturnType<typeof vi.fn>;
    mockGenerateObject.mockResolvedValue(mockResult);

    const result = await generateObject({
      model: 'mock-model' as unknown as Parameters<typeof aiGenerateObject>[0]['model'],
      schema: TestSchema,
      prompt: 'test prompt',
    });

    expect(result.object).toEqual(mockResult.object);
    expect(logApiSuccess).toHaveBeenCalled();
  });

  it('retries on 429 APICallError with retry-after header', async () => {
    const mockGenerateObject = aiGenerateObject as ReturnType<typeof vi.fn>;
    const apiError = new Error('Rate limited');
    (apiError as { name?: string }).name = 'APICallError';
    (apiError as { statusCode?: number }).statusCode = 429;
    (apiError as { responseHeaders?: Record<string, string> }).responseHeaders = {
      'retry-after': '5',
    };

    const mockResult = { object: { name: 'test', value: 42 } };
    mockGenerateObject
      .mockRejectedValueOnce(apiError)
      .mockResolvedValueOnce(mockResult);

    const result = await generateObject({
      model: 'mock-model' as unknown as Parameters<typeof aiGenerateObject>[0]['model'],
      schema: TestSchema,
      prompt: 'test prompt',
    });

    expect(sleep).toHaveBeenCalledWith(5000);
    expect(logRateLimit).toHaveBeenCalled();
    expect(result.object).toEqual(mockResult.object);
  });

  it('throws 429 error without retry-after header', async () => {
    const mockGenerateObject = aiGenerateObject as ReturnType<typeof vi.fn>;
    const apiError = new Error('Rate limited');
    (apiError as { name?: string }).name = 'APICallError';
    (apiError as { statusCode?: number }).statusCode = 429;
    (apiError as { responseHeaders?: Record<string, string> }).responseHeaders = {};

    mockGenerateObject.mockRejectedValue(apiError);

    await expect(
      generateObject({
        model: 'mock-model' as unknown as Parameters<typeof aiGenerateObject>[0]['model'],
        schema: TestSchema,
        prompt: 'test prompt',
      })
    ).rejects.toThrow('Rate limited');

    expect(sleep).not.toHaveBeenCalled();
  });

  it('throws non-429 errors without retry', async () => {
    const mockGenerateObject = aiGenerateObject as ReturnType<typeof vi.fn>;
    const error = new Error('Server error');
    (error as { name?: string }).name = 'APICallError';
    (error as { statusCode?: number }).statusCode = 500;

    mockGenerateObject.mockRejectedValue(error);

    await expect(
      generateObject({
        model: 'mock-model' as unknown as Parameters<typeof aiGenerateObject>[0]['model'],
        schema: TestSchema,
        prompt: 'test prompt',
      })
    ).rejects.toThrow('Server error');

    expect(sleep).not.toHaveBeenCalled();
  });
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
        repair
      )
    ).rejects.toThrow('Network error');

    expect(repair).not.toHaveBeenCalled();
  });
});
