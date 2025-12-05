import { generateText } from '../services/ai';
import { getModel } from '../config';
import type { JSONParseError, TypeValidationError } from '@ai-sdk/provider';
import type { Logger } from './logger';

/**
 * Creates a repair function for generateObject that uses the LLM to fix validation errors.
 *
 * When the model generates output that doesn't match the schema, this function
 * asks the model to fix the specific validation error.
 */
export function createRepairFunction(schemaDescription?: string, logger?: Logger) {
  return async ({
    text,
    error,
  }: {
    text: string;
    error: JSONParseError | TypeValidationError;
  }): Promise<string | null> => {
    const errorMessage = error.message;
    const errorName = error.name;

    logger?.debug(
      { errorName, errorMessage: errorMessage.substring(0, 200), textLength: text.length },
      'Attempting to repair invalid output'
    );

    // Build repair prompt based on error type
    let repairPrompt: string;

    if (errorName === 'AI_JSONParseError') {
      repairPrompt = `The following JSON is malformed and failed to parse:

\`\`\`json
${text}
\`\`\`

Parse error: ${errorMessage}

Fix the JSON syntax and return ONLY the corrected JSON, nothing else.`;
    } else {
      // TypeValidationError - extract the specific field that failed
      repairPrompt = `The following JSON failed schema validation:

\`\`\`json
${text}
\`\`\`

Validation error: ${errorMessage}

${schemaDescription ? `Schema notes: ${schemaDescription}\n` : ''}
Fix the invalid field(s) to match the schema. Return ONLY the corrected JSON, nothing else.`;
    }

    try {
      const repairedText = await generateText(
        {
          model: getModel(),
          prompt: repairPrompt,
          maxOutputTokens: 16000,
        },
        logger,
        'repairFunction'
      );

      // Extract JSON from response (in case model added markdown fences)
      const jsonMatch = repairedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        logger?.info({ repairedLength: jsonMatch[0].length }, 'Repair successful');
        return jsonMatch[0];
      }

      // If no JSON found, return as-is and let it fail
      logger?.warn('Repair returned non-JSON response');
      return repairedText;
    } catch (repairError) {
      // If repair fails, return null to use original error
      logger?.warn({ repairError }, 'Repair attempt failed');
      return null;
    }
  };
}

/**
 * Simple repair function that logs errors but doesn't attempt LLM repair.
 * Useful for debugging - shows what the model generated.
 */
export function createLoggingRepairFunction(agentName: string, logger?: Logger) {
  return async ({
    text,
    error,
  }: {
    text: string;
    error: JSONParseError | TypeValidationError;
  }): Promise<string | null> => {
    logger?.warn(
      { agent: agentName, errorMessage: error.message.substring(0, 200), generatedText: text.substring(0, 500) },
      'Schema validation failed (no repair attempted)'
    );

    // Return null to use original error (no repair attempt)
    return null;
  };
}
