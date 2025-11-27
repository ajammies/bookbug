import { z } from 'zod';

/**
 * Stage 3: Prose - Output of proseAgent
 */

/**
 * ProseSetup - Story-wide prose metadata (output of proseSetupAgent)
 */
export const ProseSetupSchema = z.object({
  logline: z.string().min(1).describe('One-sentence story summary'),
  theme: z.string().min(1).describe('Central theme or message'),
  styleNotes: z.string().optional().describe('Notes on writing style for this story'),
});

export type ProseSetup = z.infer<typeof ProseSetupSchema>;

export const ProsePageSchema = z.object({
  summary: z.string().min(1).describe('Brief description of what happens on this page'),
  text: z.string().min(1).describe('The prose that will appear on the page'),
  imageConcept: z.string().min(1).describe('Description of the illustration for this page'),
});

export type ProsePage = z.infer<typeof ProsePageSchema>;

export const ProseSchema = z.object({
  logline: z.string().min(1).describe('One-sentence story summary'),
  theme: z.string().min(1).describe('Central theme or message'),
  styleNotes: z.string().optional().describe('Notes on writing style for this story'),
  pages: z.array(ProsePageSchema).min(1).describe('One ProsePage per page of the book'),
});

export type Prose = z.infer<typeof ProseSchema>;
