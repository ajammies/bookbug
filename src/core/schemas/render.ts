import { z } from 'zod';
import { AgeRangeSchema, StoryCharacterSchema } from './common';
import { VisualStyleGuideSchema, IllustrationBeatSchema } from './visuals';
import { BookFormatKeySchema } from './formats';

/**
 * Stage 5: Rendered output
 */

export const RenderedPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  url: z.string().url(),
});

export type RenderedPage = z.infer<typeof RenderedPageSchema>;

export const RenderedBookSchema = z.object({
  storyTitle: z.string().min(1),
  ageRange: AgeRangeSchema,
  format: BookFormatKeySchema.default('square-large'),
  pages: z.array(RenderedPageSchema).min(1),
  createdAt: z.string().datetime(),
});

export type RenderedBook = z.infer<typeof RenderedBookSchema>;

/**
 * PageRenderContext: Context needed to render a single page illustration
 */
export const PageRenderContextSchema = z.object({
  storyTitle: z.string().min(1),
  style: VisualStyleGuideSchema,
  characters: z.record(z.string(), StoryCharacterSchema),
  page: z.object({
    pageNumber: z.number().int().min(1),
    text: z.string().optional(),
    beats: z.array(IllustrationBeatSchema).optional(),
  }),
});

export type PageRenderContext = z.infer<typeof PageRenderContextSchema>;

/**
 * ImageGenerationResult: raw output from image generation API
 */
export const ImageGenerationResultSchema = z.union([
  z.array(z.string().url()).min(1),
  z.array(z.object({ url: z.function().returns(z.string()) })).min(1),
  z.string().url(),
]);

export type ImageGenerationResult = z.infer<typeof ImageGenerationResultSchema>;
