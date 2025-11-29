import type { ComposedStory, RenderedBook, RenderedPage, BookFormatKey, PageRenderContext } from '../schemas';
import { BOOK_FORMATS } from '../schemas';
import { generatePageImage } from '../services/image-generation';

export interface RenderPageOptions {
  format?: BookFormatKey;
  previousPages?: RenderedPage[];
}

/**
 * Render a single page image from a ComposedStory
 *
 * Returns a RenderedPage with a temporary URL from Replicate.
 * Call this for each page to have full control over the generation process.
 * Pass previousPages for style consistency across the book.
 */
export const renderPage = async (
  story: ComposedStory,
  pageNumber: number,
  options: RenderPageOptions = {}
): Promise<RenderedPage> => {
  const { format = 'square-large', previousPages } = options;
  const storySlice = filterStoryForPage(story, pageNumber);
  const formatSpec = BOOK_FORMATS[format];
  const result = await generatePageImage(storySlice, formatSpec, { previousPages });

  return {
    pageNumber,
    url: result.url,
  };
};

/**
 * Create a mock rendered page (for testing without API calls)
 */
export const renderPageMock = (pageNumber: number): RenderedPage => ({
  pageNumber,
  url: `https://placeholder.com/pages/page${pageNumber}.png`,
});

/**
 * Assemble rendered pages into a RenderedBook
 *
 * This is a pure function - no generation, just structure.
 * Pages should already be rendered via renderPage/renderPageMock.
 */
export const createBook = (
  story: ComposedStory,
  pages: RenderedPage[],
  format: BookFormatKey = 'square-large'
): RenderedBook => ({
  storyTitle: story.title,
  ageRange: story.ageRange,
  format,
  pages,
  createdAt: new Date().toISOString(),
});

/**
 * Extract page context from a ComposedStory for image generation.
 * Passes all character designs for consistent visual reference across pages.
 */
export const filterStoryForPage = (story: ComposedStory, pageNumber: number): PageRenderContext => {
  const illustratedPage = story.visuals.illustratedPages[pageNumber - 1];
  const prosePage = story.prose.pages[pageNumber - 1];

  return {
    storyTitle: story.title,
    style: story.visuals.style,
    characterDesigns: story.characterDesigns ?? [],
    page: {
      pageNumber,
      text: prosePage?.text,
      beats: illustratedPage?.beats,
    },
  };
};
