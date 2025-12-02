# Plan: Character Visual Traits

## Goal
Extend `StoryCharacter` with structured `personalityTraits` and `visualTraits` arrays for better character consistency across the pipeline.

## Approach
No new schemas or agents - just extend the existing `StoryCharacter` in `common.ts`. The LLM decides what traits matter per character.

## Schema Change

### Update: `src/core/schemas/common.ts`

**Current StoryCharacter:**
```typescript
const StoryCharacterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  role: z.string().optional(),
  traits: z.array(z.string()).default([]),           // ← generic traits
  notes: z.array(z.string()).default([]),
  visualDescription: z.string().optional(),          // ← free text
});
```

**New StoryCharacter:**
```typescript
const CharacterTraitSchema = z.object({
  key: z.string().describe('Trait category: eyes, fur, clothing, voice, etc.'),
  value: z.string().describe('Trait description'),
});

const StoryCharacterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).describe('Brief character summary'),
  role: z.string().optional().describe('Role in story: protagonist, sidekick, mentor'),
  species: z.string().optional().describe('human, dog, alien blob, talking teapot'),

  // Split traits into personality vs visual
  personalityTraits: z.array(CharacterTraitSchema).default([])
    .describe('Personality/behavioral traits: curious, brave, grumpy'),
  visualTraits: z.array(CharacterTraitSchema).default([])
    .describe('Visual appearance traits: eyes, fur, clothing, accessories'),

  notes: z.array(z.string()).default([]).describe('Additional notes'),
});
```

**Examples:**

Human child:
```json
{
  "name": "Maya",
  "description": "A curious 10-year-old who discovers she has superpowers",
  "role": "protagonist",
  "species": "human",
  "personalityTraits": [
    { "key": "core", "value": "curious and adventurous" },
    { "key": "flaw", "value": "impulsive, acts before thinking" }
  ],
  "visualTraits": [
    { "key": "eyes", "value": "big brown eyes" },
    { "key": "hair", "value": "black hair with white streak, ponytail" },
    { "key": "skin", "value": "warm brown" },
    { "key": "height", "value": "short, 10-year-old proportions" },
    { "key": "clothing", "value": "blue hoodie, jeans, sneakers" }
  ]
}
```

Golden retriever:
```json
{
  "name": "Biscuit",
  "description": "A loyal golden retriever who helps Maya",
  "role": "sidekick",
  "species": "golden retriever",
  "personalityTraits": [
    { "key": "core", "value": "loyal and enthusiastic" },
    { "key": "quirk", "value": "gets distracted by squirrels" }
  ],
  "visualTraits": [
    { "key": "fur", "value": "golden cream, fluffy" },
    { "key": "eyes", "value": "warm brown, friendly" },
    { "key": "ears", "value": "large floppy ears" },
    { "key": "tail", "value": "long, always wagging" },
    { "key": "collar", "value": "red collar with bone tag" }
  ]
}
```

Alien slime:
```json
{
  "name": "Gloop",
  "description": "A friendly alien slime creature",
  "species": "amorphous slime",
  "personalityTraits": [
    { "key": "core", "value": "cheerful and curious about Earth" }
  ],
  "visualTraits": [
    { "key": "body", "value": "translucent green gel, blob-shaped" },
    { "key": "eyes", "value": "two floating yellow dots inside body" },
    { "key": "texture", "value": "slightly sparkly, jiggles when moving" }
  ]
}
```

## Migration
- Remove `traits` (replaced by `personalityTraits`)
- Remove `visualDescription` (replaced by `visualTraits`)
- Add `species` field

## Agent Updates

### `characterDesignAgent`
- Use `visualTraits` array to build sprite prompt
- Include `species` in prompt for appropriate anatomy

### `pageVisualsAgent`
- Reference `visualTraits` when describing characters in beats

### `imageQualityAgent`
- Validate rendered images against `visualTraits`

## Pipeline Flow (unchanged)
No new pipeline steps - traits are populated during existing intake/plot stages.

## Commits

### 1. Add CharacterTrait schema and update StoryCharacter
- Update `src/core/schemas/common.ts`
- Add tests for new schema

### 2. Update characterDesignAgent for visualTraits
- Update `src/core/agents/character-design.ts`
- Build sprite prompt from visualTraits array

### 3. Update pageVisualsAgent for visualTraits
- Update `src/core/agents/visuals.ts`

### 4. Update imageQualityAgent for visualTraits
- Update `src/core/agents/image-quality.ts`

## Files to Change

| File | Change |
|------|--------|
| `src/core/schemas/common.ts` | Add CharacterTrait, update StoryCharacter |
| `src/core/agents/character-design.ts` | Use visualTraits for sprite prompt |
| `src/core/agents/visuals.ts` | Reference visualTraits in page beats |
| `src/core/agents/image-quality.ts` | Validate against visualTraits |

## Follow-up Issues
- Multi-form support (superhero transformation, costume changes) - separate issue
- Character-to-character visual consistency (siblings)
