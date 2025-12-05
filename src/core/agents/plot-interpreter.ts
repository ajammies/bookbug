import { generateObject } from '../services/ai';
import { StoryWithPlotSchema, type StoryWithPlot } from '../schemas';
import { getModel } from '../config';
import { toExtractablePartial, stripNulls } from '../utils/extractable-schema';

const SYSTEM_PROMPT = `Apply user's requested changes to the story.

Users may:
- Reference beats by number ("change beat 3") or purpose ("strengthen the climax")
- Update story settings ("make it 11 pages", "change the title")

Rules:
- Return ONLY the fields that changed
- For plot changes: maintain 4-6 beats with valid purposes
- Preserve anything the user didn't mention
- If user approves without changes, return empty object`;

/**
 * PlotInterpreterAgent: Applies user's requested changes to story
 *
 * Takes StoryWithPlot and user feedback, outputs partial updates.
 * Caller merges: { ...story, ...updates }
 */
export const plotInterpreterAgent = async (
  userFeedback: string,
  story: StoryWithPlot
): Promise<Partial<StoryWithPlot>> => {
  const contextualPrompt = `Current Story:\n${JSON.stringify(story, null, 2)}\n\nUser feedback:\n${userFeedback}`;

  const { object } = await generateObject({
    model: getModel(),
    schema: toExtractablePartial(StoryWithPlotSchema),
    system: SYSTEM_PROMPT,
    prompt: contextualPrompt,
  });

  // Strip nulls/empty objects that the model returns for unchanged fields
  return stripNulls(object as Record<string, unknown>) as Partial<StoryWithPlot>;
};
