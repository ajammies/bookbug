# Bookbug

A CLI tool for generating children's picture books using AI. Bookbug uses conversational AI to collaboratively develop stories, then generates prose, visual direction, and rendered illustrations through a multi-stage pipeline.

## Features

- **Conversational Story Development** - Chat-based intake that guides you through creating a story brief with characters, setting, plot, and age-appropriate themes
- **Multi-Stage Pipeline** - Story flows through intake, plot, prose, visuals, and rendering stages
- **Art Style Presets** - 8 built-in styles: watercolor, gouache, cut-paper, claymation, chibi, crayon, miniature, pixar
- **Resume Capability** - Pick up incomplete stories from where you left off
- **Quality Analysis** - Analyze rendered pages for visual consistency and quality issues
- **Multiple Book Formats** - Square, landscape, and portrait formats at various resolutions

## Installation

```bash
# Clone the repository
git clone https://github.com/ajammies/bookbug.git
cd bookbug

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

Create a `.env` file with your API keys:

```bash
# Required: Anthropic API key for Claude
ANTHROPIC_API_KEY=sk-ant-...

# Required: Replicate API token for image generation
REPLICATE_API_TOKEN=r8_...
```

## Usage

### Create a New Story

```bash
npm run dev create
```

This starts an interactive conversation to develop your story. The AI will ask about:
- Main character(s) and their traits
- Setting and world details
- Story arc and conflict
- Target age range
- Art style preference

### Resume an Incomplete Story

```bash
npm run dev resume
```

Lists all saved stories and lets you continue from the last completed stage.

### Other Commands

```bash
npm run dev write     # Write prose for a story with completed plot
npm run dev direct    # Generate visual direction for a story with prose
npm run dev render    # Render images for a story with visuals
npm run dev quality   # Analyze image quality of rendered pages
npm run dev logs      # Tail pipeline logs
```

## Project Structure

```
src/
  cli/
    commands/     # CLI commands (create, resume, render, etc.)
    utils/        # CLI utilities (progress display, selectors)
  core/
    agents/       # LLM agents (extractors, conversation, prose, visuals)
    schemas/      # Zod schemas for all data types
    services/     # AI service wrappers, image generation
    utils/        # Core utilities (logging, retry logic)
    pipeline.ts   # Main pipeline orchestration
  utils/          # Shared utilities (file operations)
prompts/
  presets/        # Art style preset configurations
docs/
  ARCHITECTURE.md # Type system and pipeline diagrams
  plans/          # Feature planning documents
```

## How It Works

### Pipeline Stages

1. **Intake** - Conversational AI extracts story requirements into a `StoryBrief`
2. **Plot** - Generates `PlotStructure` with 4-6 narrative beats (setup, conflict, rising action, climax, resolution)
3. **Prose** - Writes page-by-page text with a `ProsePage` for each page
4. **Visuals** - Creates `IllustratedPage` with detailed shot composition, character poses, and scene direction
5. **Render** - Generates images via Replicate's Flux models

### Type Composition

Each stage produces NEW fields that compose with previous stages:

```
StoryBrief → StoryWithPlot → StoryWithProse → ComposedStory → RenderedBook
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed type diagrams.

## Development

```bash
npm run dev          # Run CLI in development mode
npm run build        # Compile TypeScript
npm run typecheck    # Type check without emitting
npm run test:run     # Run all tests
npm run test:coverage # Generate coverage report
```

## Tech Stack

- **TypeScript** - Type-safe development
- **AI SDK v5** - Unified AI model interface
- **Claude (Anthropic)** - LLM for conversation, extraction, and generation
- **Replicate** - Image generation (Flux models)
- **Zod** - Schema validation and type inference
- **Commander** - CLI framework
- **Pino** - Structured logging

## Project History

**Development Period**: November 24 - December 10, 2025 (17 days)
**Total Commits**: 220 | **Features**: 52 | **Contributors**: 1

### Timeline

**Week 1 (Nov 24-26)**: Foundation
- Initial architecture with Zod schemas for story types
- LLM-driven conversational intake replacing hardcoded forms
- Replicate integration for image generation
- Vitest testing infrastructure

**Week 2 (Nov 27-30)**: Pipeline Unification
- AI SDK v5 upgrade
- Unified pipeline with extractorAgent and conversation history
- Structured plot beats with purpose labels
- Art style presets (watercolor, gouache, claymation, etc.)

**Week 3 (Dec 1-5)**: Polish & Reliability
- Image quality agent with retry logic
- Rate limit handling for Anthropic and Replicate
- Flux 2 Dev model integration
- Comprehensive pino logging throughout codebase
- Character appearance schema improvements

**Week 4 (Dec 9-10)**: Refinements
- Regression tests for character extraction
- LLM option generation improvements

### Challenges Overcome

1. **LLM Extraction Reliability** - Added `.describe()` hints to Zod schemas, created `toExtractablePartial` utility for safe partial extraction, and implemented retry logic for incomplete extractions

2. **Rate Limiting** - Implemented exponential backoff for both Anthropic 429 errors and Replicate rate limits

3. **Pipeline Complexity** - Unified multiple conversation flows into single `extractorAgent` pattern; had to revert and retry the approach once

4. **Prompt Length** - Added prompt condenser for Flux 2 Dev's token limits; minified JSON in generation prompts

5. **Character Consistency** - Developed hero page + limited references approach for visual style consistency across pages

## Next Steps

Based on planning documents and TODOs:

- [ ] Abstract `stopAfter` into dynamic step registry
- [ ] Inngest integration for background job processing
- [ ] LoRA training for custom character styles
- [ ] Character design image generation (sprite sheets)
- [ ] Graceful retry with incremental pipeline recovery

## License

MIT
