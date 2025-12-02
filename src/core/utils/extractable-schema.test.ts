import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { toExtractablePartial, stripNulls } from './extractable-schema';

describe('toExtractablePartial', () => {
  it('transforms simple string fields to nullable optional', () => {
    const schema = z.object({
      title: z.string(),
    });

    const extractable = toExtractablePartial(schema);

    // Should accept null
    expect(extractable.safeParse({ title: null }).success).toBe(true);
    // Should accept undefined/omitted
    expect(extractable.safeParse({}).success).toBe(true);
    // Should accept valid string
    expect(extractable.safeParse({ title: 'Hello' }).success).toBe(true);
  });

  it('transforms number fields to nullable optional', () => {
    const schema = z.object({
      count: z.number(),
    });

    const extractable = toExtractablePartial(schema);

    expect(extractable.safeParse({ count: null }).success).toBe(true);
    expect(extractable.safeParse({}).success).toBe(true);
    expect(extractable.safeParse({ count: 42 }).success).toBe(true);
  });

  it('transforms arrays to nullable optional', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });

    const extractable = toExtractablePartial(schema);

    expect(extractable.safeParse({ tags: null }).success).toBe(true);
    expect(extractable.safeParse({}).success).toBe(true);
    expect(extractable.safeParse({ tags: ['a', 'b'] }).success).toBe(true);
  });

  it('transforms nested objects recursively', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        age: z.number(),
      }),
    });

    const extractable = toExtractablePartial(schema);

    // Whole nested object can be null
    expect(extractable.safeParse({ user: null }).success).toBe(true);
    // Nested object can be omitted
    expect(extractable.safeParse({}).success).toBe(true);
    // Nested fields can have nulls
    expect(extractable.safeParse({ user: { name: 'Alice', age: null } }).success).toBe(true);
  });

  it('handles already optional fields', () => {
    const schema = z.object({
      optional: z.string().optional(),
    });

    const extractable = toExtractablePartial(schema);

    expect(extractable.safeParse({ optional: null }).success).toBe(true);
    expect(extractable.safeParse({}).success).toBe(true);
    expect(extractable.safeParse({ optional: 'value' }).success).toBe(true);
  });

  it('handles fields with defaults', () => {
    const schema = z.object({
      withDefault: z.number().default(10),
    });

    const extractable = toExtractablePartial(schema);

    expect(extractable.safeParse({ withDefault: null }).success).toBe(true);
    expect(extractable.safeParse({}).success).toBe(true);
  });

  it('handles arrays of objects', () => {
    const schema = z.object({
      items: z.array(z.object({
        id: z.string(),
        value: z.number(),
      })),
    });

    const extractable = toExtractablePartial(schema);

    expect(extractable.safeParse({ items: null }).success).toBe(true);
    expect(extractable.safeParse({}).success).toBe(true);
    expect(extractable.safeParse({
      items: [{ id: 'a', value: null }]
    }).success).toBe(true);
  });

  it('handles enums', () => {
    const schema = z.object({
      status: z.enum(['active', 'inactive']),
    });

    const extractable = toExtractablePartial(schema);

    expect(extractable.safeParse({ status: null }).success).toBe(true);
    expect(extractable.safeParse({}).success).toBe(true);
    expect(extractable.safeParse({ status: 'active' }).success).toBe(true);
  });

  it('handles complex nested schema like StoryCharacter', () => {
    const CharacterTraitSchema = z.object({
      key: z.string(),
      value: z.string(),
    });

    const StoryCharacterSchema = z.object({
      name: z.string(),
      description: z.string(),
      personalityTraits: z.array(CharacterTraitSchema).default([]),
      visualTraits: z.array(CharacterTraitSchema).default([]),
    });

    const BriefSchema = z.object({
      title: z.string(),
      characters: z.array(StoryCharacterSchema),
    });

    const extractable = toExtractablePartial(BriefSchema);

    // Can omit everything
    expect(extractable.safeParse({}).success).toBe(true);
    // Can null characters
    expect(extractable.safeParse({ title: 'Test', characters: null }).success).toBe(true);
    // Can have partial character with nulls
    expect(extractable.safeParse({
      title: 'Test',
      characters: [{ name: 'Hero', description: null, personalityTraits: null, visualTraits: null }]
    }).success).toBe(true);
  });
});

describe('stripNulls', () => {
  it('removes null values from flat object', () => {
    const input = { a: 'hello', b: null, c: 42 };
    const result = stripNulls(input);

    expect(result).toEqual({ a: 'hello', c: 42 });
  });

  it('removes undefined values', () => {
    const input = { a: 'hello', b: undefined, c: 42 };
    const result = stripNulls(input);

    expect(result).toEqual({ a: 'hello', c: 42 });
  });

  it('recursively strips nulls from nested objects', () => {
    const input = {
      user: { name: 'Alice', age: null },
      count: 5,
    };
    const result = stripNulls(input);

    expect(result).toEqual({
      user: { name: 'Alice' },
      count: 5,
    });
  });

  it('strips nulls from array items', () => {
    const input = {
      items: [
        { id: 'a', value: 1 },
        { id: 'b', value: null },
      ],
    };
    const result = stripNulls(input);

    expect(result).toEqual({
      items: [
        { id: 'a', value: 1 },
        { id: 'b' },
      ],
    });
  });

  it('preserves empty arrays', () => {
    const input = { tags: [] };
    const result = stripNulls(input);

    expect(result).toEqual({ tags: [] });
  });

  it('preserves false and 0 values', () => {
    const input = { enabled: false, count: 0, name: null };
    const result = stripNulls(input);

    expect(result).toEqual({ enabled: false, count: 0 });
  });
});
