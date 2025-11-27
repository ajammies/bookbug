import { z } from "zod";

/**
 * Domain Schemas for Bookbug Children's Book Generator
 *
 * Data flow: StoryBrief → Manuscript → Story (normalized) → Book
 *
 * NORMALIZED STRUCTURE:
 * Story contains lookup tables for characters and manuscript pages.
 * Beats reference these by ID for conciseness while keeping the blob self-contained.
 */

// ============================================================
// 1. DOMAIN BASICS (shared across pipeline)
// ============================================================

export const AgeRangeSchema = z
  .object({
    min: z.number().int().min(2).max(12),
    max: z.number().int().min(2).max(12),
  })
  .refine((range) => range.min <= range.max, {
    message: "ageRange.min must be <= ageRange.max",
    path: ["max"],
  });

export type AgeRange = z.infer<typeof AgeRangeSchema>;

export const StoryCharacterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  role: z.string().optional(),
  traits: z.array(z.string().min(1)).default([]),
  notes: z.array(z.string().min(1)).default([]),
});

export type StoryCharacter = z.infer<typeof StoryCharacterSchema>;

// ============================================================
// 2. BOOK BUILDER → StoryBrief (requirements / intent)
// ============================================================

export const StoryBriefSchema = z.object({
  title: z.string().min(1).describe('Working title for the story'),
  storyArc: z.string().min(1).describe('The narrative arc or journey (e.g., "hero overcomes fear")'),
  setting: z.string().min(1).describe('Where and when the story takes place'),
  ageRange: AgeRangeSchema,
  pageCount: z.number().int().min(8).max(32).default(24),
  characters: z.array(StoryCharacterSchema).min(1),
  tone: z.string().optional().describe('Emotional tone (e.g., "whimsical", "heartfelt")'),
  moral: z.string().optional().describe('Lesson or takeaway for the reader'),
  interests: z.array(z.string().min(1)).default([]).describe('Topics the child enjoys'),
  customInstructions: z.array(z.string().min(1)).default([]).describe('Special requests from the user'),
});

export type StoryBrief = z.infer<typeof StoryBriefSchema>;

// ============================================================
// 2a. CHAT INTAKE → ConversationResponse (LLM chat flow)
// ============================================================

export const ConversationResponseSchema = z.object({
  question: z.string().min(1).describe('The next question to ask the user'),
  chips: z.array(z.string().min(1)).describe('3-4 quick-reply suggestions for the user'),
  isComplete: z.boolean().describe('True when all required StoryBrief fields are filled'),
});

export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;

export const PlotBeatPurposeSchema = z.enum([
  'setup',
  'conflict',
  'rising_action',
  'climax',
  'resolution',
]);

export type PlotBeatPurpose = z.infer<typeof PlotBeatPurposeSchema>;

export const PlotBeatSchema = z.object({
  purpose: PlotBeatPurposeSchema.describe('Narrative function of this beat'),
  description: z.string().min(1).describe('What happens in this beat'),
});

export type PlotBeat = z.infer<typeof PlotBeatSchema>;

// ============================================================
// NEW: Stage 2 - PlotStructure (only NEW fields from blurb generator)
// ============================================================

/**
 * PlotStructure: Output of blurb generator agent
 * Contains ONLY the new fields produced at this stage, not the entire StoryBrief.
 */
export const PlotStructureSchema = z.object({
  storyArcSummary: z.string().min(1).describe('1-2 sentence story arc summary'),
  plotBeats: z.array(PlotBeatSchema).min(4).max(6).describe('Key story structure beats'),
  allowCreativeLiberty: z.boolean().default(true).describe('Whether the author can embellish beyond the beats'),
});

export type PlotStructure = z.infer<typeof PlotStructureSchema>;

