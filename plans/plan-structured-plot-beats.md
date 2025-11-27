# Structured Plot Beats Plan

## Problem

Currently, the blurb generator creates 8-12 granular plot beats (one per page), and the blurb conversation summarizes them rather than displaying them for editing. Users want to:

1. See a brief story arc summary
2. See 5-6 structural beats they can modify by number
3. Have beats labeled by narrative purpose (setup, conflict, etc.)

## Solution

Add structure to plot beats with purpose labels and limit to 5-6 key story moments. The author agent will expand these into individual pages.

## Changes Required

### 1. Schema Changes (`src/core/schemas/index.ts`)

**Add new PlotBeat schema:**
```typescript
export const PlotBeatPurposeSchema = z.enum([
  'setup',
  'conflict',
  'rising_action',
  'climax',
  'resolution'
]);

export const PlotBeatSchema = z.object({
  purpose: PlotBeatPurposeSchema.describe('Narrative function of this beat'),
  description: z.string().min(1).describe('What happens in this beat'),
});
```

**Update StoryBlurbSchema:**
```typescript
export const StoryBlurbSchema = z.object({
  brief: StoryBriefSchema,
  storyArcSummary: z.string().min(1).describe('1-2 sentence story arc summary'),
  plotBeats: z.array(PlotBeatSchema).min(4).max(6).describe('Key story structure beats'),
  allowCreativeLiberty: z.boolean().default(true).describe('Whether the author can embellish beyond the beats'),
});
```

### 2. Blurb Generator (`src/core/agents/blurb-generator.ts`)

Update prompt to generate structured beats:
```typescript
const SYSTEM_PROMPT = `Generate a story arc summary and 5-6 structural plot beats.

Story arc summary: 1-2 sentences capturing the core journey and theme.

Plot beats (5-6 beats, one per story structure element):
- setup: Introduce character, world, and status quo
- conflict: The problem, challenge, or inciting incident
- rising_action: Attempts, obstacles, and escalation (can have 1-2 of these)
- climax: The turning point or biggest moment
- resolution: How it ends, what's learned

Keep descriptions concrete and visual. The author will expand each beat into multiple pages.`;
```

### 3. Blurb Conversation (`src/core/agents/blurb-conversation.ts`)

Update prompt to display beats clearly:
```typescript
const SYSTEM_PROMPT = `Display the story arc and plot beats, then ask which to change.

Format:
"[story arc summary]"

1. [Setup] description
2. [Conflict] description
3. [Rising Action] description
4. [Climax] description
5. [Resolution] description

Which beat would you like to change?

Chips should reference specific beats (e.g., "Strengthen beat 3", "Add tension to climax") or offer approval.`;
```

### 4. Blurb Interpreter (`src/core/agents/blurb-interpreter.ts`)

Update to handle structured beat modifications:
- User says "change beat 3 to X" → update that beat's description
- User says "make the climax more dramatic" → find climax beat and modify

### 5. Author Agent (`src/core/agents/author.ts`)

Update prompt to expand structural beats into pages:
```typescript
// Add guidance that each beat may become 2-4 pages
// The author decides pacing based on pageCount and beat importance
```

### 6. Update Tests

- `src/core/schemas/index.test.ts` - Add tests for PlotBeatSchema
- Verify StoryBlurbSchema accepts new structure
- Test validation (min 4, max 6 beats)

### 7. Update Type Diagram

- `docs/type-diagram.md` - Add PlotBeat type and relationships

## Migration Notes

This is a breaking change to StoryBlurb structure:
- Old: `plotBeats: string[]`
- New: `plotBeats: PlotBeat[]` with `storyArcSummary: string`

Any saved StoryBlurb data would need migration, but since this is pre-production, we can make the breaking change directly.

## Implementation Order

1. Schema changes (PlotBeat, StoryBlurb)
2. Schema tests
3. Blurb generator prompt
4. Blurb conversation prompt
5. Blurb interpreter prompt
6. Author agent prompt (expand beats to pages)
7. Update type diagram
8. Manual testing of full flow

## Example Output

**Before (current):**
```
What a wonderful adventure! 🌟 Your story has a beautiful emotional arc...
[prose summary, no visible beats]
```

**After (proposed):**
```
"Atlas must find the lost Starlight King and discovers that true adventure is found in friendship."

1. [Setup] Atlas lives in the observatory with his dad, dreaming of space adventures
2. [Conflict] The Starlight King vanishes, leaving the night sky dark and cold
3. [Rising Action] Atlas journeys through crystal caves, meeting Bolt the robot and Fern the alien child
4. [Climax] Atlas finds the King hiding, ashamed that he felt lonely despite ruling the stars
5. [Resolution] Atlas shows the King that everyone needs connection; they return together to light up the sky

Which beat would you like to change?

[Strengthen the climax] [Add another rising action beat] [Looks good, approve!]
```
