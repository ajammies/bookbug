import type { Story, RenderedBook, RenderedPage, BookFormatKey, StorySlice } from '../schemas';
import { BOOK_FORMATS } from '../schemas';
import { generatePageImage } from '../services/image-generation';

/**
 * Render a single page image from a Story
 *
 * Returns a RenderedPage with a temporary URL from Replicate.
 * Call this for each page to have full control over the generation process.
 */
export const renderPage = async (
  story: Story,
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
  story: Story,
  pages: RenderedPage[],
  format: BookFormatKey = 'square-large'
): RenderedBook => ({
  storyTitle: story.storyTitle,
  ageRange: story.ageRange,
  format,
  pages,
  createdAt: new Date().toISOString(),
});

/**
 * Filter a Story to include only data relevant to a specific page.
 * This creates a minimal payload for image generation.
 */
export const filterStoryForPage = (story: Story, pageNumber: number): StorySlice => {
  const storyPage = story.pages[pageNumber - 1]; // Pages are 1-indexed
  const manuscriptPage = story.manuscript.pages[String(pageNumber)];

  // Extract character IDs from beats, then pick matching characters
  const characterIds = (storyPage?.beats ?? [])
    .flatMap(beat => beat.characters)
    .map(char => char.id);

  const relevantCharacters = [...new Set(characterIds)]
    .filter(id => id in story.characters)
    .reduce<StorySlice['characters']>((acc, id) => {
      acc[id] = story.characters[id]!;
      return acc;
    }, {});

  return {
    storyTitle: story.storyTitle,
    style: story.style,
    characters: relevantCharacters,
    page: {
      pageNumber,
      text: manuscriptPage?.text,
      beats: storyPage?.beats,
    },
  };
};
