import { z } from 'zod';

/**
 * Shared types used across the pipeline
 */

export const AgeRangeSchema = z
  .object({
    min: z.number().int().min(2).max(18).describe('Minimum age of target reader (2-18)'),
    max: z.number().int().min(2).max(18).describe('Maximum age of target reader (2-18)'),
  })
  .refine((range) => range.min <= range.max, {
    message: 'ageRange.min must be <= ageRange.max',
    path: ['max'],
  });

export type AgeRange = z.infer<typeof AgeRangeSchema>;

export const StoryCharacterSchema = z.object({
  name: z.string().min(1).describe('Character name'),
  description: z.string().min(1).describe('REQUIRED: Brief physical and personality description of the character'),
  role: z.string().optional().describe('Role in the story (e.g., "protagonist", "sidekick", "mentor")'),
  traits: z.array(z.string().min(1)).default([]).describe('Personality traits (e.g., "curious", "brave")'),
  notes: z.array(z.string().min(1)).default([]).describe('Additional notes for illustration consistency'),
  visualDescription: z.string().optional().describe('Detailed visual appearance for sprite generation: body type, colors, clothing, props, distinguishing features'),
});

export type StoryCharacter = z.infer<typeof StoryCharacterSchema>;

/**
 * Unified beat purpose for narrative structure and visual pacing
 */
export const BeatPurposeSchema = z.enum([
  'setup',      // Establish setting/characters
  'build',      // Develop tension, rising action
  'conflict',   // Obstacle, struggle, complication
  'twist',      // Surprise, reversal
  'climax',     // Peak moment
  'payoff',     // Resolution, reward
  'button',     // Final punctuation, closing beat
]).describe('Narrative beat type: setup (establish), build (tension), conflict (obstacle), twist (surprise), climax (peak), payoff (resolution), button (closing)');

export type BeatPurpose = z.infer<typeof BeatPurposeSchema>;
