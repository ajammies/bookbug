import { z } from 'zod';

/**
 * Stage 2: PlotStructure - Output of plotAgent
 */

export const PlotBeatPurposeSchema = z.enum([
  'setup',
  'conflict',
  'rising_action',
  'climax',
  'resolution',
]);

export type PlotBeatPurpose = z.infer<typeof PlotBeatPurposeSchema>;

export const PlotBeatSchema = z.object({
  purpose: PlotBeatPurposeSchema.describe('Narrative function of this beat'),
  description: z.string().min(1).describe('What happens in this beat'),
});

export type PlotBeat = z.infer<typeof PlotBeatSchema>;

export const PlotStructureSchema = z.object({
  storyArcSummary: z.string().min(1).describe('1-2 sentence story arc summary'),
  plotBeats: z.array(PlotBeatSchema).min(4).max(6).describe('Key story structure beats'),
  allowCreativeLiberty: z.boolean().default(true).describe('Whether the author can embellish beyond the beats'),
});

export type PlotStructure = z.infer<typeof PlotStructureSchema>;

/**
 * BlurbConversationResponse: Output of plotConversationAgent during plot refinement
 */
export const BlurbConversationResponseSchema = z.object({
  message: z.string().min(1).describe('Response to the user about their story plot'),
  chips: z.array(z.string().min(1)).describe('3-4 suggestions including an approval option'),
  isApproved: z.boolean().describe('True when the user approves the plot beats'),
});

export type BlurbConversationResponse = z.infer<typeof BlurbConversationResponseSchema>;
