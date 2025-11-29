import { generateObject } from '../utils/ai';
import { PlotStructureSchema, type StoryBrief, type PlotStructure } from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `Generate a story arc summary and plot beats from a StoryBrief.

First capture the emotional, stylistic, and genre essence of what the user is describing.

storyArcSummary: 1-2 sentences describing the arc, hero, and overall style/genre.

plotBeats: 4-7 beats (extend if instructions say to). Structure approximately:
- Introduce character, world, and status quo
- The problem, challenge, or inciting incident
- Attempts, obstacles, escalation (can have 1-2 of these)
- The turning point or biggest moment
- How it ends, what's learned

Keep descriptions concrete and visual. The author will expand each beat into multiple pages.`;

/**
 * PlotAgent: Takes a StoryBrief and generates plot structure
 *
 * Output contains ONLY the new fields (storyArcSummary, plotBeats, allowCreativeLiberty).
 * Caller composes the result: StoryWithPlot = { ...brief, plot: result }
 */
export const plotAgent = async (brief: StoryBrief): Promise<PlotStructure> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: PlotStructureSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(brief, null, 2),
  });

  return object;
};
