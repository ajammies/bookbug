import type { ComposedStory, RenderedBook, RenderedPage, BookFormatKey, PageRenderContext, StoryCharacter } from '../schemas';
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
 * Convert character array to lookup map by name (used as ID)
 */
const toCharacterMap = (characters: StoryCharacter[]): Record<string, StoryCharacter> =>
  characters.reduce<Record<string, StoryCharacter>>((acc, char) => {
    acc[char.name] = char;
    return acc;
  }, {});

/**
 * Filter a ComposedStory to include only data relevant to a specific page.
 * This creates a minimal payload for image generation.
 */
export const filterStoryForPage = (story: ComposedStory, pageNumber: number): PageRenderContext => {
  const illustratedPage = story.visuals.illustratedPages[pageNumber - 1]; // Pages are 1-indexed
  const prosePage = story.prose.pages[pageNumber - 1];

  // Create character lookup map from array
  const allCharacters = toCharacterMap(story.characters);

  // Extract character IDs from beats, then pick matching characters
  const characterIds = (illustratedPage?.beats ?? [])
    .flatMap(beat => beat.characters)
    .map(char => char.id);

  const relevantCharacters = [...new Set(characterIds)]
    .filter(id => id in allCharacters)
    .reduce<PageRenderContext['characters']>((acc, id) => {
      acc[id] = allCharacters[id]!;
      return acc;
    }, {});

  return {
    storyTitle: story.title,
    style: story.visuals.style,
    characters: relevantCharacters,
    page: {
      pageNumber,
      text: prosePage?.text,
      beats: illustratedPage?.beats,
    },
  };
};
