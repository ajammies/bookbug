/**
 * Field Policies for Intake Agent
 *
 * Defines how the intake agent should handle each field during conversation.
 * These policies guide the agent on when to prompt, suggest, or skip fields.
 */

/**
 * Policy for how a field should be handled during intake
 */
export type FieldPolicy =
  | 'required'            // User must provide, agent should ask
  | 'required-suggested'  // User must provide, agent can suggest options
  | 'optional-prompted'   // Optional but agent should mention/offer
  | 'optional';           // Optional, don't actively prompt

/**
 * Field policies for StoryBrief intake
 *
 * Required fields must be filled before intake can complete.
 * Suggested fields get AI-generated options presented to user.
 * Prompted fields are mentioned but not blocking.
 */
export const briefFieldPolicies: Record<string, FieldPolicy> = {
  title: 'required-suggested',
  storyArc: 'required-suggested',
  setting: 'required-suggested',
  ageRange: 'optional-prompted',
  pageCount: 'optional',
  characters: 'required-suggested',
  tone: 'optional',
  moral: 'optional',
  interests: 'optional',
  customInstructions: 'optional',
  stylePreset: 'optional-prompted',
};

/**
 * Field policies for PlotStructure refinement
 *
 * Plot stage refines the generated plot based on user feedback.
 * Most fields are pre-filled from plot generation, user can adjust.
 */
export const plotFieldPolicies: Record<string, FieldPolicy> = {
  storyArcSummary: 'required-suggested',
  plotBeats: 'required-suggested',
  allowCreativeLiberty: 'optional',
  characters: 'optional',
};

/**
 * Get required fields for a given policy map
 */
export const getRequiredFields = (policies: Record<string, FieldPolicy>): string[] =>
  Object.entries(policies)
    .filter(([_, policy]) => policy === 'required' || policy === 'required-suggested')
    .map(([field]) => field);

/**
 * Get suggested fields (AI can propose values)
 */
export const getSuggestedFields = (policies: Record<string, FieldPolicy>): string[] =>
  Object.entries(policies)
    .filter(([_, policy]) => policy === 'required-suggested')
    .map(([field]) => field);

/**
 * Get prompted fields (optional but mentioned)
 */
export const getPromptedFields = (policies: Record<string, FieldPolicy>): string[] =>
  Object.entries(policies)
    .filter(([_, policy]) => policy === 'optional-prompted')
    .map(([field]) => field);

/**
 * Check if all required fields are present in an object
 */
export const hasRequiredFields = <T extends Record<string, unknown>>(
  obj: Partial<T>,
  policies: Record<string, FieldPolicy>
): boolean => {
  const required = getRequiredFields(policies);
  return required.every(field => {
    const value = obj[field];
    if (value === undefined || value === null) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });
};

/**
 * Get missing required fields from an object
 */
export const getMissingRequiredFields = <T extends Record<string, unknown>>(
  obj: Partial<T>,
  policies: Record<string, FieldPolicy>
): string[] => {
  const required = getRequiredFields(policies);
  return required.filter(field => {
    const value = obj[field];
    if (value === undefined || value === null) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  });
};
