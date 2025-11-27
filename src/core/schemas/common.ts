import { z } from 'zod';

/**
 * Shared types used across the pipeline
 */

export const AgeRangeSchema = z
  .object({
    min: z.number().int().min(2).max(12).describe('Minimum age of target reader (2-12)'),
    max: z.number().int().min(2).max(12).describe('Maximum age of target reader (2-12)'),
  })
  .refine((range) => range.min <= range.max, {
    message: 'ageRange.min must be <= ageRange.max',
    path: ['max'],
  });

export type AgeRange = z.infer<typeof AgeRangeSchema>;

export const StoryCharacterSchema = z.object({
  name: z.string().min(1).describe('Character name'),
  description: z.string().min(1).describe('Brief physical and personality description'),
  role: z.string().optional().describe('Role in the story (e.g., "protagonist", "sidekick", "mentor")'),
  traits: z.array(z.string().min(1)).default([]).describe('Personality traits (e.g., "curious", "brave")'),
  notes: z.array(z.string().min(1)).default([]).describe('Additional notes for illustration consistency'),
});

export type StoryCharacter = z.infer<typeof StoryCharacterSchema>;
