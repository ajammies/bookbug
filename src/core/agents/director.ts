import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { StorySchema, type Manuscript, type Story } from '../schemas';
import type { DirectorAgent } from './index';

const SYSTEM_PROMPT = `You are an art director for children's picture books. Given a Manuscript, create a complete visual Story with detailed shot compositions for each beat.

Your responsibilities:
1. Define a cohesive VisualStyleGuide (art direction, setting, lighting, colors, mood)
2. Break each manuscript page into one or more StoryBeats
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

Output a complete Story ready for illustration.`;

/**
 * DirectorAgent: Takes a Manuscript and produces a visual Story
 */
export const directorAgent: DirectorAgent = async (manuscript: Manuscript): Promise<Story> => {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: StorySchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(manuscript, null, 2),
  });

  return object;
};
