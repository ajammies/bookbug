/**
 * Draft Agent: Unified conversation + extraction for story creation
 *
 * Single agent that progressively fills the StoryDraft schema.
 * No mode switching - one conversation flow from start to finish.
 *
 * Following Carmack: "The real enemy is unexpected dependency and mutation of state"
 */
import { generateText, stepCountIs } from 'ai';
import { getModel } from '../config';
import {
  StoryDraftSchema,
  getMissingRequiredFields,
  getFieldPolicies,
  type StoryDraft,
  type FieldPolicy,
} from '../schemas/draft';
import { createDraftTools, type DraftState } from '../schemas/draft-tools';
import type { Logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface DraftAgentOptions {
  /** Available style presets */
  availableStyles?: string[];
  /** Logger for debugging */
  logger?: Logger;
}

export interface DraftAgentResult {
  /** Updated draft state */
  draft: Partial<StoryDraft>;
  /** Question to show user (from promptUser tool) */
  question?: string;
  /** Options for user to choose from */
  options?: string[];
  /** Whether draft is complete */
  isComplete: boolean;
}

export type DraftMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// ============================================================================
// System Prompt
// ============================================================================

const buildSystemPrompt = (
  availableStyles: string[],
  missingFields: string[],
  policies: Record<string, FieldPolicy>
): string => {
  const hasPresets = availableStyles.length > 0;
  const styleHint = hasPresets
    ? `Available style presets: ${availableStyles.map(s => `"${s}"`).join(', ')}.`
    : '';

  const requiredFields = Object.entries(policies)
    .filter(([_, p]) => p === 'required')
    .map(([f]) => f);

  const promptedFields = Object.entries(policies)
    .filter(([_, p]) => p === 'prompted')
    .map(([f]) => f);

  return `You are helping create a children's picture book. Guide the user through providing story details.

${styleHint}

REQUIRED FIELDS (must fill before finishing):
${missingFields.length > 0 ? missingFields.map(f => `- ${f}`).join('\n') : '- All required fields filled!'}

FIELD GUIDE:
- Required: ${requiredFields.join(', ')}
- Optional but mention: ${promptedFields.join(', ')}

WORKFLOW:
1. Use promptUser() to ask ONE question at a time with 3-5 creative options
2. Use set*() or add*() tools to record user's answers
3. For plot beats: suggest a complete story arc (setup → conflict → climax → resolution)
4. Call finishIntake() when all required fields are filled

RULES:
- Always use tools to record information
- Characters need both name AND description
- Plot needs at least 3 beats covering the story arc
- Be creative with suggestions - make them specific to the emerging story`;
};

// ============================================================================
// Tool Result Extraction
// ============================================================================

interface PromptUserCall {
  question: string;
  options: string[];
}

const extractPromptUserCall = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  steps: Array<{ toolCalls: any[] }>
): PromptUserCall | null => {
  for (const step of steps) {
    for (const call of step.toolCalls) {
      if (call.toolName === 'promptUser') {
        const input = call.input as { question: string; options: string[] };
        return { question: input.question, options: input.options };
      }
    }
  }
  return null;
};

const wasFinishIntakeCalled = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  steps: Array<{ toolCalls: any[] }>
): boolean => {
  for (const step of steps) {
    for (const call of step.toolCalls) {
      if (call.toolName === 'finishIntake') {
        return true;
      }
    }
  }
  return false;
};

// ============================================================================
// Draft Agent
// ============================================================================

/**
 * Run one turn of the draft agent.
 *
 * @param state - Current draft state
 * @param history - Conversation history
 * @param options - Agent options
 * @returns Updated state and next UI action
 */
export const draftAgent = async (
  state: DraftState,
  history: DraftMessage[],
  options: DraftAgentOptions = {}
): Promise<DraftAgentResult> => {
  const { availableStyles = [], logger } = options;
  const policies = getFieldPolicies(StoryDraftSchema);
  const missingFields = getMissingRequiredFields(state.draft);

  logger?.debug(
    { agent: 'draftAgent', missingFields, historyLength: history.length },
    'Running draft agent turn'
  );

  const systemPrompt = buildSystemPrompt(availableStyles, missingFields, policies);

  const stateContext = `CURRENT STORY DRAFT:
${JSON.stringify(state.draft, null, 2)}`;

  const tools = createDraftTools(state);

  const result = await generateText({
    model: getModel(),
    system: systemPrompt,
    messages: [
      { role: 'user', content: stateContext },
      ...history,
    ],
    tools,
    stopWhen: stepCountIs(10),
  });

  logger?.debug(
    { agent: 'draftAgent', stepCount: result.steps.length, toolCalls: result.steps.flatMap(s => s.toolCalls.map(t => t.toolName)) },
    'Draft agent turn complete'
  );

  const promptCall = extractPromptUserCall(result.steps);
  const isComplete = wasFinishIntakeCalled(result.steps) || state.isComplete;

  logger?.info(
    {
      agent: 'draftAgent',
      isComplete,
      hasPrompt: !!promptCall,
      question: promptCall?.question?.substring(0, 60),
    },
    'Draft turn result'
  );

  return {
    draft: state.draft,
    question: promptCall?.question,
    options: promptCall?.options,
    isComplete,
  };
};
