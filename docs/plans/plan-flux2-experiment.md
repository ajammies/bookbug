# Flux 2 Dev Image Generation Experiment

**Issue**: #88
**Branch**: `feat/flux-kontext-experiment`
**Date**: 2025-12-04

## Goal

Add Flux 2 Dev as an alternative image provider to compare against Nano Banana Pro for character/style consistency.

## Why Flux 2 Dev

| Model | Cost/Image | 12 Pages | Reference Images |
|-------|------------|----------|------------------|
| Nano Banana Pro (2K) | $0.15 | $1.80 | Multiple (array) |
| Flux Kontext Max | $0.08 | $0.96 | 2 only |
| **Flux 2 Dev** | ~$0.01 | **~$0.12** | **4** (Replicate) |

- **15x cheaper** than current setup
- **4 reference images** - enough for hero page + character sprite sheets
- **Better text rendering** (Mistral VLM encoder)
- **Better anatomy** (hands, faces)

## API Details (from Replicate)

**Model**: `black-forest-labs/flux-2-dev`

**Input Parameters**:
```typescript
const input = {
  prompt: string,                    // Required
  input_images: string[],            // Up to 4 URLs (jpeg/png/gif/webp)
  aspect_ratio: string,              // "1:1", "16:9", "4:3", etc.
  width?: number,                    // 256-1440, multiples of 32
  height?: number,
  seed?: number,                     // For reproducibility
  go_fast?: boolean,                 // Default true, slightly lower quality
  output_format: 'webp' | 'jpg' | 'png',
  output_quality?: number,           // 0-100
};
```

**Pricing**:
- `go_fast=true`: $0.012/megapixel
- `go_fast=false`: $0.014/megapixel
- Typical: ~$0.007-0.01/image

## Commits

1. **Add image provider types and interface**
   - `src/core/services/image-providers/types.ts`

2. **Extract Nano Banana to provider module**
   - `src/core/services/image-providers/nano-banana.ts`

3. **Add Flux 2 Dev provider**
   - `src/core/services/image-providers/flux2-dev.ts`

4. **Add provider factory and exports**
   - `src/core/services/image-providers/index.ts`
   - Update `src/core/services/image-generation.ts`

5. **Add `--provider` flag to render command**
   - `src/cli/commands/render.ts`

## Files

| File | Change |
|------|--------|
| `+` `src/core/services/image-providers/types.ts` | Interface |
| `+` `src/core/services/image-providers/nano-banana.ts` | Extract current |
| `+` `src/core/services/image-providers/flux2-dev.ts` | New provider |
| `+` `src/core/services/image-providers/index.ts` | Exports + factory |
| `~` `src/core/services/image-generation.ts` | Keep shared utils |
| `~` `src/cli/commands/render.ts` | Add --provider flag |

## Provider Interface

```typescript
export type ImageProviderName = 'nano-banana' | 'flux2-dev';

export interface ImageProvider {
  name: ImageProviderName;
  generatePage(
    context: PageRenderContext,
    format: BookFormat,
    options?: ImageProviderOptions
  ): Promise<GeneratedPage>;
}

export interface ImageProviderOptions {
  referenceImages?: string[];
  client?: Replicate;
  logger?: Logger;
}
```

## Test Protocol

1. Generate same story with both providers
2. Run quality agent on outputs
3. Compare:
   - Character consistency
   - Style consistency
   - AI artifacts (hands, faces)
   - Text rendering
   - Cost

## Future

- Add Flux 2 LoRA support when Replicate training available
- Train custom style LoRA for watercolor/chibi lock-in
