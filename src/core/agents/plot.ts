import { generateObject } from '../utils/ai';
import { PlotStructureSchema, type StoryBrief, type PlotStructure } from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `Generate a story arc summary and 5-6 structural plot beats from a StoryBrief.

storyArcSummary: 1-2 sentences capturing the core journey and theme.

plotBeats (5-6 beats with purpose labels):
- setup: Introduce character, world, and status quo
- conflict: The problem, challenge, or inciting incident
- rising_action: Attempts, obstacles, escalation (can have 1-2 of these)
- climax: The turning point or biggest moment
- resolution: How it ends, what's learned

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
