# Bookbug Architecture

A CLI tool that guides users through creating personalized children's picture books via conversational AI, then generates print-ready PDFs.

---

## Table of Contents

1. [Pipeline Overview](#pipeline-overview)
2. [Directory Structure](#directory-structure)
3. [Schema Reference](#schema-reference)
4. [Pipeline Phases](#pipeline-phases)
5. [Technical Implementation](#technical-implementation)
6. [Version Scope](#version-scope)
7. [Future Considerations](#future-considerations)

---

## Pipeline Overview

```
User Chat → StoryBrief → StoryBlurb (iterate) → Story.json
         → Character Sheets → Environment Concepts
         → Page Images (with text) → PDF (Lulu-ready)
```

---

## Directory Structure

```
bookbug/
├── src/
│   ├── core/
│   │   ├── schemas/
│   │   │   └── index.ts          # All Zod schemas and TypeScript types
│   │   ├── agents/
│   │   │   ├── index.ts          # Agent type definitions and exports
│   │   │   ├── book-builder.ts   # StoryBrief generation from user prompt
│   │   │   ├── author.ts         # Manuscript generation from brief
│   │   │   ├── director.ts       # Visual story direction from manuscript
│   │   │   └── illustrator.ts    # Image generation from story
│   │   └── pipeline.ts           # Pipeline orchestration
│   └── cli/
│       ├── index.ts              # CLI entry point (Commander.js)
│       ├── commands/
│       │   ├── create.ts         # Full pipeline command
│       │   ├── brief.ts          # Generate brief only
│       │   ├── write.ts          # Generate manuscript only
│       │   ├── direct.ts         # Generate visual story only
│       │   └── render.ts         # Generate images only
│       ├── prompts/
│       │   └── story-intake.ts   # Interactive story intake prompts
│       └── output/
│           ├── display.ts        # Console output formatting
│           └── progress.ts       # Progress indicators
├── scripts/
│   └── build-cli.ts              # CLI build script
├── examples/
│   └── otto-brief.json           # Example StoryBrief
├── ARCHITECTURE.md               # This file
├── CLAUDE.md                     # AI assistant instructions
└── package.json
```

---

## Schema Reference

All types are defined in `src/core/schemas/index.ts`. Key schemas:

### Input Types
| Schema | Description |
|--------|-------------|
| `StoryBrief` | User requirements: title, arc, setting, characters, age range |
| `StoryBlurb` | Brief + plotBeats + creative liberty flag |

### Manuscript Types
| Schema | Description |
|--------|-------------|
| `Manuscript` | Full text content: blurb, title, logline, pages |
| `ManuscriptPage` | Per-page: summary, text, imageConcept |
| `ManuscriptMeta` | Metadata: title, logline, theme, tone |

### Visual Direction Types
| Schema | Description |
|--------|-------------|
| `Story` | Complete visual story (normalized blob) |
| `StoryPage` | Page with visual beats |
| `StoryBeat` | Single illustration: shot composition, characters, emotion |
| `VisualStyleGuide` | Global art direction, lighting, colors |
| `ShotComposition` | Camera: size, angle, POV, staging, cinematography |

### Style Components
| Schema | Description |
|--------|-------------|
| `Setting` | Biome, location, time, landmarks |
| `Lighting` | Scheme, direction, temperature, volumetrics |
| `ColorScript` | Palette, harmony, saturation |
| `AtmosphereFx` | Fog, bloom, particles |
| `BeatCharacter` | Character in a beat: id, expression, pose, focus |

### Output Types
| Schema | Description |
|--------|-------------|
| `Book` | Final rendered book with pages and images |
| `BookPage` | Page with text and rendered images |
| `RenderedImage` | Generated image: url, dimensions, metadata |

---

## Pipeline Phases

### Phase 1: BookBuilder Chat

An LLM-powered conversational interface that guides the user through creating a complete `StoryBrief`.

**Behavior:**
- Asks clarifying questions one at a time
- Every question includes AI-generated default suggestions ("chips") based on context so far
- User can accept defaults, modify them, or provide custom input
- Seamless iteration - user can change anything at any point

**Output:** `StoryBrief`

### Phase 2: StoryBlurb Creation & Iteration

Expands the brief into a `StoryBlurb` with plot beats.

**Behavior:**
- AI generates initial plotBeats based on the brief
- User can iterate freely: add detail, change characters, modify plot, or restart entirely
- Conversation continues until user approves

**Output:** `StoryBlurb`

### Phase 3: Story Generation

Generates the complete `Story.json` containing manuscript text and visual direction.

**Agents:**
1. **AuthorAgent**: `StoryBlurb` → `Manuscript` (per-page text, summaries, image concepts)
2. **DirectorAgent**: `Manuscript` → `Story` (visual style guide, shot compositions, beat breakdowns)
3. **TypographerAgent** *(planned)*: `Story` → `Story` with text styling (font, position, size, decoration per page)

**Output:** `Story.json` (normalized blob with characters lookup, manuscript pages, visual beats)

### Phase 4: Asset Generation

Generates reference images for consistency before rendering final pages.

**Character Sheets:**
For each main character:
- **Expressions** (4-8 images): emotions dictated by `Story.json` beats
- **Turnarounds** (4 images): front, back, 3/4 left, 3/4 right

**Environment Concepts:**
For recurring locations only:
- **One reference image** per environment
- Only generated if location appears multiple times

### Phase 5: Page Rendering

Generates final page illustrations with text rendered into the image.

**Image Generation:**
- Model: Nano Banana Pro
- Input: Beat description + style guide + character sheet refs + environment refs
- Text is rendered INTO the illustration (picture book style)

**Text Rendering Requirements:**
- Pre-defined text styles and fonts
- Dynamic sizing based on text length
- Smart line breaks
- Decorative elements (optional)
- Configurable positioning (top, bottom, overlay, etc.)

**Output:** One image per page (or spread) with text baked in

### Phase 6: PDF Compilation

Assembles page images into a print-ready PDF.

**Requirements:**
- Lulu print specifications
- Support for multiple trim sizes (configurable)
- Full-bleed or framed layouts (configurable)
- Front/back cover handling
- Page ordering and bleed margins

**Output:** Print-ready PDF

---

## Technical Implementation

### Agent Pattern

Agents are standalone async functions following functional principles:

```typescript
// src/core/agents/author.ts
export const authorAgent = async (brief: StoryBrief): Promise<Manuscript> => {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: ManuscriptSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(brief, null, 2),
  });
  return object;
};
```

### Pipeline Orchestration

The pipeline executes agents sequentially with progress callbacks:

```typescript
// src/core/pipeline.ts
export async function executePipeline(
  userPrompt: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const brief = await bookBuilderAgent(userPrompt);
  const manuscript = await authorAgent(brief);
  const story = await directorAgent(manuscript);
  const book = await illustratorAgent(story);
  return { brief, manuscript, story, book };
}
```

### Normalized Data Structure

`Story.json` uses lookup tables for efficient, self-contained data:

```typescript
Story {
  storyTitle: string
  ageRange: AgeRange
  characters: Record<id, StoryCharacter>    // Lookup table
  manuscript: {
    meta: ManuscriptMeta
    pages: Record<pageNum, ManuscriptPage>  // Lookup table
  }
  style: VisualStyleGuide
  pages: StoryPage[]                        // References lookups by ID
}
```

### CLI Commands

```bash
npm run dev create "A story about..."   # Full pipeline
npm run dev brief "A story about..."    # Generate brief only
npm run dev write <brief.json>          # Generate manuscript
npm run dev direct <manuscript.json>    # Generate visual story
npm run dev render <story.json>         # Generate images
```

---

## Version Scope

### V1 (CLI)
- Full pipeline from chat to PDF
- Single-session flow
- CLI interface
- Nano Banana Pro for image generation
- Lulu PDF output

### V2 (Web)
- Save and resume sessions
- Web interface
- User accounts and book history
- Durable pipeline orchestration (Inngest)

---

## Future Considerations

### Durable Step Functions (Inngest)

For V2, the pipeline will benefit from **durable orchestration** using [Inngest](https://www.inngest.com/). Each pipeline step becomes independently retryable and memoized:

```typescript
inngest.createFunction(
  { id: "book-pipeline" },
  { event: "book/create" },
  async ({ event, step }) => {
    const brief = await step.run("build-brief", () =>
      bookBuilderAgent(event.data.prompt)
    );
    const manuscript = await step.run("write-manuscript", () =>
      authorAgent(brief)
    );
    const story = await step.run("direct-story", () =>
      directorAgent(manuscript)
    );
    const book = await step.run("illustrate", () =>
      illustratorAgent(story)
    );
    return book;
  }
);
```

**Benefits:**
- **Automatic retries**: If image generation fails, only that step retries (not the whole pipeline)
- **Memoization**: Completed steps are skipped on re-runs, preserving progress
- **Observability**: Built-in dashboard for monitoring pipeline runs
- **Resume from failure**: Users don't lose work if the pipeline crashes mid-way

This is especially valuable for long-running image generation where API timeouts and rate limits are common.
