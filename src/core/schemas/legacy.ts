import { z } from 'zod';
import { AgeRangeSchema, StoryCharacterSchema } from './common';
import { StoryBriefSchema } from './brief';
import { PlotBeatSchema } from './plot';
import { ManuscriptPageSchema } from './prose';
import { VisualStyleGuideSchema, IllustratedPageSchema } from './visuals';

/**
 * LEGACY schemas - to be removed after full migration
 */

// LEGACY: StoryBlurb (embedded StoryBrief)
export const StoryBlurbSchema = z.object({
  brief: StoryBriefSchema,
  storyArcSummary: z.string().min(1).describe('1-2 sentence story arc summary'),
  plotBeats: z.array(PlotBeatSchema).min(4).max(6).describe('Key story structure beats'),
  allowCreativeLiberty: z.boolean().default(true).describe('Whether the author can embellish beyond the beats'),
});

export type StoryBlurb = z.infer<typeof StoryBlurbSchema>;

// LEGACY: Manuscript metadata
export const ManuscriptMetaSchema = z.object({
  title: z.string().min(1),
  logline: z.string().min(1).describe('One-sentence story summary'),
  theme: z.string().min(1).describe('Central theme or message'),
  setting: z.string().min(1),
  moral: z.string().optional(),
  tone: z.string().optional(),
  styleNotes: z.string().optional().describe('Notes on writing style for this story'),
});

export type ManuscriptMeta = z.infer<typeof ManuscriptMetaSchema>;

// LEGACY: Full Manuscript
export const ManuscriptSchema = z.object({
  blurb: StoryBlurbSchema,
  title: z.string().min(1),
  logline: z.string().min(1).describe('One-sentence story summary'),
  theme: z.string().min(1).describe('Central theme or message'),
  setting: z.string().min(1),
  moral: z.string().optional(),
  ageRange: AgeRangeSchema,
  tone: z.string().optional(),
  styleNotes: z.string().optional().describe('Notes on writing style for this story'),
  characters: z.array(StoryCharacterSchema).min(1),
  pages: z.array(ManuscriptPageSchema).min(1).describe('One ManuscriptPage per page of the book'),
  pageCount: z.number().int().min(8).max(32),
}).refine((manuscript) => manuscript.pages.length === manuscript.pageCount, {
  message: 'pages.length must equal pageCount',
  path: ['pages'],
});

export type Manuscript = z.infer<typeof ManuscriptSchema>;

// LEGACY: Old self-contained Story blob
export const LegacyStorySchema = z.object({
  storyTitle: z.string().min(1),
  ageRange: AgeRangeSchema,
  characters: z.record(z.string(), StoryCharacterSchema),
  manuscript: z.object({
    meta: ManuscriptMetaSchema,
    pages: z.record(z.string(), ManuscriptPageSchema),
  }),
  style: VisualStyleGuideSchema,
  pages: z.array(IllustratedPageSchema).min(1),
});

export type LegacyStory = z.infer<typeof LegacyStorySchema>;
