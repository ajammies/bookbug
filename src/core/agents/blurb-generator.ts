import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { StoryBlurbSchema, type StoryBrief, type StoryBlurb } from '../schemas';

const SYSTEM_PROMPT = `You are a children's book story planner. Given a StoryBrief, expand it into a StoryBlurb with detailed plot beats.

Your job:
1. Take the story arc and break it into clear plot beats (typically 8-12 beats for a picture book)
2. Each beat should be a single sentence describing what happens
3. Follow classic story structure: setup → rising action → climax → resolution
4. Make sure the beats flow naturally and build tension appropriately for the age range
5. Include character moments that show personality and growth
6. Set allowCreativeLiberty based on how much the user specified

PLOT BEAT GUIDELINES:
- Beat 1-2: Introduction, establish character and setting
- Beat 3-4: Inciting incident, character wants/needs something
- Beat 5-7: Rising action, obstacles and attempts
- Beat 8-9: Climax, biggest challenge or revelation
- Beat 10-12: Resolution, character growth, satisfying ending

Each beat should be concrete and visual (good for illustration).
Keep language simple - these will guide page-by-page writing.`;

/**
 * BlurbGeneratorAgent: Takes a StoryBrief and generates initial plot beats
 */
export const blurbGeneratorAgent = async (brief: StoryBrief): Promise<StoryBlurb> => {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: StoryBlurbSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(brief, null, 2),
  });

  return object;
};
