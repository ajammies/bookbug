import { generateObject } from '../services/ai';
import { PlotStructureSchema, type StoryWithPlot, type PlotStructure } from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `Modify plot beats based on user feedback.

Users may reference beats by number ("change beat 3") or purpose ("strengthen the climax").

Rules:
- Maintain 4-6 beats with valid purposes: setup, conflict, rising_action, climax, resolution
- Preserve beats the user didn't mention
- Update storyArcSummary if the core story changes
- If user approves, return unchanged

Output only the plot fields (storyArcSummary, plotBeats, allowCreativeLiberty).`;

/**
 * PlotInterpreterAgent: Applies user's requested changes to plot beats
 *
 * Takes StoryWithPlot and user feedback, outputs PlotStructure.
 * Caller merges the result: { ...story, plot: result }
 */
export const plotInterpreterAgent = async (
  userFeedback: string,
  story: StoryWithPlot
): Promise<PlotStructure> => {
  const contextualPrompt = `Current Story:\n${JSON.stringify(story, null, 2)}\n\nUser feedback:\n${userFeedback}`;

  const { object } = await generateObject({
    model: getModel(),
    schema: PlotStructureSchema,
    system: SYSTEM_PROMPT,
    prompt: contextualPrompt,
  });

  return object;
};