// LEGACY: StoryBlurb (embedded StoryBrief) - to be removed after migration
export const StoryBlurbSchema = z.object({
  brief: StoryBriefSchema,
  storyArcSummary: z.string().min(1).describe('1-2 sentence story arc summary'),
  plotBeats: z.array(PlotBeatSchema).min(4).max(6).describe('Key story structure beats'),
  allowCreativeLiberty: z.boolean().default(true).describe('Whether the author can embellish beyond the beats'),
});

export type StoryBlurb = z.infer<typeof StoryBlurbSchema>;

// ============================================================
// 2b. BLURB ITERATION → BlurbConversationResponse (plot refinement)
// ============================================================

export const BlurbConversationResponseSchema = z.object({
  message: z.string().min(1).describe('Response to the user about their story plot'),
  chips: z.array(z.string().min(1)).describe('3-4 suggestions including an approval option'),
  isApproved: z.boolean().describe('True when the user approves the plot beats'),
});

export type BlurbConversationResponse = z.infer<typeof BlurbConversationResponseSchema>;

// ============================================================
// 3. AUTHOR → Manuscript (manuscript + page breakdown)
// ============================================================

export const ManuscriptPageSchema = z.object({
  summary: z.string().min(1).describe('Brief description of what happens on this page'),
  text: z.string().min(1).describe('The prose that will appear on the page'),
  imageConcept: z.string().min(1).describe('Description of the illustration for this page'),
});

export type ManuscriptPage = z.infer<typeof ManuscriptPageSchema>;

// ============================================================
// NEW: Stage 3 - Prose (only NEW fields from author agent)
// ============================================================

/**
 * Prose: Output of author agent
 * Contains ONLY the new fields produced at this stage.
 * The agent receives StoryWithPlot (StoryBrief & { plot: PlotStructure })
 * and outputs only the prose content.
 */
export const ProseSchema = z.object({
  logline: z.string().min(1).describe('One-sentence story summary'),
  theme: z.string().min(1).describe('Central theme or message'),
  styleNotes: z.string().optional().describe('Notes on writing style for this story'),
  pages: z.array(ManuscriptPageSchema).min(1).describe('One ManuscriptPage per page of the book'),
});

export type Prose = z.infer<typeof ProseSchema>;

// LEGACY: Manuscript metadata (without pages, for embedding in Story)
export const ManuscriptMetaSchema = z.object({
  title: z.string().min(1),
  logline: z.string().min(1).describe('One-sentence story summary'),
  theme: z.string().min(1).describe('Central theme or message'),
  setting: z.string().min(1),
  moral: z.string().optional(),
  tone: z.string().optional(),
  styleNotes: z.string().optional().describe('Notes on writing style for this story'),
});

export type ManuscriptMeta = z.infer<typeof ManuscriptMetaSchema>;

// LEGACY: Full Manuscript - to be removed after migration
export const ManuscriptSchema = z.object({
  blurb: StoryBlurbSchema,
  title: z.string().min(1),
  logline: z.string().min(1).describe('One-sentence story summary'),
  theme: z.string().min(1).describe('Central theme or message'),
  setting: z.string().min(1),
  moral: z.string().optional(),
  ageRange: AgeRangeSchema,
  tone: z.string().optional(),
  styleNotes: z.string().optional().describe('Notes on writing style for this story'),
  characters: z.array(StoryCharacterSchema).min(1),
  pages: z.array(ManuscriptPageSchema).min(1).describe('One ManuscriptPage per page of the book'),
  pageCount: z.number().int().min(8).max(32),
})
.refine((manuscript) => manuscript.pages.length === manuscript.pageCount, {
  message: "pages.length must equal pageCount",
  path: ["pages"],
});

export type Manuscript = z.infer<typeof ManuscriptSchema>;

// ============================================================
// 4. DIRECTOR → Story (visual direction + complete story)
// ============================================================

// Shared style building blocks
export const LightingSchema = z.object({
  scheme: z.array(z.string().min(1)),
  direction: z.array(z.string().min(1)),
  quality: z.string().optional(),
  temperature_K: z.number().optional(),
  contrast_ratio: z.string().optional(),
  volumetrics: z.object({
    godrays: z.string().optional(),
    ambient: z.string().optional(),
  }).optional(),
});

