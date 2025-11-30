import { generateObject } from '../utils/ai';
import { z } from 'zod';
import { getModel } from '../config';
import type { PlotStructure, StoryBrief } from '../schemas';

const BlurbConfirmationResponseSchema = z.object({
  message: z.string().min(1).describe('Friendly question asking if this captures the story essence'),
  chips: z.array(z.string().min(1)).min(3).max(5).describe('Story-specific tone adjustments based on the current arc. Last chip must be approval.'),
  isApproved: z.boolean().describe('True if user approves the essence'),
});

export type BlurbConfirmationResponse = z.infer<typeof BlurbConfirmationResponseSchema>;

const SYSTEM_PROMPT = `You are helping confirm the emotional essence of a children's story before diving into plot details.

Given the story brief and generated plot structure, ask if the story arc summary captures what the user is going for.

RESPONSE:
- message: A friendly question about whether this essence feels right
- chips: 3-5 suggestions for tone adjustments SPECIFIC to this story:
  - Consider what tones would complement or contrast with the current arc
  - Use language relevant to this story's characters and setting
  - Include at least one that shifts emotional register (more playful, more heartfelt, etc.)
  - Include at least one that adjusts pacing/intensity (more adventurous, gentler, etc.)
  - LAST chip must be approval: "Yes, let's refine the beats!"
- isApproved: Set true when user explicitly approves

EXAMPLES of story-specific chips:
- For a story about a shy rabbit: "Make Clover more adventurous from the start"
- For a bedtime story: "Add more cozy, sleepy moments"
- For an adventure: "Raise the stakes earlier"

Do NOT use generic chips like "Make it more playful" - ground them in THIS story.`;

/**
 * BlurbConfirmationAgent: Confirms story essence before beat iteration
 */
export const blurbConfirmationAgent = async (
  brief: StoryBrief,
  plot: PlotStructure,
  userResponse?: string
): Promise<BlurbConfirmationResponse> => {
  const context = {
    brief,
    storyArcSummary: plot.storyArcSummary,
    plotBeats: plot.plotBeats,
    userResponse,
  };

  const { object } = await generateObject({
    model: getModel(),
    schema: BlurbConfirmationResponseSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(context, null, 2),
  });

  return object;
};
