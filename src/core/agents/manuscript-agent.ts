import { z } from 'zod';
import { generateObject } from '../services/ai';
import { getModel } from '../config';
import { StorySchema, type Story } from '../schemas/story';
import { ProseSetupSchema, ProsePageSchema, type ProseSetup, type ProsePage } from '../schemas/prose';
import { createRepairFunction } from '../utils/repair';
import type { Logger } from '../utils/logger';

/**
 * ManuscriptResult: Output of manuscriptAgent
 * Contains all data needed to skip intake and prose generation stages
 */
export interface ManuscriptResult {
  story: Story;
  proseSetup: ProseSetup;
  prosePages: ProsePage[];
}

/**
 * Schema for manuscript extraction
 * Combines Story metadata, ProseSetup, and ProsePage[] in a single extraction
 */
const ManuscriptExtractionSchema = z.object({
  story: z.object({
    title: z.string().min(1).describe('The title of the story, extracted from the manuscript'),
    storyArc: z.string().min(1).describe('The narrative arc - the core journey or transformation'),
    setting: z.string().min(1).describe('Where and when the story takes place'),
    characters: z.array(z.object({
      name: z.string().min(1).describe('Character name'),
      description: z.string().min(1).describe('Brief description of the character'),
    })).min(1).describe('Main characters from the manuscript'),
    plotBeats: z.array(z.object({
      purpose: z.enum(['setup', 'build', 'conflict', 'twist', 'climax', 'payoff', 'button']).describe('Narrative function: setup (establish), build (tension), conflict (obstacle), twist (surprise), climax (peak), payoff (resolution), button (closing)'),
      description: z.string().min(1).describe('What happens in this beat'),
    })).min(3).describe('Key story beats extracted from the manuscript'),
    ageRange: z.string().optional().describe('Target age range if apparent from text complexity'),
    pageCount: z.number().int().optional().describe('Number of pages - determined by how you split the text'),
  }),
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

const SYSTEM_PROMPT = `You are a manuscript analyzer for children's picture books.

Given a manuscript, extract:
1. Story metadata (title, characters, setting, plot structure)
2. Prose setup (logline, theme, style notes)
3. Split into pages with EXACT text preservation

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

EXTRACTION GUIDELINES:
- Identify the title (often at the start or prominent heading)
- Extract ALL named characters with brief descriptions
- Identify the setting from context clues
- Find the story arc (what changes or is learned)
- Identify plot beats: setup, conflict, rising action, climax, resolution

For each page, AFTER copying the exact text:
- Write a brief summary of what happens
- Write an imageConcept describing what illustration would accompany the text`;

export interface ManuscriptAgentOptions {
  logger?: Logger;
}

/**
 * ManuscriptAgent: Extracts Story + Prose from a pre-written manuscript
 *
 * Preserves exact manuscript wording in ProsePage.text while generating
 * metadata (summary, imageConcept) needed for the visual pipeline.
 */
export const manuscriptAgent = async (
  manuscript: string,
  options: ManuscriptAgentOptions = {}
): Promise<ManuscriptResult> => {
  const { logger } = options;

  if (!manuscript.trim()) {
    throw new Error('Manuscript cannot be empty');
  }

  logger?.debug(
    { agent: 'manuscriptAgent', manuscriptLength: manuscript.length },
    'Extracting story and prose from manuscript'
  );

  const { object } = await generateObject({
    model: getModel(),
    schema: ManuscriptExtractionSchema,
    system: SYSTEM_PROMPT,
    prompt: manuscript,
    experimental_repairText: createRepairFunction(),
  }, logger, 'manuscriptAgent');

  // Parse and validate story against full schema with defaults
  const story = StorySchema.parse({
    ...object.story,
    pageCount: object.prosePages.length,
  });

  // Validate prose setup
  const proseSetup = ProseSetupSchema.parse(object.proseSetup);

  // Validate prose pages
  const prosePages = object.prosePages.map(page => ProsePageSchema.parse(page));

  logger?.info(
    {
      agent: 'manuscriptAgent',
      title: story.title,
      pageCount: prosePages.length,
      characterCount: story.characters.length,
    },
    'Manuscript extraction complete'
  );

  return {
    story,
    proseSetup,
    prosePages,
  };
};
