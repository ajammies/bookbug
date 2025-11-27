# Bookbug Type Diagram

## Functional Composition Pipeline

The type system uses pure functional composition. Each stage produces only NEW fields, which are composed with previous stages to build the complete story.

```mermaid
erDiagram
    %% ============================================
    %% STAGE 1: StoryBrief (user requirements)
    %% ============================================

    StoryBrief {
        string title
        string storyArc
        string setting
        AgeRange ageRange
        int pageCount
        StoryCharacter[] characters
        string tone "optional"
        string moral "optional"
        string[] interests
        string[] customInstructions
    }

    AgeRange {
        int min "2-12"
        int max "2-12"
    }

    StoryCharacter {
        string name
        string description
        string role "optional"
        string[] traits
        string[] notes
    }

    %% ============================================
    %% STAGE 2: PlotStructure (blurb generator output)
    %% ============================================

    PlotStructure {
        string storyArcSummary
        PlotBeat[] plotBeats "4-6 beats"
        boolean allowCreativeLiberty
    }

    PlotBeat {
        enum purpose "setup|conflict|rising_action|climax|resolution"
        string description
    }

    %% ============================================
    %% STAGE 3: Prose (author agent output)
    %% ============================================

    ProseSetup {
        string logline
        string theme
        string styleNotes "optional"
    }

    Prose {
        string logline
        string theme
        string styleNotes "optional"
        ProsePage[] pages
    }

    ProsePage {
        string summary
        string text
        string imageConcept
    }

    %% ============================================
    %% STAGE 4: VisualDirection (illustrator agent output)
    %% ============================================

    VisualDirection {
        VisualStyleGuide style
        IllustratedPage[] illustratedPages
    }

    IllustratedPage {
        int pageNumber
        IllustrationBeat[] beats
    }

    IllustrationBeat {
        int order
        enum purpose "setup|build|twist|climax|payoff|button"
        string summary
        string emotion
        BeatCharacter[] characters
        Setting setting "optional override"
        ShotComposition shot
    }

    BeatCharacter {
        string id "references character by name"
        string expression
        string pose
        enum focus "primary|secondary|background"
    }

    ShotComposition {
        enum size "extreme_wide|wide|medium|close_up|..."
        enum angle "eye_level|childs_eye|high_angle|..."
        enum pov "optional"
        enum[] composition "optional"
        enum layout "optional"
        Staging staging "optional"
        Cinematography cinematography "optional"
        Overrides overrides "optional"
    }

    VisualStyleGuide {
        ArtDirection art_direction
        Setting setting
        Lighting lighting "optional"
        ColorScript color_script "optional"
        Mood mood_narrative "optional"
        AtmosphereFx atmosphere_fx "optional"
    }

    ArtDirection {
        string[] genre
        string[] medium
        string[] technique
        float style_strength "0-1, optional"
    }

    Setting {
        string biome "optional"
        string location "optional"
        string detail_description "optional"
        string season "optional"
        string time_of_day "optional"
        string[] landmarks
        string[] diegetic_lights
    }

    %% ============================================
    %% COMPOSED TYPES (linear composition)
    %% Each extends the previous via relationship
    %% ============================================

    StoryWithPlot {
        PlotStructure plot
    }

    StoryWithProse {
        Prose prose
    }

    ComposedStory {
        VisualDirection visuals
    }

    %% ============================================
    %% FINAL OUTPUT
    %% ============================================

    RenderedBook {
        string storyTitle
        AgeRange ageRange
        BookFormatKey format
        RenderedPage[] pages
        string createdAt "ISO datetime"
    }

    RenderedPage {
        int pageNumber
        string url
    }

    PageRenderContext {
        string storyTitle
        VisualStyleGuide style
        Record_StoryCharacter characters
        PageSlice page
    }

    PageSlice {
        int pageNumber
        string text "optional"
        IllustrationBeat[] beats "optional"
    }

    %% ============================================
    %% RELATIONSHIPS
    %% ============================================

    StoryBrief ||--|| AgeRange : contains
    StoryBrief ||--|{ StoryCharacter : has
    PlotStructure ||--|{ PlotBeat : has
    ProseSetup ||--o| Prose : "subset of"
    Prose ||--|{ ProsePage : has
    VisualDirection ||--|| VisualStyleGuide : has
    VisualDirection ||--|{ IllustratedPage : has
    IllustratedPage ||--|{ IllustrationBeat : contains
    IllustrationBeat ||--|{ BeatCharacter : has
    IllustrationBeat ||--o| Setting : "optional override"
    IllustrationBeat ||--|| ShotComposition : has
    VisualStyleGuide ||--|| ArtDirection : contains
    VisualStyleGuide ||--|| Setting : contains
    RenderedBook ||--|| AgeRange : contains
    RenderedBook ||--|{ RenderedPage : has
    PageRenderContext ||--|| VisualStyleGuide : contains
    PageRenderContext ||--|{ StoryCharacter : "filtered characters"
    PageRenderContext ||--|| PageSlice : contains
    StoryWithPlot ||--|| StoryBrief : extends
    StoryWithPlot ||--|| PlotStructure : "plot"
    StoryWithProse ||--|| StoryWithPlot : extends
    StoryWithProse ||--|| Prose : "prose"
    ComposedStory ||--|| StoryWithProse : extends
    ComposedStory ||--|| VisualDirection : "visuals"
```

## Pipeline Flow

