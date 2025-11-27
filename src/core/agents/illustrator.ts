import { generateObject } from 'ai';
import { VisualDirectionSchema, type StoryWithProse, type VisualDirection } from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `You are an illustrator for children's picture books. Given a story with prose, create visual direction for each page.

Your responsibilities:
1. Define a cohesive VisualStyleGuide (art direction, setting, lighting, colors, mood)
2. Break each page into one or more IllustrationBeats
3. For each beat, specify:
   - Shot composition (size, angle, POV, layout)
   - Character positions, expressions, poses
   - Setting details (can override global setting per-beat)
   - Any visual overrides for lighting, mood, atmosphere

Visual principles:
- Use variety in shot sizes (mix wide establishing shots with close-ups)
- Match shot composition to emotional beats (wide for wonder, close for intimacy)
- Consider child's eye level for relatable perspective
- Use color and lighting to reinforce mood
- Ensure visual continuity across pages

Output only the visual direction fields:
- style: VisualStyleGuide with art direction, setting, lighting, colors
- illustratedPages: Array of pages, each with pageNumber and beats`;

/**
 * IllustratorAgent: Takes a StoryWithProse and produces VisualDirection
 *
 * Output contains ONLY the new fields (style, illustratedPages).
 * Caller composes the result: ComposedStory = { ...story, visuals: result }
 */
export const illustratorAgent = async (story: StoryWithProse): Promise<VisualDirection> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: VisualDirectionSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(story, null, 2),
  });

  return object;
};
