/**
 * Intake Agent: Unified conversation + extraction using tool calling
 *
 * Single agent that handles both conversation and field extraction.
 * Uses tools to update state incrementally, avoiding manual object merging.
 * Supports both brief intake and plot refinement stages.
 */
import { generateText, stepCountIs } from 'ai';
import { getModel } from '../config';
import {
  type StoryBrief,
  type PlotStructure,
  briefFieldPolicies,
  plotFieldPolicies,
  getMissingRequiredFields,
  type FieldPolicy,
} from '../schemas';
import { createIntakeTools, type IntakeState, type IntakeTools } from './intake-tools';
import type { Logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export type IntakeMode = 'brief' | 'plot';

export interface IntakeAgentOptions {
  /** Mode determines which field policies to use */
  mode: IntakeMode;
  /** Available style presets for brief mode */
  availableStyles?: string[];
  /** Logger for debugging */
  logger?: Logger;
}

export interface IntakeAgentResult {
  /** Updated brief state */
  brief: Partial<StoryBrief>;
  /** Updated plot state */
  plot: Partial<PlotStructure>;
  /** Question to show user (from promptUser tool) */
  question?: string;
  /** Options for user to choose from */
  options?: string[];
  /** Whether intake is complete */
  isComplete: boolean;
}

export type IntakeMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// ============================================================================
// Prompt Building
// ============================================================================

const buildBriefSystemPrompt = (
  availableStyles: string[],
  missingFields: string[],
  policies: Record<string, FieldPolicy>
): string => {
  const hasPresets = availableStyles.length > 0;
  const styleHint = hasPresets
    ? `Available style presets: ${availableStyles.map(s => `"${s}"`).join(', ')}. Ask about style first if not set.`
    : '';

  const suggestedFields = Object.entries(policies)
    .filter(([_, p]) => p === 'required-suggested')
    .map(([f]) => f);

  return `You are helping create a children's book. Guide the user through providing story details.

${styleHint}

REQUIRED FIELDS (must be filled before completion):
${missingFields.length > 0 ? missingFields.map(f => `- ${f}`).join('\n') : '- All required fields are filled!'}

FIELD POLICIES:
- required-suggested: ${suggestedFields.join(', ')} - Ask and suggest options
- optional-prompted: ageRange, stylePreset - Mention but don't require

WORKFLOW:
1. Use promptUser() to ask ONE question at a time with 3-5 specific options
2. When user responds, use set*() or add*() tools to record their answer
3. Ask about required fields first, then optional ones
4. Call finishIntake() when all required fields are filled

IMPORTANT:
- Always use tools to record information - never just acknowledge
- Each promptUser() call should have specific, creative options
- Characters need name AND description
- Call finishIntake() only after all required fields are set`;
};

const buildPlotSystemPrompt = (
  missingFields: string[],
  policies: Record<string, FieldPolicy>
): string => {
  return `You are refining the plot structure for a children's book.

The plot has been generated. Help the user review and adjust it.

CURRENT MISSING FIELDS:
${missingFields.length > 0 ? missingFields.map(f => `- ${f}`).join('\n') : '- Plot structure is complete!'}

WORKFLOW:
1. Show the current plot and ask if they want changes
2. Use updatePlotBeat() to modify specific beats
3. Use addPlotBeat() if they want more story events
4. Call finishIntake() when they approve the plot

Use promptUser() to present options for adjustments.`;
};

const buildStateContext = (
  state: IntakeState,
  mode: IntakeMode
): string => {
  if (mode === 'brief') {
    return `CURRENT STORY BRIEF:
${JSON.stringify(state.brief, null, 2)}`;
  } else {
    return `CURRENT PLOT STRUCTURE:
${JSON.stringify(state.plot, null, 2)}`;
  }
};

// ============================================================================
// Tool Result Extraction
// ============================================================================

interface PromptUserCall {
  question: string;
  options: string[];
}

/**
 * Extract promptUser call from tool results if present
 */
const extractPromptUserCall = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  steps: Array<{ toolCalls: any[] }>
): PromptUserCall | null => {
  for (const step of steps) {
    for (const call of step.toolCalls) {
      if (call.toolName === 'promptUser') {
        // AI SDK 6 uses 'input' for tool arguments
        const input = call.input as { question: string; options: string[] };
        return { question: input.question, options: input.options };
      }
    }
  }
  return null;
};

/**
 * Check if finishIntake was called
 */
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
// Intake Agent
// ============================================================================

/**
 * Run one turn of the intake agent.
 *
 * The agent processes the current state and history, uses tools to update state,
 * and returns either:
 * - A question/options for the user (via promptUser tool)
 * - Completion signal (via finishIntake tool)
 *
 * @param state - Current intake state (brief + plot)
 * @param history - Conversation history
 * @param options - Agent options including mode and available styles
 * @returns Updated state and next UI action
 */
export const intakeAgent = async (
  state: IntakeState,
  history: IntakeMessage[],
  options: IntakeAgentOptions
): Promise<IntakeAgentResult> => {
  const { mode, availableStyles = [], logger } = options;
  const policies = mode === 'brief' ? briefFieldPolicies : plotFieldPolicies;
  const stateObj = mode === 'brief' ? state.brief : state.plot;
  const missingFields = getMissingRequiredFields(stateObj, policies);

  logger?.debug(
    { agent: 'intakeAgent', mode, missingFields, historyLength: history.length },
    'Running intake agent turn'
  );

  // Build system prompt based on mode
  const systemPrompt = mode === 'brief'
    ? buildBriefSystemPrompt(availableStyles, missingFields, policies)
    : buildPlotSystemPrompt(missingFields, policies);

  // Build context message with current state
  const stateContext = buildStateContext(state, mode);

  // Create tools bound to state
  const tools = createIntakeTools(state);

  // Run single turn with tools
  const result = await generateText({
    model: getModel(),
    system: systemPrompt,
    messages: [
      { role: 'user', content: stateContext },
      ...history,
    ],
    tools,
    stopWhen: stepCountIs(10), // Allow multiple tool calls in one turn
  });

  logger?.debug(
    { agent: 'intakeAgent', stepCount: result.steps.length, toolCalls: result.steps.flatMap(s => s.toolCalls.map(t => t.toolName)) },
    'Intake agent turn complete'
  );

  // Extract promptUser call if present
  const promptCall = extractPromptUserCall(result.steps);
  const isComplete = wasFinishIntakeCalled(result.steps) || state.isComplete;

  logger?.info(
    {
      agent: 'intakeAgent',
      mode,
      isComplete,
      hasPrompt: !!promptCall,
      question: promptCall?.question?.substring(0, 60),
    },
    'Intake turn result'
  );

  return {
    brief: state.brief,
    plot: state.plot,
    question: promptCall?.question,
    options: promptCall?.options,
    isComplete,
  };
};
