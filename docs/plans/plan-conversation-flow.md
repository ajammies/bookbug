# Plan: Conversation Flow Improvements

**Issues:** #38 (editor mindset), #37 (approval detection), #39 (blurb phase)
**Branch:** `feat/conversation-flow`

## Summary

Streamlined approach: delete redundant approval detection, enhance prompts for editor mindset, add light-touch blurb confirmation using existing types.

## Phase 1: Fix Approval Detection (#37)

**Problem:** Two independent approval mechanisms contradict each other. `detectApproval(userInput)` sees only raw text and misreads "I like the suggestions" as approval.

**Solution:** Delete `detectApproval` entirely. Trust `plotConversationAgent.isApproved` which already has full conversation context.

## Phase 2: Editor Mindset & Better Chips (#38)

**Problem:** Plot conversation feels mechanical - just lists beats and asks "which to change?" with generic chips.

**Solution:** Rewrite `plotConversationAgent` system prompt for editor persona, analysis, and specific chips.

## Phase 3: Light-Touch Blurb Phase (#39)

**Problem:** No step to capture emotional/stylistic essence before structural plot beats.

**Solution:** Add a confirmation step in `plot-intake.ts` after initial plot generation. Uses existing `storyArcSummary` - no new types/files.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/core/agents/approval-detector.ts` | DELETE | Remove redundant detector |
| `src/core/agents/index.ts` | MODIFY | Remove detectApproval export |
| `src/cli/prompts/plot-intake.ts` | MODIFY | Remove detectApproval, add blurb confirmation |
| `src/core/agents/plot-conversation.ts` | MODIFY | Editor mindset prompt |
| `src/core/agents/plot.ts` | MODIFY | Richer storyArcSummary prompt |
| `src/core/schemas/plot.ts` | MODIFY | Better chips .describe() |

## Acceptance Criteria

- [ ] "I like the suggestions" incorporates them, does NOT approve
- [ ] Each response shows current story arc summary
- [ ] Editor provides observation about what's working/needs work
- [ ] Chips are grounded in storytelling principles, specific to story
- [ ] Blurb/essence confirmation step before beat iteration
- [ ] Can adjust tone at blurb step
- [ ] Tests pass, types check
