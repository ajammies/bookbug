# LoRA-Based Image Generation Research & Plan

**Issue**: #79 (related)
**Status**: Research complete, awaiting user decision
**Date**: 2025-12-04

## Executive Summary

Currently using **Google Nano Banana Pro** via Replicate for image generation. This plan evaluates switching to **Flux + LoRA** for better style consistency, character consistency, and cost optimization.

**Recommendation**: Start with **Flux 1 Kontext** for multi-reference character consistency, then train a custom **style LoRA** if needed. Flux 2 is promising but has compatibility issues with Flux 1 LoRAs.

---

## Part 1: How The Technology Works

### Diffusion Models (Simple Explanation)

```
Noise ──────────────────────────────────────────────> Image
      [Step 1]  [Step 2]  [Step 3] ... [Step N]
         ↓         ↓         ↓            ↓
      Denoise  Denoise  Denoise    Final Image

Text Prompt guides each denoising step
```

**Diffusion models** start with pure noise and progressively denoise it into an image. At each step, the model predicts what noise to remove based on:
1. The current noisy image
2. A text prompt (encoded into vectors)
3. How many steps remain

### Flux Architecture (Flow Matching Transformer)

Flux uses **rectified flow** instead of traditional diffusion:

| Traditional Diffusion | Flux (Rectified Flow) |
|----------------------|----------------------|
| Curved path from noise to image | **Straight line** path |
| Many steps needed (~50) | Fewer steps (~20-35) |
| U-Net architecture | **Transformer** architecture |

**Flux 1**: 12B parameters, CLIP text encoder
**Flux 2**: 32B parameters, Mistral-3 (24B VLM) text encoder - "world knowledge"

### What is LoRA?

**LoRA = Low-Rank Adaptation**

Instead of training all 12-32 billion parameters, LoRA trains **small adapter matrices** (1-6MB) that modify specific layers.

```
Original Model Weights (W)     +    LoRA Weights (BA)    =    Modified Output
      [12B params]                    [~50M params]
       (frozen)                       (trained)
```

**How it works:**
- A large matrix W can be approximated by two smaller matrices: B × A
- B is (d × r), A is (r × d), where r (rank) is small (4-64)
- Only train B and A, leaving W frozen
- At inference: output = W·x + (α/r)·B·A·x

**Result**: 10,000x fewer trainable parameters, 3x less GPU memory

---

## Part 2: Model Comparison for Bookbug

### Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Character Consistency | High | Same character across pages |
| Style Consistency | High | Watercolor/chibi style lock |
| Prompt Adherence | Medium | Following scene descriptions |
| AI Artifacts | High | Hands, faces, anatomy |
| Cost | Medium | Per-image and training costs |
| Speed | Low | Generation time |

### Model Comparison Matrix

| Model | Char Consistency | Style Consistency | Prompt Adherence | AI Artifacts | LoRA Support | Cost/Image |
|-------|-----------------|-------------------|------------------|--------------|--------------|------------|
| **Nano Banana Pro** (current) | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ None | ~$0.03 |
| **Flux 1 Dev** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Excellent | ~$0.03 |
| **Flux 1 Kontext** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Yes | ~$0.04 |
| **Flux 2 Dev** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⚠️ New ecosystem | ~$0.05 |
| **SDXL** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ✅ Mature | ~$0.02 |

### Key Findings

**Flux 1 Kontext** (best for character consistency without training):
- 94% character consistency vs 73% for traditional LoRA
- Multi-reference: up to 4 images for visual consistency
- No fine-tuning required for character reference
- Iterative editing without drift

**Flux 2** (newest, most capable):
- 32B parameters with VLM integration
- Up to 10 reference images
- Native 4MP generation
- **BUT**: LoRAs trained on Flux 1 don't transfer cleanly (facial features skew)
- High VRAM: 62-90GB full precision

**Style LoRAs transfer well** between Flux versions; **Character LoRAs don't**.

---

## Part 3: Using Existing LoRAs vs Training Custom

### Option A: Use Existing Style LoRA

**Best for**: Quickly testing watercolor/chibi styles

