/**
 * Domain Schemas for Bookbug Children's Book Generator
 *
 * Pipeline: Story → StoryWithProse → ComposedStory → RenderedBook
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

// Legacy: Brief (for backward compatibility)
export {
  StoryBriefSchema,
  ConversationResponseSchema,
  type StoryBrief,
  type ConversationResponse,
} from './brief';

// Legacy: Plot (for backward compatibility)
export {
  PlotBeatPurposeSchema,
  PlotBeatSchema as LegacyPlotBeatSchema,
  PlotStructureSchema,
  PlotConversationResponseSchema,
  type PlotBeatPurpose,
  type PlotBeat as LegacyPlotBeat,
  type PlotStructure,
  type PlotConversationResponse,
} from './plot';

// Story schema (the unified schema)
export {
  StorySchema,
  PlotBeatSchema,
  parseFieldPolicy,
  getCleanDescription,
  getFieldPolicies,
  getRequiredFields,
  getMissingRequiredFields,
  hasAllRequiredFields,
  type Story,
  type PlotBeat,
  type FieldPolicy,
} from './story';

// Story tools (auto-generated from schema)
export {
  createStoryTools,
  type StoryState,
  type StoryTools,
  type ToolResult,
} from './story-tools';

// Prose (proseAgent)
export {
  ProseSetupSchema,
  ProsePageSchema,
  ProseSchema,
  type ProseSetup,
  type ProsePage,
  type Prose,
} from './prose';

// Visuals (visualsAgent)
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
  StoryWithProseSchema,
  ComposedStorySchema,
  type StoryWithProse,
  type ComposedStory,
} from './composed';

// Stage validators (check if stage can be skipped)
export { hasCompleteStory, hasCompleteBrief, hasCompletePlot } from './partial';

// Render
export {
  RenderedPageSchema,
  RenderedBookSchema,
  PageRenderContextSchema,
  ImageGenerationResultSchema,
  ImageQualityResultSchema,
  type RenderedPage,
  type RenderedBook,
  type PageRenderContext,
  type ImageGenerationResult,
  type ImageQualityResult,
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
