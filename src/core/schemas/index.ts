/**
 * Domain Schemas for Bookbug Children's Book Generator
 *
 * Pipeline: StoryBrief → StoryWithPlot → StoryWithProse → ComposedStory → RenderedBook
 */

// Common types
export {
  AgeRangeSchema,
  StoryCharacterSchema,
  BeatPurposeSchema,
  type AgeRange,
  type StoryCharacter,
  type BeatPurpose,
} from './common';

// Stage 1: Brief (book builder)
export {
  StoryBriefSchema,
  ConversationResponseSchema,
  type StoryBrief,
  type ConversationResponse,
} from './brief';

// Stage 2: Plot (plotAgent)
export {
  PlotBeatPurposeSchema,
  PlotBeatSchema,
  PlotStructureSchema,
  PlotConversationResponseSchema,
  type PlotBeatPurpose,
  type PlotBeat,
  type PlotStructure,
  type PlotConversationResponse,
} from './plot';

// Stage 3: Prose (proseAgent)
export {
  ProseSetupSchema,
  ProsePageSchema,
  ProseSchema,
  type ProseSetup,
  type ProsePage,
  type Prose,
} from './prose';

// Stage 4: Visuals (visualsAgent)
export {
  LightingSchema,
  ColorScriptSchema,
  MoodSchema,
  FocalHierarchySchema,
  AtmosphereFxSchema,
  MaterialsMicrodetailSchema,
  ConstraintsSchema,
  SettingSchema,
  LightingPartialSchema,
  ColorScriptPartialSchema,
  MoodPartialSchema,
  FocalHierarchyPartialSchema,
  AtmosphereFxPartialSchema,
  MaterialsMicrodetailPartialSchema,
  ConstraintsPartialSchema,
  SettingPartialSchema,
  ShotCompositionSchema,
  BeatCharacterSchema,
  IllustrationBeatSchema,
  VisualStyleGuideSchema,
  IllustratedPageSchema,
  VisualDirectionSchema,
  CharacterDesignSchema,
  type Lighting,
  type ColorScript,
  type Mood,
  type FocalHierarchy,
  type AtmosphereFx,
  type MaterialsMicrodetail,
  type Constraints,
  type Setting,
  type ShotComposition,
  type BeatCharacter,
  type IllustrationBeat,
  type VisualStyleGuide,
  type IllustratedPage,
  type VisualDirection,
  type CharacterDesign,
} from './visuals';

// Composed types
export {
  StoryWithPlotSchema,
  StoryWithProseSchema,
  ComposedStorySchema,
  StorySchema,
  type StoryWithPlot,
  type StoryWithProse,
  type ComposedStory,
  type Story,
} from './composed';

// Partial story (for progressive filling)
export {
  PartialStorySchema,
  hasCompleteBrief,
  hasCompletePlot,
  hasCompleteProse,
  hasCompleteVisuals,
  type PartialStory,
} from './partial';

// Stage 5: Render
export {
  RenderedPageSchema,
  RenderedBookSchema,
  PageRenderContextSchema,
  ImageGenerationResultSchema,
  type RenderedPage,
  type RenderedBook,
  type PageRenderContext,
  type ImageGenerationResult,
} from './render';

// Formats
export {
  BOOK_FORMATS,
  BookFormatKeySchema,
  getAspectRatio,
  type BookFormat,
  type BookFormatKey,
  type AspectRatio,
} from './formats';
