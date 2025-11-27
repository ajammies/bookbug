import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../config';

const ApprovalResponseSchema = z.object({
  isApproval: z.boolean(),
});

const SYSTEM_PROMPT = `You determine if user input indicates approval or acceptance of the current state.

Return isApproval=true if the user is:
- Expressing satisfaction ("looks good", "perfect", "love it")
- Ready to proceed ("let's go", "let's write", "continue")
- Giving explicit approval ("approved", "yes", "do it")

Return isApproval=false if the user is:
- Requesting changes ("change the ending", "add more conflict")
- Asking questions ("what if we...", "could we...")
- Expressing dissatisfaction ("I don't like", "not quite")

Be generous - if the user seems happy and ready to move forward, that's approval.`;

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
