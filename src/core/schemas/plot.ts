import { z } from 'zod';
import { BeatPurposeSchema, type BeatPurpose, StoryCharacterSchema } from './common';

/**
 * Stage 2: PlotStructure - Output of plotAgent
 */

// Re-export for backwards compatibility
export const PlotBeatPurposeSchema = BeatPurposeSchema;
export type PlotBeatPurpose = BeatPurpose;

export const PlotBeatSchema = z.object({
  purpose: PlotBeatPurposeSchema.describe('Narrative function of this beat'),
  description: z.string().min(1).describe('One sentence summary of what happens'),
});

export type PlotBeat = z.infer<typeof PlotBeatSchema>;

export const PlotStructureSchema = z.object({
  storyArcSummary: z.string().min(1).describe('1-2 sentence story arc summary'),
  plotBeats: z.array(PlotBeatSchema).min(3).describe('Key story structure beats'),
  allowCreativeLiberty: z.boolean().default(true).describe('Whether the author can embellish beyond the beats'),
  characters: z.array(StoryCharacterSchema).optional().describe('Characters with visualDescription filled in for sprite generation'),
});

export type PlotStructure = z.infer<typeof PlotStructureSchema>;

/**
 * PlotConversationResponse: Output of plotConversationAgent during plot refinement
 */
export const PlotConversationResponseSchema = z.object({
  message: z.string().min(1).describe('Response to the user about their story plot'),
  chips: z.array(z.string().min(1)).min(1).max(4).describe('1-4 suggestions. Include approval chip when ready.'),
  isApproved: z.boolean().describe('True ONLY when user explicitly approves (clicks approval chip, says "yes", "approved", "looks good", "let\'s go"). NOT for "I like the suggestions" which means incorporate them.'),
});

export type PlotConversationResponse = z.infer<typeof PlotConversationResponseSchema>;