export const ColorScriptSchema = z.object({
  harmony: z.string().optional(),
  palette: z.array(z.string().min(1)).default([]),
  accent_colors: z.array(z.string().min(1)).default([]),
  saturation_level: z.string().optional(),
  value_key: z.string().optional(),
});

export const MoodSchema = z.object({
  beat: z.string().optional(),
  tone: z.array(z.string().min(1)).default([]),
  sliders: z.record(z.number().min(0).max(1)).optional(),
});

export const FocalHierarchySchema = z.object({
  priority: z.array(z.string().min(1)).default([]),
  min_visibility: z.record(z.array(z.string().min(1))).optional(),
  no_crop: z.array(z.string().min(1)).default([]),
  focus_plane: z.string().optional(),
});

export const AtmosphereFxSchema = z.object({
  fog: z.object({
    style_reference: z.string().optional(),
    hue: z.string().optional(),
    density: z.string().optional(),
    height: z.string().optional(),
  }).optional(),
  bloom: z.string().optional(),
  lens_flare: z.string().optional(),
  particles: z.object({
    type: z.string().optional(),
    density: z.string().optional(),
  }).optional(),
  dew: z.string().optional(),
});

export const MaterialsMicrodetailSchema = z.object({
  microdetail_level: z.string().optional(),
  detail_budget: z.object({
    priority: z.array(z.string().min(1)).default([]),
    deprioritize: z.array(z.string().min(1)).default([]),
  }).optional(),
});

export const ConstraintsSchema = z.object({
  negative: z.array(z.string().min(1)).default([]),
  style_caps: z.record(z.string().min(1)).optional(),
});

export const SettingSchema = z.object({
  biome: z.string().optional(),
  location: z.string().optional(),
  detail_description: z.string().optional(),
  season: z.string().optional(),
  time_of_day: z.string().optional(),
  landmarks: z.array(z.string().min(1)).default([]),
  diegetic_lights: z.array(z.string().min(1)).default([]),
});

// Partial schemas for per-shot overrides
export const LightingPartialSchema = LightingSchema.partial();
export const ColorScriptPartialSchema = ColorScriptSchema.partial();
export const MoodPartialSchema = MoodSchema.partial();
export const FocalHierarchyPartialSchema = FocalHierarchySchema.partial();
export const AtmosphereFxPartialSchema = AtmosphereFxSchema.partial();
export const MaterialsMicrodetailPartialSchema = MaterialsMicrodetailSchema.partial();
export const ConstraintsPartialSchema = ConstraintsSchema.partial();
export const SettingPartialSchema = SettingSchema.partial();

export type Lighting = z.infer<typeof LightingSchema>;
export type ColorScript = z.infer<typeof ColorScriptSchema>;
export type Mood = z.infer<typeof MoodSchema>;
export type FocalHierarchy = z.infer<typeof FocalHierarchySchema>;
export type AtmosphereFx = z.infer<typeof AtmosphereFxSchema>;
export type MaterialsMicrodetail = z.infer<typeof MaterialsMicrodetailSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;
export type Setting = z.infer<typeof SettingSchema>;