| LoRA | Link | Use Case |
|------|------|----------|
| Digital Watercolor Children Book | [Civitai](https://civitai.com/models/512147/digital-watercolor-children-book-style) | Children's book watercolor |
| Chibi (Flux) | [Civitai](https://civitai.com/models/1210683/chibi) | Chibi figures |
| Vibrant Watercolor | [Civitai](https://civitai.com/models/1200817/vibrant-watercolor-paintingsketch) | General watercolor |

**Pros**: Free, immediate, no training
**Cons**: Generic style, may not match your exact vision

### Option B: Train Custom Style LoRA

**Best for**: Locking in a specific art style across all images

**Requirements**:
- 20-50 high-quality reference images in your target style
- Consistent style across training images
- Natural language captions for each image

**Training Options**:

| Platform | Cost | Time | Ease |
|----------|------|------|------|
| **fal.ai** | ~$5/run | 20-30 min | ⭐⭐⭐⭐⭐ |
| **Replicate** | ~$3-5/run | 25-30 min | ⭐⭐⭐⭐⭐ |
| **Kohya SS (local)** | $0 (GPU cost) | 2-4 hours | ⭐⭐⭐ |
| **AI-Toolkit (local)** | $0 (GPU cost) | 1.5-3 hours | ⭐⭐⭐⭐ |
| **RunPod (cloud GPU)** | $4-12/run | 45-90 min | ⭐⭐⭐ |

### Option C: Use Flux Kontext Multi-Reference (No Training)

**Best for**: Character consistency across pages

Pass sprite sheets and hero page as reference images → Kontext maintains consistency without any LoRA training.

```
Reference Images: [sprite_sheet.png, hero_page.png]
           ↓
    Flux Kontext
           ↓
    New page with consistent character
```

---

## Part 4: Cost Analysis

### Current Setup (Nano Banana Pro)
- ~$0.03/image × 12 pages = **$0.36/book**

### Proposed Setup (Flux + LoRA)

**Per-Book Generation**:
| Model | Cost/Image | 12 Pages | Notes |
|-------|------------|----------|-------|
| Flux 1 Dev + LoRA | ~$0.03 | $0.36 | Same as current |
| Flux 1 Kontext | ~$0.04 | $0.48 | Multi-reference |
| Flux 2 Dev | ~$0.05 | $0.60 | Best quality |

**One-Time Training Costs** (custom style LoRA):
| Platform | Cost |
|----------|------|
| fal.ai | $5 |
| Replicate | $3-5 |
| Local (if you have RTX 4090) | $0 |

**Break-Even**: Custom LoRA pays off after ~15 books if it reduces regeneration/quality issues.

---

## Part 5: Toolchain Comparison

### Cloud Platforms (Recommended for You)

| Platform | Training | Inference | LoRA Hosting | Best For |
|----------|----------|-----------|--------------|----------|
| **fal.ai** | ✅ Fast | ✅ Fast | ✅ Yes | Speed, TypeScript SDK |
| **Replicate** | ✅ Easy | ✅ Good | ✅ Yes | Python SDK, already in codebase |
| **Together.ai** | ❌ | ✅ | ⚠️ Limited | Cheap inference |

### Local Tools (For Power Users)

| Tool | Learning Curve | VRAM Required | Best For |
|------|----------------|---------------|----------|
| **AI-Toolkit** | Medium | 12-24GB | Fast iteration |
| **Kohya SS** | High | 12-24GB | Maximum control |
| **SimpleTuner** | High | 24GB+ | Production quality |
| **ComfyUI** | Medium | 12GB+ | Visual workflows |

### Recommendation: Stick with Replicate

You already have Replicate integrated. They support:
- Flux 1 Dev with LoRA inference
- Flux Kontext
- Custom LoRA training
- Same API you're already using

---

## Part 6: Implementation Plan

### Phase 1: Experiment with Flux Kontext (1-2 days)

**Goal**: Test character consistency without training

```typescript
// Update image-generation.ts to use Flux Kontext
const IMAGE_MODEL = 'black-forest-labs/flux-kontext-dev';

const input = {
  prompt: buildPrompt(context),
  input_images: [spriteSheetUrl, heroPageUrl], // Multi-reference
  guidance_scale: 3.5,
  num_inference_steps: 28,
};
```

**Measure**: Character consistency across 12 pages

### Phase 2: Test Existing Style LoRA (1 day)

**Goal**: Lock in watercolor/chibi style

```typescript
const IMAGE_MODEL = 'lucataco/flux-dev-lora';

const input = {
  prompt: `${stylePrefix} ${buildPrompt(context)}`,
  hf_lora: 'civitai-url-or-path', // e.g., watercolor children book LoRA
  lora_scale: 0.8,
};
```

**Measure**: Style consistency, compare to Nano Banana

### Phase 3: Train Custom Style LoRA (if needed)

**Prerequisites**:
1. Collect 20-50 images in your exact target style
2. Write natural language captions for each
3. Ensure consistency (same artist, same technique)

**Using Replicate**:
```python
import replicate

training = replicate.trainings.create(
    model="ostris/flux-dev-lora-trainer",
    version="latest",
    input={
        "input_images": "https://your-bucket/style-images.zip",
        "trigger_word": "BOOKBUG_STYLE",
        "steps": 1000,
        "learning_rate": 1e-4,
        "resolution": "1024",
    },
    destination="your-username/bookbug-style-lora"
)
```

**Using fal.ai**:
```typescript
const result = await fal.subscribe("fal-ai/flux-lora-fast-training", {
  input: {
    images_data_url: "https://your-bucket/style-images.zip",
    trigger_word: "BOOKBUG_STYLE",
    steps: 1000,
  }
});
```

### Phase 4: Integrate into Codebase

**New files**:
```
src/core/services/
├── image-generation.ts        # Existing (refactor)
├── image-providers/
│   ├── types.ts              # Interface for providers
│   ├── nano-banana.ts        # Current implementation
│   ├── flux-kontext.ts       # New: Kontext multi-reference
│   └── flux-lora.ts          # New: Flux with LoRA
└── lora-training.ts          # Optional: Training helper
```

**Provider interface**:
```typescript
interface ImageProvider {
  name: string;
  generatePage(context: PageRenderContext, format: BookFormat, options?: GenerateOptions): Promise<GeneratedPage>;
}

interface GenerateOptions {
  referenceImages?: string[];
  loraPath?: string;
  loraScale?: number;
}
```

### Phase 5: A/B Test & Measure

**Metrics to track**:
1. Character consistency score (via quality agent)
2. Style consistency score
3. AI artifacts score
4. Cost per acceptable image (including regenerations)
5. User satisfaction

---

## Part 7: Files to Change

| File | Change |
|------|--------|
| `src/core/services/image-generation.ts` | Add provider abstraction, Flux support |
| `src/core/config.ts` | Add `IMAGE_PROVIDER` config |
| `src/core/schemas/render.ts` | Add LoRA configuration fields |
| `.env.example` | Add `FAL_KEY` (if using fal.ai) |
| `package.json` | Add `@fal-ai/client` (if using fal.ai) |

---

## Part 8: Decision Matrix

| If You Want... | Use... |
|----------------|--------|
| Quick test of character consistency | Flux Kontext (no training) |
| Lock in watercolor style | Existing watercolor LoRA |
| Lock in chibi style | Existing chibi LoRA |
| Your exact custom style | Train custom LoRA (~$5, 30 min) |
| Best quality, most control | Flux 2 + custom LoRA (higher cost) |
| Minimal code changes | Flux Kontext via Replicate |

---

## Sources

### Models & Architecture
- [FLUX.2 Official](https://flux2.io/)
- [Black Forest Labs](https://blackforestlabs.ai/)
- [FLUX.1 Kontext](https://bfl.ai/models/flux-kontext)
- [LoRA Paper (arXiv)](https://arxiv.org/abs/2106.09685)
- [IBM: What is LoRA](https://www.ibm.com/think/topics/lora)

### Training Guides
- [Flux 2 LoRA Training Guide 2025](https://apatero.com/blog/flux-2-lora-training-complete-guide-2025)
- [fal.ai Flux LoRA Training](https://fal.ai/models/fal-ai/flux-lora-fast-training)
- [Replicate: Fine-tune Flux](https://replicate.com/blog/fine-tune-flux)
- [Kohya Flux Training](https://learn.thinkdiffusion.com/flux-lora-training-with-kohya/)

### Style LoRAs
- [Digital Watercolor Children Book](https://civitai.com/models/512147/digital-watercolor-children-book-style)
- [Chibi Flux LoRA](https://civitai.com/models/1210683/chibi)
- [Vibrant Watercolor](https://civitai.com/models/1200817/vibrant-watercolor-paintingsketch)

### Comparisons
- [SDXL vs Flux](https://stable-diffusion-art.com/sdxl-vs-flux/)
- [Flux 2 vs Flux 1](https://fal.ai/learn/devs/flux-2-vs-flux-1-what-changed)
- [Flux Kontext vs Traditional LoRA](https://kontextlora.org/blog/flux-kontext-lora-vs-traditional-lora-comparison)

### Children's Books & Consistency
- [Best AI for Children's Book Illustrations 2025](https://consistentcharacter.ai/blog/best-ai-for-childrens-book-illustrations-2025-complete-author-workflow/)
- [Creating Consistent Characters](https://www.mayerdan.com/programming/2024/10/22/consistent-ai-book-characters)

---

## Open Questions for User

1. Which art style are you targeting? (watercolor, chibi, both combined?)
2. Do you have reference images for a custom style, or should we use existing LoRAs?
3. Should we start with Flux Kontext (no training) or jump straight to LoRA testing?
4. Any preference between fal.ai and Replicate for new integrations?
