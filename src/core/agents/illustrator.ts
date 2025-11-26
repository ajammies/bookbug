import type { Story, Book, RenderedPage, BookFormatKey } from '../schemas';
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
      const result = await generatePageImage({
        storySlice,
        format: formatSpec,
      });
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
export const filterStoryForPage = (story: Story, pageNumber: number): object => {
  const storyPage = story.pages.find(p => p.pageNumber === pageNumber);
  const manuscriptPage = story.manuscript.pages[String(pageNumber)];

  // Collect character IDs used in this page's beats
  const characterIds = new Set<string>();
  for (const beat of storyPage?.beats ?? []) {
    for (const char of beat.characters) {
      characterIds.add(char.id);
    }
  }

  // Filter characters to only those in this page
  const relevantCharacters: Record<string, unknown> = {};
  for (const id of characterIds) {
    if (story.characters[id]) {
      relevantCharacters[id] = story.characters[id];
    }
  }

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
