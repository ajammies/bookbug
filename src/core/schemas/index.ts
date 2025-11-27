/**
 * Domain Schemas for Bookbug Children's Book Generator
 *
 * Pipeline: StoryBrief → StoryWithPlot → StoryWithProse → ComposedStory → RenderedBook
 */

// Common types
export {
  AgeRangeSchema,
  StoryCharacterSchema,
  type AgeRange,
  type StoryCharacter,
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
  BlurbConversationResponseSchema,
  type PlotBeatPurpose,
  type PlotBeat,
  type PlotStructure,
  type BlurbConversationResponse,
} from './plot';

// Stage 3: Prose (proseAgent)
export {
  ManuscriptPageSchema,
  ProseSchema,
  type ManuscriptPage,
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

// Stage 5: Render
export {
  RenderedPageSchema,
  RenderedBookSchema,
  StorySliceSchema,
  ImageGenerationResultSchema,
  type RenderedPage,
  type RenderedBook,
  type StorySlice,
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

// Legacy (to be removed)
export {
  StoryBlurbSchema,
  ManuscriptMetaSchema,
  ManuscriptSchema,
  LegacyStorySchema,
  type StoryBlurb,
  type ManuscriptMeta,
  type Manuscript,
  type LegacyStory,
} from './legacy';
