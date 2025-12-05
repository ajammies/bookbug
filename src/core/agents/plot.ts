import { generateObject } from '../services/ai';
import { PlotStructureSchema, type StoryBrief, type PlotStructure } from '../schemas';
import { getModel } from '../config';
import type { Logger } from '../utils/logger';

const SYSTEM_PROMPT = `Generate a story arc summary, plot beats, and enriched character descriptions from a StoryBrief.

First capture the emotional, stylistic, and genre essence of what the user is describing.

storyArcSummary: 1-2 sentences describing the arc, hero, and overall style/genre.

plotBeats: 4-7 beats. KEEP EACH BEAT TO ONE SENTENCE. Structure:
- Introduce character and world
- The problem or inciting incident
- Attempts and obstacles (1-2 beats)
- The turning point
- Resolution and what's learned

STORY QUALITY PRINCIPLES
- One clear problem that escalates (not multiple problems)
- Character-driven resolution through action, not luck or magic
- Character makes mistakes → experiences consequences → learns gradually
- Age-appropriate conflicts children recognize:
  - Ages 2-4: Lost toy, scared of dark, sharing
  - Ages 4-6: Social situations, simple problem-solving
  - Ages 6-8: Internal conflicts, empathy, multi-step problems
- Embed moral in plot events; never state explicitly
- End with emotional closure, not just problem solved

characters: Return the input characters with visualDescription filled in. For each character, describe their visual appearance in detail for sprite generation:
- Body type and proportions (round, lanky, small, etc.)
- Colors (fur/skin/scales, clothing colors)
- Clothing and accessories (hat, scarf, backpack, etc.)
- Props they carry (wand, book, toy, etc.)
- Distinguishing features (big eyes, freckles, antenna, etc.)

Keep descriptions concrete and visual. The author will expand each beat into multiple pages.`;

/**
 * PlotAgent: Takes a StoryBrief and generates plot structure
 *
 * Output contains ONLY the new fields (storyArcSummary, plotBeats, allowCreativeLiberty).
 * Caller composes the result: StoryWithPlot = { ...brief, plot: result }
 */
export const plotAgent = async (brief: StoryBrief, logger?: Logger): Promise<PlotStructure> => {
  logger?.debug(
    { agent: 'plotAgent', title: brief.title, characterCount: brief.characters.length },
    'Generating plot structure'
  );

  const { object } = await generateObject({
    model: getModel(),
    schema: PlotStructureSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(brief, null, 2),
  }, logger, 'plotAgent');

  logger?.info(
    { agent: 'plotAgent', beatCount: object.plotBeats.length, arcSummary: object.storyArcSummary?.substring(0, 100) },
    'Plot structure generated'
  );

  return object;
};
