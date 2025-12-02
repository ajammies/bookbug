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
 * Key-value trait for flexible character attributes (personality)
 */
export const CharacterTraitSchema = z.object({
  key: z.string().min(1).describe('Trait category: core, flaw, quirk, fear, desire'),
  value: z.string().min(1).describe('Trait description'),
});

export type CharacterTrait = z.infer<typeof CharacterTraitSchema>;

/**
 * Structured visual appearance for consistent character rendering.
 * Each field describes a specific visible attribute.
 */
export const CharacterAppearanceSchema = z.object({
  eyeStyle: z.string().min(1)
    .describe('Eye appearance: shape, size, color, style (e.g., "large round blue eyes", "button eyes", "no visible pupils")'),
  hairStyle: z.string().optional()
    .describe('Hair description: color, length, texture, style (e.g., "short curly red hair", "long braids")'),
  skinTone: z.string().optional()
    .describe('Skin or fur color/texture (e.g., "warm brown skin", "fluffy white fur", "green scales")'),
  bodyType: z.string().min(1)
    .describe('Body shape and proportions (e.g., "small and round", "tall and lanky", "chubby toddler proportions")'),
  clothing: z.string().min(1)
    .describe('Full outfit description (e.g., "red overalls over yellow striped shirt, blue sneakers")'),
  accessories: z.array(z.string().min(1)).default([])
    .describe('Items worn or carried (e.g., "round glasses", "pink bow", "wooden sword")'),
  distinctiveFeatures: z.array(z.string().min(1)).default([])
    .describe('Unique identifying marks (e.g., "freckles", "gap tooth", "scar on left cheek", "missing ear")'),
});

export type CharacterAppearance = z.infer<typeof CharacterAppearanceSchema>;

export const StoryCharacterSchema = z.object({
  name: z.string().min(1).describe('Character name'),
  description: z.string().min(1).describe('Brief character summary'),
  role: z.string().optional().describe('Role in story: protagonist, sidekick, mentor'),
  species: z.string().optional().describe('Character type: human, dog, alien blob, talking teapot'),
  personalityTraits: z.array(CharacterTraitSchema).default([])
    .describe('Personality/behavioral traits: core personality, flaws, quirks'),
  appearance: CharacterAppearanceSchema.optional()
    .describe('Structured visual appearance for consistent rendering'),
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
