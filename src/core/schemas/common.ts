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

/**
 * Key-value trait for flexible character attributes
 */
export const CharacterTraitSchema = z.object({
  key: z.string().min(1).describe('Trait category: eyes, fur, clothing, core, flaw, etc.'),
  value: z.string().min(1).describe('Trait description'),
});

export type CharacterTrait = z.infer<typeof CharacterTraitSchema>;

export const StoryCharacterSchema = z.object({
  name: z.string().min(1).describe('Character name'),
  description: z.string().min(1).describe('Brief character summary'),
  role: z.string().optional().describe('Role in story: protagonist, sidekick, mentor'),
  species: z.string().optional().describe('Character type: human, dog, alien blob, talking teapot'),
  personalityTraits: z.array(CharacterTraitSchema).default([])
    .describe('Personality/behavioral traits: core personality, flaws, quirks'),
  visualTraits: z.array(CharacterTraitSchema).default([])
    .describe('Visual appearance: eyes, fur, clothing, accessories, distinguishing features'),
  notes: z.array(z.string().min(1)).default([]).describe('Additional notes'),
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
