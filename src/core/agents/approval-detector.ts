import { generateObject } from '../utils/ai';
import { z } from 'zod';
import { getModel } from '../config';

const ApprovalResponseSchema = z.object({
  isApproval: z.boolean().describe('True if user is approving/accepting, false if requesting changes'),
});

const SYSTEM_PROMPT = `Determine if the user is approving the current state or requesting changes.`;

/**
 * Lightweight agent to detect if user input indicates approval
 *
 * Uses LLM to understand natural language variations rather than
 * hardcoded phrase matching.
 */
export const detectApproval = async (userInput: string): Promise<boolean> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: ApprovalResponseSchema,
    system: SYSTEM_PROMPT,
    prompt: userInput,
  });

  return object.isApproval;
};
