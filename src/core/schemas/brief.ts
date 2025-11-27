import { z } from 'zod';
import { AgeRangeSchema, StoryCharacterSchema } from './common';

/**
 * Stage 1: StoryBrief - User requirements from book builder
 */

export const StoryBriefSchema = z.object({
  title: z.string().min(1).describe('Working title for the story'),
  storyArc: z.string().min(1).describe('The narrative arc or journey (e.g., "hero overcomes fear")'),
  setting: z.string().min(1).describe('Where and when the story takes place'),
  ageRange: AgeRangeSchema,
  pageCount: z.number().int().min(8).max(32).default(24),
  characters: z.array(StoryCharacterSchema).min(1),
  tone: z.string().optional().describe('Emotional tone (e.g., "whimsical", "heartfelt")'),
  moral: z.string().optional().describe('Lesson or takeaway for the reader'),
  interests: z.array(z.string().min(1)).default([]).describe('Topics the child enjoys'),
  customInstructions: z.array(z.string().min(1)).default([]).describe('Special requests from the user'),
});

export type StoryBrief = z.infer<typeof StoryBriefSchema>;

/**
 * ConversationResponse: Output of conversation agent during story intake
 */
export const ConversationResponseSchema = z.object({
  question: z.string().min(1).describe('The next question to ask the user'),
  chips: z.array(z.string().min(1)).describe('3-4 quick-reply suggestions for the user'),
  isComplete: z.boolean().describe('True when all required StoryBrief fields are filled'),
});

export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;
