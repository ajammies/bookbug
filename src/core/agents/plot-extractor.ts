import { StoryWithPlotSchema, type StoryWithPlot } from '../schemas';
import { extract } from './extractor';

const CONTEXT = `Apply user's requested changes to the story.

Users may:
- Reference beats by number ("change beat 3") or purpose ("strengthen the climax")
- Update story settings ("make it 11 pages", "change the title")

Rules:
- Return ONLY the fields that changed
- For plot changes: maintain 4-6 beats with valid purposes
- Preserve anything the user didn't mention
- If user approves without changes, return empty object`;

/**
 * PlotExtractorAgent: Applies user's requested changes to story
 *
 * Takes StoryWithPlot and user feedback, outputs partial updates.
 * Caller merges: { ...story, ...updates }
 */
export const plotExtractorAgent = async (
  userFeedback: string,
  story: StoryWithPlot
): Promise<Partial<StoryWithPlot>> => {
  const prompt = `Current Story:\n${JSON.stringify(story, null, 2)}\n\nUser feedback:\n${userFeedback}`;

  const result = await extract(prompt, StoryWithPlotSchema, { context: CONTEXT, maxRetries: 0 });

  // Return whatever was extracted (complete or partial)
  return result.data;
};