// ShotComposition DSL
export const ShotCompositionSchema = z.object({
  size: z.enum(["extreme_wide", "wide", "medium_wide", "medium", "medium_close", "close_up", "extreme_close_up", "macro_detail", "insert_object"]),
  angle: z.enum(["eye_level", "childs_eye", "high_angle", "birds_eye", "worms_eye", "low_angle_hero", "three_quarter_view", "profile_side", "dutch_tilt", "isometric_view"]),
  pov: z.enum(["objective_view", "character_pov", "over_shoulder", "follow_from_behind", "reaction_close", "crowd_pov", "threat_pov", "reflection_pov"]).optional(),
  composition: z.array(z.enum(["centered_hero", "thirds_composition", "symmetrical", "foreground_frame", "deep_space", "diagonal_composition", "negative_space", "silhouette", "shadow_play", "reflection_focus", "crowd_search"])).optional(),
  layout: z.enum(["full_bleed_single", "full_bleed_spread", "framed_illustration", "spot_illustration", "clustered_vignettes", "multi_panel", "progression_strip", "side_scroller_spread", "cutaway_cross_section", "dollhouse_view", "map_spread", "split_screen", "before_after", "zoom_sequence"]).optional(),
  staging: z.object({
    anchors: z.array(z.object({
      subject: z.string().min(1),
      grid: z.string().min(1),
    })).optional(),
    depth: z.object({
      fg: z.array(z.string().min(1)).optional(),
      mg: z.array(z.string().min(1)).optional(),
      bg: z.array(z.string().min(1)).optional(),
    }).optional(),
    negative_space: z.string().optional(),
    leading_lines: z.string().optional(),
  }).optional(),
  cinematography: z.object({
    focal_length_mm: z.number().optional(),
    aperture_f: z.number().optional(),
    dof: z.string().optional(),
    camera_height: z.string().optional(),
    movement: z.string().optional(),
  }).optional(),
  overrides: z.object({
    lighting: LightingPartialSchema.optional(),
    color: ColorScriptPartialSchema.optional(),
    mood: MoodPartialSchema.optional(),
    focal_hierarchy: FocalHierarchyPartialSchema.optional(),
    atmosphere_fx: AtmosphereFxPartialSchema.optional(),
    materials_microdetail: MaterialsMicrodetailPartialSchema.optional(),
    constraints: ConstraintsPartialSchema.optional(),
  }).optional(),
});

export type ShotComposition = z.infer<typeof ShotCompositionSchema>;

// BeatCharacter: concise character reference within a beat.
// References characters by id (key in Story.characters lookup table).
export const BeatCharacterSchema = z.object({
  id: z.string().min(1).describe('Character ID from Story.characters'),
  expression: z.string().min(1).describe('Facial expression (e.g., "wide-eyed wonder")'),
  pose: z.string().min(1).describe('Body posture and action'),
  focus: z.enum(['primary', 'secondary', 'background']).describe('Visual prominence in the shot'),
});

export type BeatCharacter = z.infer<typeof BeatCharacterSchema>;

// IllustrationBeat: one visual moment with shot composition
export const IllustrationBeatSchema = z.object({
  order: z.number().int().min(1).describe('Sequence within the page (1, 2, 3...)'),
  purpose: z.enum(["setup", "build", "twist", "climax", "payoff", "button"]).describe('Narrative function of this beat'),
  summary: z.string().min(1).describe('What is happening visually'),
  emotion: z.string().min(1).describe('The emotional tone to convey'),
  characters: z.array(BeatCharacterSchema).default([]),
  setting: SettingPartialSchema.optional().describe('Override the global setting for this beat'),
  shot: ShotCompositionSchema,
});

export type IllustrationBeat = z.infer<typeof IllustrationBeatSchema>;

// VisualStyleGuide: Global visual style applied across the entire book
export const VisualStyleGuideSchema = z.object({
  art_direction: z.object({
    genre: z.array(z.string().min(1)).default([]),
    medium: z.array(z.string().min(1)).default([]),
    technique: z.array(z.string().min(1)).default([]),
    style_strength: z.number().min(0).max(1).optional(),
  }),
  setting: SettingSchema,
  lighting: LightingSchema.optional(),
  color_script: ColorScriptSchema.optional(),
  mood_narrative: MoodSchema.optional(),
  atmosphere_fx: AtmosphereFxSchema.optional(),
  materials_microdetail: MaterialsMicrodetailSchema.optional(),
  constraints: ConstraintsSchema.optional(),
});

export type VisualStyleGuide = z.infer<typeof VisualStyleGuideSchema>;

// IllustratedPage: a single page with visual beats
export const IllustratedPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  beats: z.array(IllustrationBeatSchema).min(1),
});

