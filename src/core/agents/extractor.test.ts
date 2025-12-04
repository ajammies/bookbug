import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { extract, type ExtractionResult } from './extractor';

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

// Helper to create mock GenerateObjectResult
const mockResult = <T>(object: T) => ({ object }) as unknown as Awaited<ReturnType<typeof generateObject>>;

describe('extract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns complete when all required fields present', async () => {
    const schema = z.object({
      title: z.string(),
      count: z.number(),
    });

    mockGenerateObject.mockResolvedValue(mockResult({ title: 'Test', count: 5 }));

    const result = await extract('title is Test, count is 5', schema);

    expect(result.status).toBe('complete');
    expect(result.data).toEqual({ title: 'Test', count: 5 });
  });

  it('returns incomplete with missingFields when required fields missing', async () => {
    const schema = z.object({
      title: z.string(),
      count: z.number(),
    });

    mockGenerateObject.mockResolvedValue(mockResult({ title: 'Test', count: null }));

    const result = await extract('title is Test', schema);

    expect(result.status).toBe('incomplete');
    if (result.status === 'incomplete') {
      expect(result.data).toEqual({ title: 'Test' });
      expect(result.missingFields).toContain('count');
    }
  });

  it('handles nested field paths', async () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        age: z.number(),
      }),
    });

    mockGenerateObject.mockResolvedValue(mockResult({ user: { name: 'Alice', age: null } }));

    const result = await extract('user Alice', schema);

    expect(result.status).toBe('incomplete');
    if (result.status === 'incomplete') {
      expect(result.data).toEqual({ user: { name: 'Alice' } });
      expect(result.missingFields).toContain('user.age');
    }
  });

  it('handles array field paths - empty items are filtered', async () => {
    const schema = z.object({
      items: z.array(z.object({ id: z.string() })),
    });

    // When an array item has all null values, stripNulls filters it out entirely
    // This is correct behavior - incomplete items are removed
    mockGenerateObject.mockResolvedValue(mockResult({ items: [{ id: 'a' }, { id: null }] }));

    const result = await extract('items a and unknown', schema);

    // After filtering, we have [{ id: 'a' }] which is valid
    expect(result.status).toBe('complete');
    expect(result.data).toEqual({ items: [{ id: 'a' }] });
  });

  it('reports missing array when all items are incomplete', async () => {
    const schema = z.object({
      items: z.array(z.object({ id: z.string() })).min(1),
    });

    // All items have null values, so all get filtered out
    mockGenerateObject.mockResolvedValue(mockResult({ items: [{ id: null }, { id: null }] }));

    const result = await extract('no valid items', schema);

    expect(result.status).toBe('incomplete');
    if (result.status === 'incomplete') {
      expect(result.missingFields).toContain('items');
    }
  });

  it('strips null values from incomplete data', async () => {
    const schema = z.object({
      title: z.string(),
      description: z.string(),
    });

    mockGenerateObject.mockResolvedValue(mockResult({ title: 'Test', description: null }));

    const result = await extract('title is Test', schema);

    expect(result.status).toBe('incomplete');
    if (result.status === 'incomplete') {
      expect(result.data).toEqual({ title: 'Test' });
      expect(result.data).not.toHaveProperty('description');
    }
  });

  it('includes custom context in system prompt', async () => {
    const schema = z.object({ field: z.string() });
    mockGenerateObject.mockResolvedValue(mockResult({ field: 'value' }));

    await extract('text', schema, { context: 'Custom instruction' });

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Custom instruction'),
      }),
      undefined
    );
  });

  it('passes logger to generateObject', async () => {
    const logger = { debug: vi.fn(), info: vi.fn(), error: vi.fn() } as unknown as import('../utils/logger').Logger;
    const schema = z.object({ field: z.string() });
    mockGenerateObject.mockResolvedValue(mockResult({ field: 'value' }));

    await extract('text', schema, { logger });

    expect(mockGenerateObject).toHaveBeenCalledWith(expect.any(Object), logger);
  });

  it('deduplicates missing fields', async () => {
    const schema = z.object({
      items: z.array(z.object({ id: z.string() })).min(1),
    });

    mockGenerateObject.mockResolvedValue(mockResult({ items: null }));

    const result = await extract('no items', schema);

    expect(result.status).toBe('incomplete');
    if (result.status === 'incomplete') {
      // Should only have 'items' once, not duplicated
      const itemsCount = result.missingFields.filter((f) => f === 'items').length;
      expect(itemsCount).toBe(1);
    }
  });

  it('handles optional fields correctly - does not require them', async () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });

    mockGenerateObject.mockResolvedValue(mockResult({ required: 'value', optional: null }));

    const result = await extract('required value', schema);

    expect(result.status).toBe('complete');
    expect(result.data).toEqual({ required: 'value' });
  });

  it('type narrows correctly with discriminated union', async () => {
    const schema = z.object({ name: z.string() });
    mockGenerateObject.mockResolvedValue(mockResult({ name: 'Test' }));

    const result: ExtractionResult<{ name: string }> = await extract('name Test', schema);

    if (result.status === 'complete') {
      // TypeScript should know result.data is { name: string }
      const name: string = result.data.name;
      expect(name).toBe('Test');
    } else {
      // TypeScript should know result has missingFields
      const missing: string[] = result.missingFields;
      expect(missing).toBeDefined();
    }
  });
});