```
                              Stage Outputs (NEW fields only)
                              ─────────────────────────────────
┌─────────────┐     ┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│ StoryBrief  │────▶│ StoryWithPlot │────▶│ StoryWithProse  │────▶│ ComposedStory   │────▶│ RenderedBook │
└─────────────┘     └───────────────┘     └─────────────────┘     └─────────────────┘     └──────────────┘
       │                   │                       │                       │                    │
       ▼                   ▼                       ▼                       ▼                    ▼
  Chat Intake          plotAgent             proseAgent            visualsAgent           renderPage
  (conversation)      → PlotStructure        → Prose               → VisualDirection      → RenderedBook
```

## Incremental Pipeline (executePipeline)

The main pipeline uses incremental page-by-page execution for better progress tracking:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           executePipeline(StoryWithPlot)                          │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Step 1: Setup (parallel)                                                         │
│  ┌─────────────────────┐    ┌─────────────────────┐                              │
│  │  styleGuideAgent    │    │  proseSetupAgent    │                              │
│  │  → VisualStyleGuide │    │  → ProseSetup       │                              │
│  └─────────────────────┘    └─────────────────────┘                              │
│                                                                                   │
│  Step 2: Generate prose pages (sequential, with context)                          │
│  ┌──────────────────────────────────────────────────────────────────────┐        │
│  │  for each page:                                                       │        │
│  │    prosePageAgent({ story, proseSetup, pageNumber, previousPages })   │        │
│  │    → ProsePage                                                        │        │
│  └──────────────────────────────────────────────────────────────────────┘        │
│                                                                                   │
│  Step 3: Generate illustrated pages (sequential)                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐        │
│  │  for each page:                                                       │        │
│  │    pageVisualsAgent({ story, styleGuide, pageNumber, prosePage })     │        │
│  │    → IllustratedPage                                                  │        │
│  └──────────────────────────────────────────────────────────────────────┘        │
│                                                                                   │
│  Step 4: Render pages (sequential, with onPageComplete callback)                  │
│  ┌──────────────────────────────────────────────────────────────────────┐        │
│  │  for each page:                                                       │        │
│  │    renderPage(composedStory, pageNumber)                              │        │
│  │    → RenderedPage                                                     │        │
│  │    onPageComplete(pageNumber, renderedPage)                           │        │
│  └──────────────────────────────────────────────────────────────────────┘        │
│                                                                                   │
│  Step 5: Assemble → RenderedBook                                                  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Composition at Each Stage

```typescript
// Stage 1: User provides requirements
StoryBrief

// Stage 2: Blurb generator adds plot structure
StoryWithPlot = StoryBrief & { plot: PlotStructure }

// Stage 3: Author adds prose
StoryWithProse = StoryWithPlot & { prose: Prose }

// Stage 4: Illustrator adds visual direction
ComposedStory = StoryWithProse & { visuals: VisualDirection }

// Alias for convenience
type Story = ComposedStory
```

## Agent Types

Agents are named after their output for clarity.

### Intake Agents
| Agent | Input | Output | Purpose |
|-------|-------|--------|---------|
| `interpreterAgent` | `string` + `Partial<StoryBrief>` | `Partial<StoryBrief>` | Parse user message into brief fields |
| `conversationAgent` | `Partial<StoryBrief>` + `Message[]` | `ConversationResponse` | Guide story intake conversation |
| `plotAgent` | `StoryBrief` | `PlotStructure` | Generate plot beats from brief |
| `plotConversationAgent` | `StoryWithPlot` + `BlurbMessage[]` | `PlotConversationResponse` | Guide plot refinement |
| `plotInterpreterAgent` | `string` + `StoryWithPlot` | `PlotStructure` | Parse feedback into plot updates |
| `detectApproval` | `string` | `boolean` | Detect user approval intent |

### Batch Agents (used by CLI commands)
| Agent | Input | Output | Purpose |
|-------|-------|--------|---------|
| `proseAgent` | `StoryWithPlot` | `Prose` | Write all prose at once |
| `visualsAgent` | `StoryWithProse` | `VisualDirection` | Create all visual direction at once |

### Per-Page Agents (used by incremental pipeline)
| Agent | Input | Output | Purpose |
|-------|-------|--------|---------|
| `proseSetupAgent` | `StoryWithPlot` | `ProseSetup` | Generate story-wide prose metadata (once) |
| `prosePageAgent` | `ProsePageInput` | `ProsePage` | Write prose for one page |
| `styleGuideAgent` | `StoryWithPlot` | `VisualStyleGuide` | Generate visual style guide (once) |
| `pageVisualsAgent` | `PageVisualsInput` | `IllustratedPage` | Create illustration beats for one page |

### Rendering
| Agent | Input | Output | Purpose |
|-------|-------|--------|---------|
| `renderPage` | `ComposedStory` + `pageNumber` | `RenderedPage` | Generate page image |
| `createBook` | `ComposedStory` + `RenderedPage[]` | `RenderedBook` | Assemble final book |

## Conversation Response Types

```typescript
ConversationResponse {
    question: string
    chips: string[]
    isComplete: boolean
}

PlotConversationResponse {
    message: string
    chips: string[]
    isApproved: boolean
}
```

## Key Design Principles

1. **Pure Composition**: Each agent outputs only NEW fields, never duplicates
2. **No Embedding**: Stages compose types, not embed them
3. **Linear Flow**: Each type extends the previous, building up the story
4. **Zero Duplication**: Fields exist in exactly one place
5. **Type Safety**: Zod schemas enforce structure at each stage

## Book Formats

| Key | Name | Width | Height | Aspect |
|-----|------|-------|--------|--------|
| `square-small` | Small Square | 1024 | 1024 | 1:1 |
| `square-large` | Large Square | 1440 | 1440 | 1:1 |
| `landscape` | Landscape | 1792 | 1024 | 7:4 |
| `portrait-small` | Portrait Small | 1024 | 1280 | 4:5 |
| `portrait-large` | Portrait Large | 1024 | 1792 | 4:7 |