export type IllustratedPage = z.infer<typeof IllustratedPageSchema>;

// ============================================================
// NEW: Stage 4 - VisualDirection (only NEW fields from illustrator agent)
// ============================================================

/**
 * VisualDirection: Output of illustrator agent
 * Contains ONLY the new fields produced at this stage.
 * The agent receives StoryWithProse and outputs visual direction.
 */
export const VisualDirectionSchema = z.object({
  style: VisualStyleGuideSchema,
  illustratedPages: z.array(IllustratedPageSchema).min(1),
});

export type VisualDirection = z.infer<typeof VisualDirectionSchema>;

// ============================================================
// LEGACY: Story (old self-contained blob) - to be replaced
// ============================================================

/**
 * LEGACY Story: complete story ready for rendering
 * To be replaced by composed Story type after migration.
 */
export const LegacyStorySchema = z.object({
  storyTitle: z.string().min(1),
  ageRange: AgeRangeSchema,
  characters: z.record(z.string(), StoryCharacterSchema),
  manuscript: z.object({
    meta: ManuscriptMetaSchema,
    pages: z.record(z.string(), ManuscriptPageSchema),
  }),
  style: VisualStyleGuideSchema,
  pages: z.array(IllustratedPageSchema).min(1),
});

export type LegacyStory = z.infer<typeof LegacyStorySchema>;

// Keep StorySchema as alias for backwards compatibility during migration
export const StorySchema = LegacyStorySchema;
export type Story = LegacyStory;

// ============================================================
// 5. RENDERER → RenderedBook (final rendered book)
// ============================================================

// Import and re-export format types and utilities
import {
  BOOK_FORMATS as _BOOK_FORMATS,
  BookFormatKeySchema as _BookFormatKeySchema,
  getAspectRatio as _getAspectRatio,
  type BookFormat as _BookFormat,
  type BookFormatKey as _BookFormatKey,
  type AspectRatio as _AspectRatio,
} from './formats';

export const BOOK_FORMATS = _BOOK_FORMATS;
export const BookFormatKeySchema = _BookFormatKeySchema;
export const getAspectRatio = _getAspectRatio;
export type BookFormat = _BookFormat;
export type BookFormatKey = _BookFormatKey;
export type AspectRatio = _AspectRatio;

// Simplified rendered page - just page number and URL
export const RenderedPageSchema = z.object({
  pageNumber: z.number().int().min(1),
  url: z.string().url(),
});

export type RenderedPage = z.infer<typeof RenderedPageSchema>;

export const RenderedBookSchema = z.object({
  storyTitle: z.string().min(1),
  ageRange: AgeRangeSchema,
  format: _BookFormatKeySchema.default('square-large'),
  pages: z.array(RenderedPageSchema).min(1),
  createdAt: z.string().datetime(),
});

export type RenderedBook = z.infer<typeof RenderedBookSchema>;

// ============================================================
// 6. IMAGE GENERATION (intermediate types)
// ============================================================

/**
 * StorySlice: filtered Story data for a single page
 * Contains only the information needed to generate one illustration
 */
export const StorySliceSchema = z.object({
  storyTitle: z.string().min(1),
  style: VisualStyleGuideSchema,
  characters: z.record(z.string(), StoryCharacterSchema),
  page: z.object({
    pageNumber: z.number().int().min(1),
    text: z.string().optional(),
    beats: z.array(IllustrationBeatSchema).optional(),
  }),
});

export type StorySlice = z.infer<typeof StorySliceSchema>;

/**
 * ImageGenerationResult: raw output from image generation API
 * Handles the various formats Replicate may return
 */
export const ImageGenerationResultSchema = z.union([
  // Array of string URLs
  z.array(z.string().url()).min(1),
  // Array of FileOutput objects with url() method - validated as objects with url
  z.array(z.object({ url: z.function().returns(z.string()) })).min(1),
  // Single string URL
  z.string().url(),
]);

export type ImageGenerationResult = z.infer<typeof ImageGenerationResultSchema>;

