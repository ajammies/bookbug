import { generateText } from 'ai';
import { getModel } from '../config';
import type { JSONParseError, TypeValidationError } from '@ai-sdk/provider';

/**
 * Creates a repair function for generateObject that uses the LLM to fix validation errors.
 *
 * When the model generates output that doesn't match the schema, this function
 * asks the model to fix the specific validation error.
 */
export function createRepairFunction(schemaDescription?: string) {
  return async ({
    text,
    error,
  }: {
    text: string;
    error: JSONParseError | TypeValidationError;
  }): Promise<string | null> => {
    const errorMessage = error.message;
    const errorName = error.name;

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
      const { text: repairedText } = await generateText({
        model: getModel(),
        prompt: repairPrompt,
        maxOutputTokens: 16000,
      });

      // Extract JSON from response (in case model added markdown fences)
      const jsonMatch = repairedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return jsonMatch[0];
      }

      // If no JSON found, return as-is and let it fail
      return repairedText;
    } catch (repairError) {
      // If repair fails, return null to use original error
      console.warn('Repair attempt failed:', repairError);
      return null;
    }
  };
}

/**
 * Simple repair function that logs errors but doesn't attempt LLM repair.
 * Useful for debugging - shows what the model generated.
 */
export function createLoggingRepairFunction(agentName: string) {
  return async ({
    text,
    error,
  }: {
    text: string;
    error: JSONParseError | TypeValidationError;
  }): Promise<string | null> => {
    console.warn(`[${agentName}] Schema validation failed:`);
    console.warn(`  Error: ${error.message.substring(0, 200)}`);
    console.warn(`  Generated text: ${text.substring(0, 500)}...`);

    // Return null to use original error (no repair attempt)
    return null;
  };
}
