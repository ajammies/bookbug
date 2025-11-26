import type { Story, Book, RenderedPage, BookFormatKey, StorySlice } from '../schemas';
import { BOOK_FORMATS } from '../schemas';
import { generatePageImage } from '../services/image-generation';

/**
 * Configuration for the illustrator agent
 */
export interface IllustratorConfig {
  /** Book format preset (default: 'square-large') */
  format?: BookFormatKey;
  /** Use mock data instead of real generation (for testing) */
  mock?: boolean;
  /** Callback for progress updates */
  onPageRendered?: (pageNumber: number, url: string) => void;
}

/**
 * IllustratorAgent: Takes a Story and produces a rendered Book
 *
 * Generates one image per page by passing filtered Story JSON to Nano Banana Pro.
 * The model receives the full context (style, characters) plus the specific page.
 */
export const illustratorAgent = async (
  story: Story,
  config: IllustratorConfig = {}
): Promise<Book> => {
  const {
    format = 'square-large',
    mock = false,
    onPageRendered,
  } = config;

  const formatSpec = BOOK_FORMATS[format];
  const pages: RenderedPage[] = [];

  for (const storyPage of story.pages) {
    let url: string;

    if (mock) {
      // Mock mode for testing
      url = `https://placeholder.com/pages/page${storyPage.pageNumber}.png`;
    } else {
      // Real image generation via Replicate
      const storySlice = filterStoryForPage(story, storyPage.pageNumber);
      const result = await generatePageImage(storySlice, formatSpec);
      url = result.url;
    }

    pages.push({
      pageNumber: storyPage.pageNumber,
      url,
    });

    onPageRendered?.(storyPage.pageNumber, url);
  }

  return {
    storyTitle: story.storyTitle,
    ageRange: story.ageRange,
    format,
    pages,
    createdAt: new Date().toISOString(),
  };
};

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
