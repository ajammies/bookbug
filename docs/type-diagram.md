# Bookbug Type Diagram

```mermaid
erDiagram
    %% ============================================
    %% PIPELINE FLOW: StoryBrief → StoryBlurb → Manuscript → Story → RenderedBook
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

    StoryBlurb {
        StoryBrief brief
        string[] plotBeats
        boolean allowCreativeLiberty
    }

    Manuscript {
        StoryBlurb blurb
        string title
        string logline
        string theme
        string setting
        string moral "optional"
        AgeRange ageRange
        string tone "optional"
        string styleNotes "optional"
        StoryCharacter[] characters
        ManuscriptPage[] pages
        int pageCount
    }

    ManuscriptPage {
        string summary
        string text
        string imageConcept
    }

    Story {
        string storyTitle
        AgeRange ageRange
        Record_StoryCharacter characters "id → StoryCharacter"
        ManuscriptEmbed manuscript
        VisualStyleGuide style
        IllustratedPage[] pages
    }

    ManuscriptEmbed {
        ManuscriptMeta meta
        Record_ManuscriptPage pages "pageNum → ManuscriptPage"
    }

    ManuscriptMeta {
        string title
        string logline
        string theme
        string setting
        string moral "optional"
        string tone "optional"
        string styleNotes "optional"
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
        string id "references Story.characters"
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

    StorySlice {
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
    StoryBlurb ||--|| StoryBrief : contains
    Manuscript ||--|| StoryBlurb : contains
    Manuscript ||--|| AgeRange : contains
    Manuscript ||--|{ StoryCharacter : has
    Manuscript ||--|{ ManuscriptPage : has
    Story ||--|| AgeRange : contains
    Story ||--|{ StoryCharacter : "characters lookup"
    Story ||--|| ManuscriptEmbed : contains
    Story ||--|| VisualStyleGuide : has
    Story ||--|{ IllustratedPage : has
    ManuscriptEmbed ||--|| ManuscriptMeta : contains
    ManuscriptEmbed ||--|{ ManuscriptPage : "pages lookup"
    IllustratedPage ||--|{ IllustrationBeat : contains
    IllustrationBeat ||--|{ BeatCharacter : has
    IllustrationBeat ||--o| Setting : "optional override"
    IllustrationBeat ||--|| ShotComposition : has
    VisualStyleGuide ||--|| ArtDirection : contains
    VisualStyleGuide ||--|| Setting : contains
    RenderedBook ||--|| AgeRange : contains
    RenderedBook ||--|{ RenderedPage : has
    StorySlice ||--|| VisualStyleGuide : contains
    StorySlice ||--|{ StoryCharacter : "filtered characters"
    StorySlice ||--|| PageSlice : contains
```

## Pipeline Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│ StoryBrief  │────▶│ StoryBlurb  │────▶│ Manuscript  │────▶│   Story     │────▶│ RenderedBook │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └──────────────┘
       │                   │                   │                   │                    │
       ▼                   ▼                   ▼                   ▼                    ▼
  Chat Intake         Blurb Iteration      Author Agent      Illustrator Agent    Renderer Agent
  (conversation)      (plot beats)         (write text)      (visual direction)   (image gen)
```

## Agent Types

| Agent | Input | Output | File |
|-------|-------|--------|------|
| `interpreterAgent` | `string` + `Partial<StoryBrief>` | `Partial<StoryBrief>` | `interpreter.ts` |
| `conversationAgent` | `Partial<StoryBrief>` + `Message[]` | `ConversationResponse` | `conversation.ts` |
| `blurbGeneratorAgent` | `StoryBrief` | `StoryBlurb` | `blurb-generator.ts` |
| `blurbConversationAgent` | `StoryBlurb` + `BlurbMessage[]` | `BlurbConversationResponse` | `blurb-conversation.ts` |
| `blurbInterpreterAgent` | `string` + `StoryBlurb` | `StoryBlurb` | `blurb-interpreter.ts` |
| `authorAgent` | `StoryBlurb` | `Manuscript` | `author.ts` |
| `illustratorAgent` | `Manuscript` | `Story` | `illustrator.ts` |
| `renderPage` | `Story` + `pageNumber` | `RenderedPage` | `renderer.ts` |
| `createBook` | `Story` + `RenderedPage[]` | `RenderedBook` | `renderer.ts` |
| `detectApproval` | `string` | `boolean` | `approval-detector.ts` |

## Conversation Response Types

```typescript
ConversationResponse {
    question: string
    chips: string[]
    isComplete: boolean
}

BlurbConversationResponse {
    message: string
    chips: string[]
    isApproved: boolean
}
```

## Book Formats

| Key | Name | Width | Height | Aspect |
|-----|------|-------|--------|--------|
| `square-small` | Small Square | 1024 | 1024 | 1:1 |
| `square-large` | Large Square | 1440 | 1440 | 1:1 |
| `landscape` | Landscape | 1792 | 1024 | 7:4 |
| `portrait-small` | Portrait Small | 1024 | 1280 | 4:5 |
| `portrait-large` | Portrait Large | 1024 | 1792 | 4:7 |
