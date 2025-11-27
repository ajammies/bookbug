/**
 * Approval Detection Utilities
 *
 * Centralized approval phrase detection used by both CLI and agents.
 * Keeping these in sync prevents drift between what the LLM suggests
 * as approval options and what the CLI recognizes as approval.
 */

/**
 * Phrases that indicate user approval of the current state
 */
export const APPROVAL_PHRASES = [
  'looks great',
  'looks good',
  "let's write",
  "let's go",
  'approved',
  'perfect',
] as const;

/**
 * The standard approval chip text that agents should include
 */
export const APPROVAL_CHIP = "Looks great, let's write it!";

/**
 * Check if user input indicates approval
 */
export const isApprovalResponse = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return APPROVAL_PHRASES.some(phrase => normalized.includes(phrase));
};
