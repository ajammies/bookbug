import { z, type ZodTypeAny, type ZodObject, type ZodRawShape } from 'zod';

/**
 * Extractable Schema Utility
 *
 * Transforms Zod schemas for safe LLM partial extraction.
 * LLMs struggle with "omit if unknown" - they tend to fill placeholders.
 * This utility makes schemas explicit: use null for unknown, omit for not applicable.
 */

const OMIT_HINT = 'Use null if unknown, omit if not applicable';

/**
 * Recursively transform a Zod type for extractable partial output.
 * - Primitives become nullable + optional with describe hint
 * - Arrays become nullable + optional (never empty placeholder)
 * - Objects are recursively transformed
 */
function transformType(schema: ZodTypeAny): ZodTypeAny {
  const typeName = schema._def.typeName;

  // Handle ZodObject - recurse into shape
  if (typeName === 'ZodObject') {
    const shape = (schema as ZodObject<ZodRawShape>).shape;
    const newShape: ZodRawShape = {};

    for (const [key, value] of Object.entries(shape)) {
      newShape[key] = transformType(value as ZodTypeAny);
    }

    return z.object(newShape).nullable().optional().describe(OMIT_HINT);
  }

  // Handle ZodArray - make nullable/optional, transform inner type
  if (typeName === 'ZodArray') {
    const innerType = schema._def.type;
    const transformedInner = transformType(innerType);
    return z.array(transformedInner).nullable().optional().describe(OMIT_HINT);
  }

  // Handle ZodOptional - unwrap and re-transform
  if (typeName === 'ZodOptional') {
    const innerType = schema._def.innerType;
    return transformType(innerType);
  }

  // Handle ZodNullable - already nullable, just make optional
  if (typeName === 'ZodNullable') {
    const innerType = schema._def.innerType;
    return transformType(innerType);
  }

  // Handle ZodDefault - unwrap and transform
  if (typeName === 'ZodDefault') {
    const innerType = schema._def.innerType;
    return transformType(innerType);
  }

  // Handle ZodEffects (refinements) - unwrap and transform
  if (typeName === 'ZodEffects') {
    const innerType = schema._def.schema;
    return transformType(innerType);
  }

  // Primitives (string, number, boolean, enum, etc.) - make nullable + optional
  return schema.nullable().optional().describe(OMIT_HINT);
}

/**
 * Transform a Zod object schema for safe LLM partial extraction.
 *
 * @example
 * const ExtractableSchema = toExtractablePartial(StoryBriefSchema);
 * const result = await generateObject({ schema: ExtractableSchema, ... });
 * const clean = stripNulls(result.object);
 */
export function toExtractablePartial<T extends ZodRawShape>(
  schema: ZodObject<T>
): ZodObject<{ [K in keyof T]: ZodTypeAny }> {
  const shape = schema.shape;
  const newShape: ZodRawShape = {};

  for (const [key, value] of Object.entries(shape)) {
    newShape[key] = transformType(value as ZodTypeAny);
  }

  return z.object(newShape) as ZodObject<{ [K in keyof T]: ZodTypeAny }>;
}

/**
 * Strip null values from an object (recursively).
 * Use after extraction to get clean partial data.
 *
 * @example
 * const extracted = { title: "My Story", characters: null, setting: "forest" };
 * const clean = stripNulls(extracted);
 * // { title: "My Story", setting: "forest" }
 */
/**
 * Check if an object has at least one non-null value.
 * Used to filter out empty/incomplete extracted objects.
 */
function hasContent(obj: Record<string, unknown>): boolean {
  return Object.values(obj).some((v) => v !== null && v !== undefined);
}

export function stripNulls<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      // Recursively strip nulls from array items if they're objects
      // Filter out items that become empty after stripping
      result[key] = value
        .map((item) =>
          typeof item === 'object' && item !== null ? stripNulls(item as Record<string, unknown>) : item
        )
        .filter((item) =>
          typeof item === 'object' && item !== null ? hasContent(item as Record<string, unknown>) : true
        );
    } else if (typeof value === 'object') {
      result[key] = stripNulls(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as Partial<T>;
}
