import type { ComposedStory, RenderedBook, RenderedPage, BookFormatKey, PageRenderContext } from '../schemas';
import { BOOK_FORMATS } from '../schemas';
import { generatePageImage } from '../services/image-generation';

/**
 * Render a single page image from a ComposedStory
 *
 * Returns a RenderedPage with a temporary URL from Replicate.
 * Call this for each page to have full control over the generation process.
 */
export const renderPage = async (
  story: ComposedStory,
  pageNumber: number,
  format: BookFormatKey = 'square-large'
): Promise<RenderedPage> => {
  const storySlice = filterStoryForPage(story, pageNumber);
  const formatSpec = BOOK_FORMATS[format];
  const result = await generatePageImage(storySlice, formatSpec);

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
 * Filter a ComposedStory to include only data relevant to a specific page.
 * This creates a minimal payload for image generation.
 */
export const filterStoryForPage = (story: ComposedStory, pageNumber: number): PageRenderContext => {
  const illustratedPage = story.visuals.illustratedPages[pageNumber - 1]; // Pages are 1-indexed
  const prosePage = story.prose.pages[pageNumber - 1];

  // Extract character IDs from beats
  const characterIds = (illustratedPage?.beats ?? [])
    .flatMap(beat => beat.characters)
    .map(char => char.id);

  const uniqueCharacterIds = [...new Set(characterIds)];

  // Filter character designs to only those appearing on this page
  const characterDesigns = (story.characterDesigns ?? []).filter(
    design => uniqueCharacterIds.includes(design.character.name)
  );

  return {
    storyTitle: story.title,
    style: story.visuals.style,
    characterDesigns,
    page: {
      pageNumber,
      text: prosePage?.text,
      beats: illustratedPage?.beats,
    },
  };
};
