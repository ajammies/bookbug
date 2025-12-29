/**
 * Story: Unified schema for progressive story creation
 *
 * Single schema that's progressively filled during intake.
 * Field policies are embedded in .describe() using prefix convention:
 * - [required] - Must be filled before completion
 * - [prompted] - Optional but agent should mention
 * - (no prefix) - Optional, don't actively prompt
 *
 * Following Carmack: "Make it as simple as possible, but not simpler"
 */
import { z } from 'zod';
import { AgeRangeSchema, StoryCharacterSchema, BeatPurposeSchema } from './common';

// ============================================================================
// Plot Beat (inline, no separate file needed)
// ============================================================================

export const PlotBeatSchema = z.object({
  purpose: BeatPurposeSchema.describe('Narrative function of this beat'),
  description: z.string().min(1).describe('One sentence summary of what happens'),
});

export type PlotBeat = z.infer<typeof PlotBeatSchema>;

// ============================================================================
// Story: The unified schema
// ============================================================================

export const StorySchema = z.object({
  // Required fields - must be filled
  title: z.string().min(1).describe('[required] Working title for the story'),
  storyArc: z.string().min(1).describe('[required] The narrative arc (e.g., "hero overcomes fear")'),
  setting: z.string().min(1).describe('[required] Where and when the story takes place'),
  characters: z.array(StoryCharacterSchema).min(1).describe('[required] Story characters - each needs name and description'),
  plotBeats: z.array(PlotBeatSchema).min(3).describe('[required] Key story beats (setup, conflict, climax, resolution)'),

  // Prompted fields - optional but mentioned
  ageRange: AgeRangeSchema.optional().describe('[prompted] Target reader age range (e.g., 4-8)'),
  stylePreset: z.string().optional().describe('[prompted] Visual style preset name'),

  // Optional fields - don't actively prompt
  pageCount: z.number().int().default(24).describe('Number of pages (8-32)'),
  tone: z.string().optional().describe('Emotional tone (e.g., "whimsical", "heartfelt")'),
  moral: z.string().optional().describe('Lesson or takeaway for the reader'),
  interests: z.array(z.string().min(1)).default([]).describe('Topics the child enjoys'),
  customInstructions: z.string().optional().describe('Special requests from the user'),
  allowCreativeLiberty: z.boolean().default(true).describe('Whether author can embellish beyond plot beats'),
});

export type Story = z.infer<typeof StorySchema>;

// ============================================================================
// Policy extraction from schema (no separate mapping file needed)
// ============================================================================

export type FieldPolicy = 'required' | 'prompted' | 'optional';

/**
 * Parse field policy from description prefix
 */
export const parseFieldPolicy = (description?: string): FieldPolicy => {
  if (!description) return 'optional';
  if (description.startsWith('[required]')) return 'required';
  if (description.startsWith('[prompted]')) return 'prompted';
  return 'optional';
};

/**
 * Get clean description without policy prefix
 */
export const getCleanDescription = (description?: string): string => {
  if (!description) return '';
  return description.replace(/^\[(required|prompted)\]\s*/, '');
};

/**
 * Extract field policies from a zod object schema
 */
export const getFieldPolicies = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): Record<string, FieldPolicy> => {
  const policies: Record<string, FieldPolicy> = {};
  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    policies[key] = parseFieldPolicy((fieldSchema as z.ZodTypeAny).description);
  }
  return policies;
};

/**
 * Get required field names from schema
 */
export const getRequiredFields = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): string[] => {
  return Object.entries(getFieldPolicies(schema))
    .filter(([_, policy]) => policy === 'required')
    .map(([field]) => field);
};

/**
 * Get missing required fields from a partial story
 */
export const getMissingRequiredFields = (
  story: Partial<Story>,
  schema: z.ZodObject<typeof StorySchema.shape> = StorySchema
): string[] => {
  const required = getRequiredFields(schema);
  return required.filter(field => {
    const value = story[field as keyof Story];
    if (value === undefined || value === null) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  });
};

/**
 * Check if all required fields are filled
 */
export const hasAllRequiredFields = (story: Partial<Story>): boolean => {
  return getMissingRequiredFields(story).length === 0;
};
