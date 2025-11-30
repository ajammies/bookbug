import { z } from 'zod';
import { BeatPurposeSchema, type BeatPurpose, StoryCharacterSchema } from './common';
import { withChipResponse } from '../services/ai';

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
export const PlotConversationResponseSchema = withChipResponse(z.object({
  message: z.string().min(1).describe('Response to the user about their story plot'),
}));

export type PlotConversationResponse = z.infer<typeof PlotConversationResponseSchema>;
