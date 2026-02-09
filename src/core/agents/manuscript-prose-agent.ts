import { z } from 'zod';
import { generateObject } from '../services/ai';
import { getModel } from '../config';
import { ProseSetupSchema, ProsePageSchema, type ProseSetup, type ProsePage } from '../schemas/prose';
import { createRepairFunction } from '../utils/repair';
import type { Logger } from '../utils/logger';

/**
 * ManuscriptProseResult: Output of manuscriptProseAgent
 * Contains prose data extracted from manuscript text
 */
export interface ManuscriptProseResult {
  proseSetup: ProseSetup;
  prosePages: ProsePage[];
}

/**
 * Schema for prose extraction from manuscript
 * Only extracts prose-related data, not story metadata
 */
const ManuscriptProseSchema = z.object({
  proseSetup: z.object({
    logline: z.string().min(1).describe('One-sentence summary of the story'),
    theme: z.string().min(1).describe('Central theme or message of the story'),
    styleNotes: z.string().optional().describe('Notes on the writing style'),
  }),
  prosePages: z.array(z.object({
    text: z.string().min(1).describe('EXACT text from the manuscript for this page - DO NOT modify or paraphrase'),
    summary: z.string().min(1).describe('Brief description of what happens on this page'),
    imageConcept: z.string().min(1).describe('Description of the illustration for this page'),
  })).min(1).describe('Pages with EXACT manuscript text plus generated summary and imageConcept'),
});

const SYSTEM_PROMPT = `You are a manuscript processor for children's picture books.

Given a manuscript, extract:
1. Prose setup (logline, theme, style notes)
2. Split into pages with EXACT text preservation

CRITICAL RULES FOR PAGE TEXT:
- The "text" field for each page MUST contain the EXACT wording from the manuscript
- DO NOT paraphrase, rewrite, or improve the text
- DO NOT add or remove words
- Copy the text character-for-character, preserving:
  - Punctuation
  - Quotation marks and dialogue
  - Line breaks within passages
- Only clean up obvious formatting issues (extra whitespace, encoding artifacts)

PAGE SPLITTING GUIDELINES:
- Split at natural narrative breaks (scene changes, dialogue turns, paragraph breaks)
- Each page should have 1-4 sentences for picture book pacing
- Aim for 12-24 pages total depending on manuscript length
- Every word from the manuscript should appear in exactly one page

For each page, AFTER copying the exact text:
- Write a brief summary of what happens
- Write an imageConcept describing what illustration would accompany the text`;

export interface ManuscriptProseAgentOptions {
  logger?: Logger;
}

/**
 * ManuscriptProseAgent: Extracts prose pages from a pre-written manuscript
 *
 * Use this AFTER intake completes to split the manuscript into pages.
 * Preserves exact manuscript wording in ProsePage.text while generating
 * metadata (summary, imageConcept) needed for the visual pipeline.
 */
export const manuscriptProseAgent = async (
  manuscript: string,
  options: ManuscriptProseAgentOptions = {}
): Promise<ManuscriptProseResult> => {
  const { logger } = options;

  if (!manuscript.trim()) {
    throw new Error('Manuscript cannot be empty');
  }

  logger?.debug(
    { agent: 'manuscriptProseAgent', manuscriptLength: manuscript.length },
    'Extracting prose from manuscript'
  );

  const { object } = await generateObject({
    model: getModel(),
    schema: ManuscriptProseSchema,
    system: SYSTEM_PROMPT,
    prompt: manuscript,
    experimental_repairText: createRepairFunction(),
  }, logger, 'manuscriptProseAgent');

  const proseSetup = ProseSetupSchema.parse(object.proseSetup);
  const prosePages = object.prosePages.map(page => ProsePageSchema.parse(page));

  logger?.info(
    {
      agent: 'manuscriptProseAgent',
      pageCount: prosePages.length,
      logline: proseSetup.logline?.substring(0, 50),
    },
    'Manuscript prose extraction complete'
  );

  return {
    proseSetup,
    prosePages,
  };
};
