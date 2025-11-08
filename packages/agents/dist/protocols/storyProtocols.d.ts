import { z } from 'zod';
export declare const AgeRangeSchema: z.ZodObject<{
    min: z.ZodNumber;
    max: z.ZodNumber;
}, z.core.$strip>;
export declare const StoryCharacterSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    role: z.ZodOptional<z.ZodString>;
    traits: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const StoryBriefSchema: z.ZodObject<{
    title: z.ZodString;
    theme: z.ZodString;
    tone: z.ZodOptional<z.ZodString>;
    setting: z.ZodString;
    moral: z.ZodOptional<z.ZodString>;
    ageRange: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    characters: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
        traits: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    protagonistGoal: z.ZodOptional<z.ZodString>;
    interests: z.ZodDefault<z.ZodArray<z.ZodString>>;
    pageCount: z.ZodDefault<z.ZodNumber>;
    plotBeats: z.ZodDefault<z.ZodArray<z.ZodString>>;
    allowCreativeLiberty: z.ZodDefault<z.ZodBoolean>;
    styleReferences: z.ZodDefault<z.ZodArray<z.ZodString>>;
    dedication: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type StoryBrief = z.infer<typeof StoryBriefSchema>;
export declare const StoryPageSchema: z.ZodObject<{
    pageNumber: z.ZodNumber;
    summary: z.ZodString;
    text: z.ZodString;
    imageConcept: z.ZodString;
    imagePrompt: z.ZodString;
}, z.core.$strip>;
export declare const StoryDraftSchema: z.ZodObject<{
    title: z.ZodString;
    logline: z.ZodString;
    theme: z.ZodString;
    setting: z.ZodString;
    moral: z.ZodOptional<z.ZodString>;
    ageRange: z.ZodObject<{
        min: z.ZodNumber;
        max: z.ZodNumber;
    }, z.core.$strip>;
    tone: z.ZodOptional<z.ZodString>;
    styleNotes: z.ZodOptional<z.ZodString>;
    characters: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        role: z.ZodOptional<z.ZodString>;
        traits: z.ZodDefault<z.ZodArray<z.ZodString>>;
        arc: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    pages: z.ZodArray<z.ZodObject<{
        pageNumber: z.ZodNumber;
        summary: z.ZodString;
        text: z.ZodString;
        imageConcept: z.ZodString;
        imagePrompt: z.ZodString;
    }, z.core.$strip>>;
    pageCount: z.ZodNumber;
}, z.core.$strip>;
export type StoryDraft = z.infer<typeof StoryDraftSchema>;
export declare const IllustrationPlanPageSchema: z.ZodObject<{
    pageNumber: z.ZodNumber;
    prompt: z.ZodString;
    negativePrompt: z.ZodOptional<z.ZodString>;
    stylePreset: z.ZodString;
    aspectRatio: z.ZodDefault<z.ZodEnum<{
        "1:1": "1:1";
        "3:4": "3:4";
        "4:3": "4:3";
        "16:9": "16:9";
    }>>;
}, z.core.$strip>;
export declare const IllustrationPlanSchema: z.ZodObject<{
    storyTitle: z.ZodString;
    globalStyle: z.ZodString;
    pages: z.ZodArray<z.ZodObject<{
        pageNumber: z.ZodNumber;
        prompt: z.ZodString;
        negativePrompt: z.ZodOptional<z.ZodString>;
        stylePreset: z.ZodString;
        aspectRatio: z.ZodDefault<z.ZodEnum<{
            "1:1": "1:1";
            "3:4": "3:4";
            "4:3": "4:3";
            "16:9": "16:9";
        }>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type IllustrationPlan = z.infer<typeof IllustrationPlanSchema>;
export declare const ImagePromptSchema: z.ZodObject<{
    prompt: z.ZodString;
    negativePrompt: z.ZodOptional<z.ZodString>;
    stylePreset: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ImagePrompt = z.infer<typeof ImagePromptSchema>;
export declare const RenderedImageSchema: z.ZodObject<{
    pageNumber: z.ZodNumber;
    imagePath: z.ZodString;
    prompt: z.ZodString;
    stylePreset: z.ZodString;
    seed: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodString;
}, z.core.$strip>;
export type RenderedImage = z.infer<typeof RenderedImageSchema>;
export declare const ImageRenderResponseSchema: z.ZodObject<{
    status: z.ZodEnum<{
        success: "success";
        failed: "failed";
    }>;
    imageUrl: z.ZodOptional<z.ZodString>;
    seed: z.ZodOptional<z.ZodNumber>;
    errorMessage: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ImageRenderResult = z.infer<typeof ImageRenderResponseSchema>;
//# sourceMappingURL=storyProtocols.d.ts.map