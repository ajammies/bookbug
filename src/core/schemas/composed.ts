import { z } from 'zod';
import { StorySchema } from './story';
import { ProseSchema } from './prose';
import { VisualDirectionSchema, CharacterDesignSchema } from './visuals';

/**
 * Composed Types: Linear pipeline composition
 * Each stage adds new fields to the previous.
 *
 * Base is Story (the unified schema with all story details).
 */

/**
 * StoryWithProse: Story + Prose
 * Result of running proseAgent on a story.
 */
export const StoryWithProseSchema = StorySchema.extend({
  prose: ProseSchema,
});

export type StoryWithProse = z.infer<typeof StoryWithProseSchema>;

/**
 * ComposedStory: StoryWithProse + VisualDirection + CharacterDesigns
 * The complete story ready for rendering.
 */
export const ComposedStorySchema = StoryWithProseSchema.extend({
  visuals: VisualDirectionSchema,
  characterDesigns: z.array(CharacterDesignSchema).optional().describe('Sprite sheets for consistent character rendering'),
});

export type ComposedStory = z.infer<typeof ComposedStorySchema>;
