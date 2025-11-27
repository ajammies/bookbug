import { z } from 'zod';

/**
 * Stage 3: Prose - Output of proseAgent
 */

export const ManuscriptPageSchema = z.object({
  summary: z.string().min(1).describe('Brief description of what happens on this page'),
  text: z.string().min(1).describe('The prose that will appear on the page'),
  imageConcept: z.string().min(1).describe('Description of the illustration for this page'),
});

export type ManuscriptPage = z.infer<typeof ManuscriptPageSchema>;

export const ProseSchema = z.object({
  logline: z.string().min(1).describe('One-sentence story summary'),
  theme: z.string().min(1).describe('Central theme or message'),
  styleNotes: z.string().optional().describe('Notes on writing style for this story'),
  pages: z.array(ManuscriptPageSchema).min(1).describe('One ManuscriptPage per page of the book'),
});

export type Prose = z.infer<typeof ProseSchema>;
