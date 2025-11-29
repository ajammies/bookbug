# Plan: Complete Character Design Image Integration

## Goal

1. Pass character sprite sheet URLs to Nano Banana Pro as `image_input` for visual consistency
2. Download and save sprite sheets to disk so they persist after Replicate URLs expire

## Current State (on `feat/character-sprite-sheets` branch)

Already implemented:
- `CharacterDesign` schema with `spriteSheetUrl` field
- `characterDesignAgent` generates sprite sheets via Replicate
- `filterStoryForPage` includes `characterDesigns` in render context
- `PageRenderContext` schema has `characterDesigns` array

Missing:
- `generatePageImage` does NOT pass sprite URLs as `image_input`
- Sprite sheets are NOT downloaded/saved to disk

## Files to Change

1. `src/core/services/image-generation.ts` - Pass `image_input` to Replicate API
2. `src/cli/utils/output.ts` - Add method to save character design images
3. `src/core/pipeline.ts` - Download sprite sheets after generation

## Implementation

### 1. Pass image_input to Replicate (image-generation.ts)

```typescript
const extractReferenceImages = (context: PageRenderContext): string[] =>
  (context.characterDesigns ?? [])
    .map(design => design.spriteSheetUrl)
    .filter(Boolean);

// In generatePageImage:
const input: Record<string, unknown> = {
  prompt: buildPrompt(context),
  aspect_ratio: getAspectRatio(format),
  // ...
};

if (referenceImages.length > 0) {
  input.image_input = referenceImages;
}
```

### 2. Save sprite sheets to disk (output.ts)

Add method to `StoryOutputManager`:
```typescript
async saveCharacterDesign(design: CharacterDesign): Promise<string> {
  const filename = `character-${slugify(design.character.name)}.png`;
  const localPath = path.join(this.folder, 'assets', 'characters', filename);
  await downloadFile(design.spriteSheetUrl, localPath);
  return `assets/characters/${filename}`;
}
```

### 3. Download after generation (pipeline.ts)

In `executeIncrementalPipeline`, after generating character designs:
```typescript
// Download and save sprite sheets
for (const design of characterDesigns) {
  const localPath = await outputManager.saveCharacterDesign(design);
  design.spriteSheetUrl = localPath; // Update to local path
}
```

## Test Strategy

- Run typecheck
- Run existing tests
- Manual test: verify sprite sheets saved to `assets/characters/`
- Manual test: verify `image_input` appears in Replicate request
