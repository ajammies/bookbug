/**
 * Intake Tools for the Intake Agent
 *
 * Tools that the intake agent uses to collect and update story information.
 * Tools mutate state directly via closure and return feedback to the model.
 */
import { tool } from 'ai';
import { z } from 'zod';
import {
  StoryCharacterSchema,
  AgeRangeSchema,
  PlotBeatSchema,
  type StoryBrief,
  type PlotStructure,
  type StoryCharacter,
  type PlotBeat,
} from '../schemas';

/**
 * State passed to tools via closure
 */
export interface IntakeState {
  brief: Partial<StoryBrief>;
  plot: Partial<PlotStructure>;
  isComplete: boolean;
}

/**
 * Tool result returned to the model
 */
export interface ToolResult {
  success: boolean;
  message: string;
  updatedFields?: string[];
}

/**
 * Creates intake tools bound to a state object
 *
 * Tools mutate the state directly and return feedback to the model.
 * The pipeline manages the state object and conversation loop.
 */
export const createIntakeTools = (state: IntakeState) => ({
  // ============================================================================
  // Brief Field Tools
  // ============================================================================

  setTitle: tool({
    description: 'Set the story title',
    inputSchema: z.object({
      title: z.string().min(1).describe('The title for the story'),
    }),
    execute: async ({ title }): Promise<ToolResult> => {
      state.brief.title = title;
      return { success: true, message: `Title set to "${title}"`, updatedFields: ['title'] };
    },
  }),

  setStoryArc: tool({
    description: 'Set the story arc or narrative journey',
    inputSchema: z.object({
      storyArc: z.string().min(1).describe('The narrative arc (e.g., "hero overcomes fear")'),
    }),
    execute: async ({ storyArc }): Promise<ToolResult> => {
      state.brief.storyArc = storyArc;
      return { success: true, message: `Story arc set to "${storyArc}"`, updatedFields: ['storyArc'] };
    },
  }),

  setSetting: tool({
    description: 'Set where and when the story takes place',
    inputSchema: z.object({
      setting: z.string().min(1).describe('Where and when the story takes place'),
    }),
    execute: async ({ setting }): Promise<ToolResult> => {
      state.brief.setting = setting;
      return { success: true, message: `Setting set to "${setting}"`, updatedFields: ['setting'] };
    },
  }),

  setAgeRange: tool({
    description: 'Set the target reader age range',
    inputSchema: z.object({
      min: z.number().int().min(2).max(18).describe('Minimum age'),
      max: z.number().int().min(2).max(18).describe('Maximum age'),
    }),
    execute: async ({ min, max }): Promise<ToolResult> => {
      if (min > max) {
        return { success: false, message: 'Minimum age must be less than or equal to maximum age' };
      }
      state.brief.ageRange = { min, max };
      return { success: true, message: `Age range set to ${min}-${max}`, updatedFields: ['ageRange'] };
    },
  }),

  setPageCount: tool({
    description: 'Set the number of pages in the book',
    inputSchema: z.object({
      pageCount: z.number().int().min(8).max(32).describe('Number of pages (8-32)'),
    }),
    execute: async ({ pageCount }): Promise<ToolResult> => {
      state.brief.pageCount = pageCount;
      return { success: true, message: `Page count set to ${pageCount}`, updatedFields: ['pageCount'] };
    },
  }),

  setTone: tool({
    description: 'Set the emotional tone of the story',
    inputSchema: z.object({
      tone: z.string().min(1).describe('Emotional tone (e.g., "whimsical", "heartfelt")'),
    }),
    execute: async ({ tone }): Promise<ToolResult> => {
      state.brief.tone = tone;
      return { success: true, message: `Tone set to "${tone}"`, updatedFields: ['tone'] };
    },
  }),

  setMoral: tool({
    description: 'Set the lesson or moral of the story',
    inputSchema: z.object({
      moral: z.string().min(1).describe('The lesson or takeaway for the reader'),
    }),
    execute: async ({ moral }): Promise<ToolResult> => {
      state.brief.moral = moral;
      return { success: true, message: `Moral set to "${moral}"`, updatedFields: ['moral'] };
    },
  }),

  setStylePreset: tool({
    description: 'Set the visual style preset for the book',
    inputSchema: z.object({
      stylePreset: z.string().min(1).describe('Name of the style preset to use'),
    }),
    execute: async ({ stylePreset }): Promise<ToolResult> => {
      state.brief.stylePreset = stylePreset;
      return { success: true, message: `Style preset set to "${stylePreset}"`, updatedFields: ['stylePreset'] };
    },
  }),

  addInterest: tool({
    description: 'Add a topic or interest the child enjoys',
    inputSchema: z.object({
      interest: z.string().min(1).describe('A topic or interest to incorporate'),
    }),
    execute: async ({ interest }): Promise<ToolResult> => {
      if (!state.brief.interests) {
        state.brief.interests = [];
      }
      if (!state.brief.interests.includes(interest)) {
        state.brief.interests.push(interest);
      }
      return { success: true, message: `Added interest: "${interest}"`, updatedFields: ['interests'] };
    },
  }),

  setCustomInstructions: tool({
    description: 'Set special requests or notes from the user',
    inputSchema: z.object({
      customInstructions: z.string().min(1).describe('Special requests or notes'),
    }),
    execute: async ({ customInstructions }): Promise<ToolResult> => {
      state.brief.customInstructions = customInstructions;
      return { success: true, message: 'Custom instructions saved', updatedFields: ['customInstructions'] };
    },
  }),

  // ============================================================================
  // Character Tools
  // ============================================================================

  addCharacter: tool({
    description: 'Add a new character to the story',
    inputSchema: z.object({
      name: z.string().min(1).describe('Character name'),
      description: z.string().min(1).describe('Brief physical and personality description'),
      role: z.string().optional().describe('Role in the story (e.g., "protagonist", "sidekick")'),
      traits: z.array(z.string()).optional().describe('Personality traits'),
    }),
    execute: async ({ name, description, role, traits }): Promise<ToolResult> => {
      if (!state.brief.characters) {
        state.brief.characters = [];
      }
      // Check for duplicate by name
      const existingIndex = state.brief.characters.findIndex(
        c => c.name.toLowerCase() === name.toLowerCase()
      );
      const character: StoryCharacter = {
        name,
        description,
        role,
        traits: traits ?? [],
        notes: [],
      };
      if (existingIndex >= 0) {
        // Update existing character
        state.brief.characters[existingIndex] = character;
        return { success: true, message: `Updated character: ${name}`, updatedFields: ['characters'] };
      } else {
        // Add new character
        state.brief.characters.push(character);
        return { success: true, message: `Added character: ${name}`, updatedFields: ['characters'] };
      }
    },
  }),

  updateCharacter: tool({
    description: 'Update an existing character',
    inputSchema: z.object({
      name: z.string().min(1).describe('Name of the character to update'),
      updates: z.object({
        description: z.string().optional(),
        role: z.string().optional(),
        traits: z.array(z.string()).optional(),
      }).describe('Fields to update'),
    }),
    execute: async ({ name, updates }): Promise<ToolResult> => {
      if (!state.brief.characters) {
        return { success: false, message: `Character "${name}" not found` };
      }
      const index = state.brief.characters.findIndex(
        c => c.name.toLowerCase() === name.toLowerCase()
      );
      if (index < 0) {
        return { success: false, message: `Character "${name}" not found` };
      }
      const existing = state.brief.characters[index];
      if (!existing) {
        return { success: false, message: `Character "${name}" not found` };
      }
      // Only apply defined values from updates
      if (updates.description !== undefined) existing.description = updates.description;
      if (updates.role !== undefined) existing.role = updates.role;
      if (updates.traits !== undefined) existing.traits = updates.traits;
      return { success: true, message: `Updated character: ${name}`, updatedFields: ['characters'] };
    },
  }),

  // ============================================================================
  // Plot Tools
  // ============================================================================

  setStoryArcSummary: tool({
    description: 'Set the story arc summary for the plot',
    inputSchema: z.object({
      storyArcSummary: z.string().min(1).describe('1-2 sentence story arc summary'),
    }),
    execute: async ({ storyArcSummary }): Promise<ToolResult> => {
      state.plot.storyArcSummary = storyArcSummary;
      return { success: true, message: 'Story arc summary set', updatedFields: ['storyArcSummary'] };
    },
  }),

  addPlotBeat: tool({
    description: 'Add a plot beat to the story structure',
    inputSchema: z.object({
      purpose: z.enum(['setup', 'build', 'conflict', 'twist', 'climax', 'payoff', 'button'])
        .describe('Narrative function of this beat'),
      description: z.string().min(1).describe('One sentence summary of what happens'),
    }),
    execute: async ({ purpose, description }): Promise<ToolResult> => {
      if (!state.plot.plotBeats) {
        state.plot.plotBeats = [];
      }
      const beat: PlotBeat = { purpose, description };
      state.plot.plotBeats.push(beat);
      return {
        success: true,
        message: `Added ${purpose} beat: "${description}"`,
        updatedFields: ['plotBeats'],
      };
    },
  }),

  updatePlotBeat: tool({
    description: 'Update an existing plot beat',
    inputSchema: z.object({
      index: z.number().int().min(0).describe('Index of the beat to update (0-based)'),
      purpose: z.enum(['setup', 'build', 'conflict', 'twist', 'climax', 'payoff', 'button']).optional(),
      description: z.string().optional(),
    }),
    execute: async ({ index, purpose, description }): Promise<ToolResult> => {
      const beats = state.plot.plotBeats;
      if (!beats || index >= beats.length) {
        return { success: false, message: `Plot beat at index ${index} not found` };
      }
      const beat = beats[index];
      if (!beat) {
        return { success: false, message: `Plot beat at index ${index} not found` };
      }
      if (purpose) beat.purpose = purpose;
      if (description) beat.description = description;
      return { success: true, message: `Updated plot beat at index ${index}`, updatedFields: ['plotBeats'] };
    },
  }),

  setAllowCreativeLiberty: tool({
    description: 'Set whether the author can embellish beyond the plot beats',
    inputSchema: z.object({
      allowCreativeLiberty: z.boolean().describe('Whether creative liberty is allowed'),
    }),
    execute: async ({ allowCreativeLiberty }): Promise<ToolResult> => {
      state.plot.allowCreativeLiberty = allowCreativeLiberty;
      return {
        success: true,
        message: `Creative liberty ${allowCreativeLiberty ? 'enabled' : 'disabled'}`,
        updatedFields: ['allowCreativeLiberty'],
      };
    },
  }),

  // ============================================================================
  // Conversation Tools
  // ============================================================================

  promptUser: tool({
    description: 'Present a question to the user with suggested options',
    inputSchema: z.object({
      question: z.string().min(1).describe('The question to ask the user'),
      options: z.array(z.string().min(1)).min(2).max(8)
        .describe('2-8 specific options for the user to choose from. Never include generic options like "Other" or "None"'),
    }),
    execute: async ({ question, options }): Promise<ToolResult> => {
      // This tool's output is intercepted by the pipeline to show UI
      // The result here is just for the model's context
      return {
        success: true,
        message: `Asked: "${question}" with ${options.length} options`,
      };
    },
  }),

  finishIntake: tool({
    description: 'Signal that intake is complete. Only call when all required fields are filled.',
    inputSchema: z.object({
      summary: z.string().optional().describe('Brief summary of what was collected'),
    }),
    execute: async ({ summary }): Promise<ToolResult> => {
      state.isComplete = true;
      return {
        success: true,
        message: summary ?? 'Intake complete',
      };
    },
  }),
});

/**
 * Type for the tools object returned by createIntakeTools
 */
export type IntakeTools = ReturnType<typeof createIntakeTools>;
