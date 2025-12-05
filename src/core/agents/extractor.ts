import { z, type ZodObject, type ZodRawShape } from 'zod';
import { generateObject } from '../services/ai';
import { getModel } from '../config';
import { toExtractablePartial, stripNulls } from '../utils/extractable-schema';
import { retryWithBackoff } from '../utils/retry';
import type { Logger } from '../utils/logger';

/**
 * Extraction result: discriminated union for complete vs incomplete extractions
 */
export type ExtractionResult<T> =
  | { status: 'complete'; data: T }
  | { status: 'incomplete'; data: Partial<T>; missingFields: string[] };

/**
 * Options for the extract function
 */
export interface ExtractOptions {
  /** Additional context/instructions for the system prompt */
  context?: string;
  /** Logger instance for debugging */
  logger?: Logger;
  /** Max retries for incomplete extractions (default: 2) */
  maxRetries?: number;
}

const DEFAULT_SYSTEM_PROMPT = `Extract structured data from the provided text.
Set fields to null if the information is not present or unclear.
Only extract what is explicitly stated - do not invent or assume.`;

/**
 * Compute missing field paths from Zod validation errors
 */
const getMissingFields = (error: z.ZodError): string[] => {
  const paths = error.issues.map((issue) => issue.path.map(String).join('.'));
  return [...new Set(paths)].filter(Boolean);
};

/**
 * Generic extraction agent: extracts structured data from text using a Zod schema.
 *
 * Automatically wraps the schema for safe partial extraction (nullable + optional fields),
 * then validates against the original schema to determine completeness.
 *
 * @param text - The text to extract data from
 * @param schema - The Zod object schema defining the expected structure
 * @param options - Optional context and logger
 * @returns ExtractionResult<T> - complete with full data, or incomplete with partial data and missing fields
 *
 * @example
 * const result = await extract(userMessage, PersonSchema);
 * if (result.status === 'complete') {
 *   console.log('Full person:', result.data);
 * } else {
 *   console.log('Missing:', result.missingFields);
 * }
 */
export const extract = async <T extends ZodRawShape>(
  text: string,
  schema: ZodObject<T>,
  options: ExtractOptions = {}
): Promise<ExtractionResult<z.infer<ZodObject<T>>>> => {
  const { context, logger, maxRetries = 2 } = options;

  const systemPrompt = context ? `${DEFAULT_SYSTEM_PROMPT}\n\n${context}` : DEFAULT_SYSTEM_PROMPT;
  const extractableSchema = toExtractablePartial(schema);

  // Retry extraction if incomplete
  return retryWithBackoff(
    async () => {
      const { object } = await generateObject(
        {
          model: getModel(),
          schema: extractableSchema,
          system: systemPrompt,
          prompt: text,
        },
        logger
      );

      const stripped = stripNulls(object as Record<string, unknown>);
      const validation = schema.safeParse(stripped);

      if (validation.success) {
        return { status: 'complete' as const, data: validation.data };
      }

      // Throw to trigger retry
      const missingFields = getMissingFields(validation.error);
      throw new IncompleteExtractionError(stripped, missingFields);
    },
    {
      maxRetries,
      initialDelayMs: 100,
      shouldRetry: (error) => error instanceof IncompleteExtractionError,
      logger,
    }
  ).catch((error) => {
    // Return incomplete result after retries exhausted
    if (error instanceof IncompleteExtractionError) {
      return {
        status: 'incomplete' as const,
        data: error.data as Partial<z.infer<ZodObject<T>>>,
        missingFields: error.missingFields,
      };
    }
    throw error;
  });
};

class IncompleteExtractionError extends Error {
  constructor(
    public data: Record<string, unknown>,
    public missingFields: string[]
  ) {
    super(`Incomplete extraction: missing ${missingFields.join(', ')}`);
  }
}
