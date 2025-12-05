import type { ComposedStory, RenderedBook, RenderedPage, BookFormatKey, PageRenderContext, ImageQualityResult } from '../schemas';
import { BOOK_FORMATS } from '../schemas';
import { generatePageImage, type ImageModel } from '../services/image-generation';
import { imageQualityAgent } from './image-quality';
import type { Logger } from '../utils/logger';

export interface QualityCheckResult {
  url: string;
  quality?: ImageQualityResult;
  failedAttempts?: Array<{ url: string; quality: ImageQualityResult }>;
}

export interface RenderPageOptions {
  format?: BookFormatKey;
  heroPageUrl?: string;
  /** Enable quality checking with optional threshold (default 70) */
  qualityCheck?: boolean | { threshold?: number; maxRetries?: number };
  logger?: Logger;
  /** Image generation model (default: nano-banana) */
  model?: ImageModel;
}

/** Render a single page image. Pass heroPageUrl (page 1) for style consistency. */
export const renderPage = async (
  story: ComposedStory,
  pageNumber: number,
  options: RenderPageOptions = {}
): Promise<RenderedPage & { quality?: ImageQualityResult; failedAttempts?: Array<{ url: string; quality: ImageQualityResult }> }> => {
  const { format = 'square-large', heroPageUrl, qualityCheck, logger, model } = options;
  const storySlice = filterStoryForPage(story, pageNumber);
  const formatSpec = BOOK_FORMATS[format];

  // No quality check - simple render
  if (!qualityCheck) {
    const result = await generatePageImage(storySlice, formatSpec, { heroPageUrl, logger, model });
    return { pageNumber, url: result.url };
  }

  // Quality check enabled
  const threshold = typeof qualityCheck === 'object' ? qualityCheck.threshold ?? 70 : 70;
  const maxRetries = typeof qualityCheck === 'object' ? qualityCheck.maxRetries ?? 2 : 2;
  const failedAttempts: Array<{ url: string; quality: ImageQualityResult }> = [];

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const result = await generatePageImage(storySlice, formatSpec, { heroPageUrl, logger, model });
    const quality = await imageQualityAgent(result.url, storySlice, { qualityThreshold: threshold, logger });

    if (quality.passesQualityBar || attempt > maxRetries) {
      return { pageNumber, url: result.url, quality, failedAttempts: failedAttempts.length > 0 ? failedAttempts : undefined };
    }

    logger?.warn({ pageNumber, attempt, score: quality.score, issues: quality.issues }, 'Image failed quality check, retrying');
    failedAttempts.push({ url: result.url, quality });
  }

  // Should never reach here, but TypeScript needs it
  throw new Error('Unexpected: exceeded max retries without returning');
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
