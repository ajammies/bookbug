import type {
  StoryBlurb,
  StoryWithPlot,
  StoryWithProse,
  ComposedStory,
  Prose,
  VisualDirection,
  Manuscript,
  Story,
  RenderedBook,
  BookFormatKey,
  RenderedPage,
} from './schemas';
import {
  proseAgent,
  visualsAgent,
  renderPage,
  renderPageMock,
  createBook,
  type OnStepProgress,
} from './agents';

/**
 * Pipeline result - discriminated union based on completion stage
 * Uses composed types for the functional pipeline.
 */
export type PipelineResult =
  | { stage: 'prose'; storyWithPlot: StoryWithPlot; prose: Prose }
  | { stage: 'visuals'; storyWithProse: StoryWithProse; visuals: VisualDirection }
  | { stage: 'book'; story: ComposedStory; book: RenderedBook }
  // LEGACY: Keep old result shape for backward compatibility during migration
  | { stage: 'manuscript'; blurb: StoryBlurb; manuscript: Manuscript }
  | { stage: 'story'; blurb: StoryBlurb; manuscript: Manuscript; story: Story };

/**
 * Pipeline options
 */
export interface PipelineOptions {
  /** Callback for progress updates */
  onProgress?: OnStepProgress;
  /** Stop after a specific step (for partial runs) */
  stopAfter?: 'prose' | 'visuals' | 'book';
}

/**
 * Convert StoryBlurb (legacy) to StoryWithPlot (composed)
 */
const toStoryWithPlot = (blurb: StoryBlurb): StoryWithPlot => ({
  ...blurb.brief,
  plot: {
    storyArcSummary: blurb.storyArcSummary,
    plotBeats: blurb.plotBeats,
    allowCreativeLiberty: blurb.allowCreativeLiberty,
  },
});

/**
 * Execute the pipeline from StoryBlurb to rendered book
 *
 * Pipeline flow (functional composition):
 *   StoryWithPlot → proseAgent → Prose
 *   StoryWithProse → visualsAgent → VisualDirection
 *   ComposedStory → Renderer → RenderedBook
 */
export async function executePipeline(
  blurb: StoryBlurb,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const { onProgress, stopAfter } = options;

  // Convert legacy StoryBlurb to composed StoryWithPlot
  const storyWithPlot = toStoryWithPlot(blurb);

  // Step 1: Write prose from story with plot
  onProgress?.('prose', 'start');
  const prose = await proseAgent(storyWithPlot);
  onProgress?.('prose', 'complete', prose);

  if (stopAfter === 'prose') {
    return { stage: 'prose', storyWithPlot, prose };
  }

  // Compose StoryWithProse
  const storyWithProse: StoryWithProse = { ...storyWithPlot, prose };

  // Step 2: Create visual direction from story with prose
  onProgress?.('visuals', 'start');
  const visuals = await visualsAgent(storyWithProse);
  onProgress?.('visuals', 'complete', visuals);

  if (stopAfter === 'visuals') {
    return { stage: 'visuals', storyWithProse, visuals };
  }

  // Compose full Story
  const story: ComposedStory = { ...storyWithProse, visuals };

  // Step 3: Render book from story (generate all page images)
  onProgress?.('renderer', 'start');
  const pages: RenderedPage[] = [];
  for (const storyPage of story.visuals.illustratedPages) {
    const page = await renderPage(story, storyPage.pageNumber);
    pages.push(page);
  }
  const book = createBook(story, pages);
  onProgress?.('renderer', 'complete', book);

  return { stage: 'book', story, book };
}

/**
 * Run individual pipeline steps (for CLI commands)
 */
export async function runProse(storyWithPlot: StoryWithPlot): Promise<Prose> {
  return proseAgent(storyWithPlot);
}

export async function runVisuals(storyWithProse: StoryWithProse): Promise<VisualDirection> {
  return visualsAgent(storyWithProse);
}

/**
 * Render a single page (re-export for CLI convenience)
 */
export { renderPage, renderPageMock, createBook } from './agents';

/**
 * Render all pages and create a book (convenience wrapper)
 */
export async function runBook(
  story: ComposedStory,
  config?: { mock?: boolean; format?: BookFormatKey; onPageRendered?: (page: RenderedPage) => void }
): Promise<RenderedBook> {
  const { mock = false, format = 'square-large', onPageRendered } = config ?? {};

  const pages: RenderedPage[] = [];
  for (const storyPage of story.visuals.illustratedPages) {
    const page = mock
      ? renderPageMock(storyPage.pageNumber)
      : await renderPage(story, storyPage.pageNumber, format);
    pages.push(page);
    onPageRendered?.(page);
  }

  return createBook(story, pages, format);
}
