import { generateObject } from '../utils/ai';
import { z } from 'zod';
import { getModel } from '../config';
import type { PlotStructure, StoryBrief } from '../schemas';
import { plotAgent } from './plot';

/**
 * BlurbConfirmationResponse: Full response including potentially updated plot
 */
const BlurbConfirmationResponseSchema = z.object({
  message: z.string().min(1).describe('Friendly question or acknowledgment about the story essence'),
  chips: z.array(z.string().min(1)).min(3).max(5).describe('Story-specific suggestions. Last chip must be approval option.'),
  isApproved: z.boolean().describe('True ONLY when user explicitly approves'),
  toneAdjustment: z.string().optional().describe('If user requested a change, the adjustment to apply. Undefined if approved or first call.'),
});

type LLMResponse = z.infer<typeof BlurbConfirmationResponseSchema>;

export interface BlurbConfirmationResponse {
  plot: PlotStructure;
  message: string;
  chips: string[];
  isApproved: boolean;
}

const SYSTEM_PROMPT = `You are helping confirm the emotional essence of a children's story.

Given the story brief and current plot, either:
1. Ask if the essence feels right (first interaction)
2. Acknowledge their feedback and explain the adjustment (after user response)

RESPONSE FIELDS:
- message: Friendly question or acknowledgment
- chips: 3-5 story-specific suggestions using character names and plot elements
  - Include emotional shifts ("Make Luna braver from the start")
  - Include pacing changes ("Build more tension before the discovery")
  - LAST chip must be approval: "Yes, let's refine the beats!"
- isApproved: True ONLY when user clicks approval chip or says "yes", "looks good", "let's go"
- toneAdjustment: If user requested a change (not approval), summarize what to adjust. Otherwise undefined.

CRITICAL:
- Generate chips specific to THIS story using character names and plot elements
- Do NOT use generic chips like "Make it more playful"
- If user selects a chip that IS the approval option, set isApproved=true`;

/**
 * BlurbConfirmationAgent: Handles full blurb confirmation flow
 *
 * Takes current state + optional user response, returns updated state + display info.
 * All decision-making and plot regeneration happens here, not in CLI.
 */
export const blurbConfirmationAgent = async (
  brief: StoryBrief,
  plot: PlotStructure,
  userResponse?: string
): Promise<BlurbConfirmationResponse> => {
  // Get LLM decision about the response
  const { object } = await generateObject({
    model: getModel(),
    schema: BlurbConfirmationResponseSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify({
      brief,
      storyArcSummary: plot.storyArcSummary,
      plotBeats: plot.plotBeats,
      userResponse,
    }, null, 2),
  });

  // If adjustment needed, regenerate plot with the tone adjustment
  const updatedPlot = object.toneAdjustment
    ? await plotAgent({
        ...brief,
        customInstructions: `${brief.customInstructions ?? ''} TONE ADJUSTMENT: ${object.toneAdjustment}`,
      })
    : plot;

  return {
    plot: updatedPlot,
    message: object.message,
    chips: object.chips,
    isApproved: object.isApproved,
  };
};
