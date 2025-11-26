import type { Story, Book, BookPage, RenderedImage } from '../schemas';
import type { IllustratorAgent } from './index';
import { generateImage, type GenerateImageOptions } from '../services/image-generation';
import { buildBeatPrompt } from '../services/prompt-builder';

/**
 * Configuration for the illustrator agent
 */
export interface IllustratorConfig {
  /** Image generation model to use */
  model?: GenerateImageOptions['model'];
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Use mock data instead of real generation (for testing) */
  mock?: boolean;
  /** Callback for progress updates */
  onImageGenerated?: (pageNumber: number, beatOrder: number, imageUrl: string) => void;
}

const DEFAULT_CONFIG: IllustratorConfig = {
  model: 'flux-schnell',
  width: 1024,
  height: 768, // 4:3 aspect ratio for picture books
  mock: false,
};

/**
 * IllustratorAgent: Takes a Story and produces a rendered Book
 *
 * Orchestrates image generation for each beat in the story using:
 * - Replicate API with configurable models (Flux, SDXL, Nano Banana Pro)
 * - Prompt builder to convert story data into image prompts
 */
export const illustratorAgent: IllustratorAgent = async (
  story: Story,
  config: IllustratorConfig = {}
): Promise<Book> => {
  const { model, width, height, mock, onImageGenerated } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const pages: BookPage[] = [];

  for (const storyPage of story.pages) {
    const images: RenderedImage[] = [];

    for (const beat of storyPage.beats) {
      let imageUrl: string;
      let imageWidth: number;
      let imageHeight: number;

      if (mock) {
        // Mock mode for testing
        imageUrl = `https://placeholder.com/images/page${storyPage.pageNumber}_beat${beat.order}.png`;
        imageWidth = width ?? 1024;
        imageHeight = height ?? 768;
      } else {
        // Build prompt from beat data
        const pageText = story.manuscript.pages[String(storyPage.pageNumber)]?.text;
        const { prompt, negativePrompt } = buildBeatPrompt(
          beat,
          story.style,
          story.characters,
          pageText
        );

        // Generate image
        const result = await generateImage({
          prompt,
          negativePrompt,
          width,
          height,
          model,
        });

        imageUrl = result.url;
        imageWidth = result.width;
        imageHeight = result.height;
      }

      const image: RenderedImage = {
        id: `img_page${storyPage.pageNumber}_beat${beat.order}`,
        pageNumber: storyPage.pageNumber,
        beatOrder: beat.order,
        url: imageUrl,
        width: imageWidth,
        height: imageHeight,
        mimeType: 'image/png',
        meta: {
          prompt: beat.summary,
          style: story.style.art_direction.genre,
          model: mock ? 'mock' : model,
        },
      };

      images.push(image);

      // Notify progress
      onImageGenerated?.(storyPage.pageNumber, beat.order, imageUrl);
    }

    // Get text from the manuscript using the page number
    const text = story.manuscript.pages[String(storyPage.pageNumber)]?.text ?? '';

    pages.push({
      pageNumber: storyPage.pageNumber,
      text,
      images,
    });
  }

  return {
    storyTitle: story.storyTitle,
    ageRange: story.ageRange,
    pages,
    meta: {
      createdAt: new Date().toISOString(),
      version: '1.0',
      model: mock ? 'mock' : model,
    },
  };
};

/**
 * Create an illustrator agent with custom configuration
 */
export const createIllustratorAgent = (
  config: IllustratorConfig
): IllustratorAgent => {
  return (story: Story) => illustratorAgent(story, config);
};
