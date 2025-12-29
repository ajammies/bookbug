import { z } from 'zod';
import { AgeRangeSchema, StoryCharacterSchema } from './common';
import { withOptionsResponse } from '../services/ai';

/**
 * Stage 1: StoryBrief - User requirements from book builder
 */

export const StoryBriefSchema = z.object({
  title: z.string().min(1).describe('Working title for the story'),
  storyArc: z.string().min(1).describe('The narrative arc or journey (e.g., "hero overcomes fear")'),
  setting: z.string().min(1).describe('Where and when the story takes place'),
  ageRange: AgeRangeSchema.describe('REQUIRED: Target reader age range object with min and max numbers'),
  pageCount: z.number().int().default(24).describe('Number of pages (8-32)'),
  characters: z.array(StoryCharacterSchema).min(1).describe('REQUIRED: Array of characters, each must have name and description'),
  tone: z.string().optional().describe('Emotional tone (e.g., "whimsical", "heartfelt")'),
  moral: z.string().optional().describe('Lesson or takeaway for the reader'),
  interests: z.array(z.string().min(1)).default([]).describe('Topics the child enjoys'),
  customInstructions: z.string().optional().describe('Special requests or notes from the user'),
  stylePreset: z.string().optional().describe('Name of style preset to use, or undefined to generate new'),
});

export type StoryBrief = z.infer<typeof StoryBriefSchema>;

/**
 * ConversationResponse: Output of conversation agent during story intake
 */
export const ConversationResponseSchema = withOptionsResponse(z.object({
  question: z.string().min(1).describe('The next question to ask the user'),
}));

export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;
