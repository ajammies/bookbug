import { z } from 'zod';
// All schemas live here so each agent shares literal contract definitions.
// References:
// - ConciergeAgent emits StoryBrief
// - AuthorAgent consumes StoryBrief and emits StoryDraft
// - ArtDirectorAgent consumes StoryDraft and emits IllustrationPlan
// - IllustratorAgent consumes IllustrationPlan and emits RenderedImage
const PAGE_MIN = 8;
const PAGE_MAX = 32;
const AGE_MIN = 2;
const AGE_MAX = 12;
// Shared age range used everywhere the story tracks audience targeting.
export const AgeRangeSchema = z
    .object({
    min: z.number().int().min(AGE_MIN).max(AGE_MAX),
    max: z.number().int().min(AGE_MIN).max(AGE_MAX),
})
    .refine((range) => range.min <= range.max, {
    message: 'ageRange.min must be less than or equal to ageRange.max',
    path: ['max'],
});
// Character records originate in intake and get enriched downstream.
export const StoryCharacterSchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    role: z.string().optional(),
    traits: z.array(z.string().min(1)).default([]),
});
// ConciergeAgent output; AuthorAgent relies on every field here.
export const StoryBriefSchema = z.object({
    title: z.string().min(1),
    theme: z.string().min(1),
    tone: z.string().optional(),
    setting: z.string().min(1),
    moral: z.string().optional(),
    ageRange: AgeRangeSchema,
    characters: z.array(StoryCharacterSchema).min(1),
    protagonistGoal: z.string().optional(),
    interests: z.array(z.string().min(1)).default([]),
    pageCount: z.number().int().min(PAGE_MIN).max(PAGE_MAX).default(24),
    plotBeats: z.array(z.string().min(1)).default([]),
    allowCreativeLiberty: z.boolean().default(true),
    styleReferences: z.array(z.string().min(1)).default([]),
    dedication: z.string().optional(),
});
// Individual story pages. Writer posts them; planner and renderer read them.
export const StoryPageSchema = z.object({
    pageNumber: z.number().int().min(1),
    summary: z.string().min(1),
    text: z.string().min(1),
    imageConcept: z.string().min(1),
    imagePrompt: z.string().min(1),
});
// AuthorAgent output; ArtDirectorAgent trusts this structure.
export const StoryDraftSchema = z.object({
    title: z.string().min(1),
    logline: z.string().min(1),
    theme: z.string().min(1),
    setting: z.string().min(1),
    moral: z.string().optional(),
    ageRange: AgeRangeSchema,
    tone: z.string().optional(),
    styleNotes: z.string().optional(),
    characters: z.array(StoryCharacterSchema.extend({
        arc: z.string().optional(),
    })).min(1),
    pages: z.array(StoryPageSchema).min(1),
    pageCount: z.number().int().min(PAGE_MIN).max(PAGE_MAX),
});
// Single page entry for IllustrationPlan, consumed by IllustratorAgent.
export const IllustrationPlanPageSchema = z.object({
    pageNumber: z.number().int().min(1),
    prompt: z.string().min(1),
    negativePrompt: z.string().optional(),
    stylePreset: z.string().min(1),
    aspectRatio: z.enum(['1:1', '3:4', '4:3', '16:9']).default('3:4'),
});
// ArtDirectorAgent output; renderer and future stores depend on it.
export const IllustrationPlanSchema = z.object({
    storyTitle: z.string().min(1),
    globalStyle: z.string().min(1),
    pages: z.array(IllustrationPlanPageSchema).min(1),
});
export const ImagePromptSchema = z.object({
    prompt: z.string().min(1),
    negativePrompt: z.string().optional(),
    stylePreset: z.string().optional(),
});
// IllustratorAgent output that storage + web layers ingest.
export const RenderedImageSchema = z.object({
    pageNumber: z.number().int().min(1),
    imagePath: z.string().min(1),
    prompt: z.string().min(1),
    stylePreset: z.string().min(1),
    seed: z.number().int().optional(),
    createdAt: z.string().datetime(),
});
export const ImageRenderResponseSchema = z.object({
    status: z.enum(['success', 'failed']),
    imageUrl: z.string().url().optional(),
    seed: z.number().int().optional(),
    errorMessage: z.string().optional(),
});
//# sourceMappingURL=storyProtocols.js.map