import { z } from "zod";

/**
 * ============================================================
 * 1. DOMAIN BASICS (shared across pipeline)
 * ============================================================
 */

// AgeRange: shared age targeting across the whole system.
export const AgeRangeSchema = z
  .object({
    min: z.number().int().min(2).max(12), // minimum reader age
    max: z.number().int().min(2).max(12), // maximum reader age
  })
  .refine((range) => range.min <= range.max, {
    message: "ageRange.min must be <= ageRange.max",
    path: ["max"],
  });

export type AgeRange = z.infer<typeof AgeRangeSchema>;

// StoryCharacter: initial character intake, later enriched.
export const StoryCharacterSchema = z.object({
  name: z.string().min(1),               // character name
  description: z.string().min(1),        // short description
  role: z.string().optional(),           // e.g. "protagonist", "mentor"
  traits: z.array(z.string().min(1)).default([]), // tags like "brave", "shy"
  notes: z.array(z.string().min(1)).default([]), // any custom user note to include
});

export type StoryCharacter = z.infer<typeof StoryCharacterSchema>;


/**
 * ============================================================
 * 2. BOOK BUILDER → StoryBrief (requirements / intent)
 * ============================================================
 */

// High-level requirements that BookBuilderAgent collects from user.
export const StoryBriefSchema = z.object({
  title: z.string().min(1),                             // working title
  storyArc: z.string().min(1),                          // core theme
  setting: z.string().min(1),                           // e.g. "underwater city"
  ageRange: AgeRangeSchema,                             // target reader age
  pageCount: z.number().int().min(8).max(32).default(24), // total pages
  characters: z.array(StoryCharacterSchema).min(1),     // cast at intake
  tone: z.string().optional(),                          // e.g. "whimsical", "gentle"
  moral: z.string().optional(),                         // optional explicit moral
  interests: z.array(z.string().min(1)).default([]),    // kid interests: "dinosaurs", "space"
  customInstructions: z.array(z.string().min(1)).default([]), // all custom instructions specified from the user, this could include things like style references, etc.
});

export type StoryBrief = z.infer<typeof StoryBriefSchema>;

export const StoryBlurbSchema = z.object({
  brief: StoryBriefSchema,
  plotBeats: z.array(z.string().min(1)).default([]),    // optional user-specified beats
  allowCreativeLiberty: z.boolean().default(true),      // how strictly to follow input
})

export type StoryBlurb = z.infer<typeof StoryBlurbSchema>;

// Example StoryBrief (what BookBuilderAgent would output).
export const exampleStoryBrief: StoryBrief = {
  title: "Otto and the City of Lights",
  storyArc: "Finding courage in new places",
  tone: "warm and curious",
  setting: "a shimmering nighttime city",
  moral: "New places feel smaller once you explore them.",
  ageRange: { min: 4, max: 7 },
  characters: [
    {
      name: "Otto",
      description: "A small, thoughtful kid who's nervous about big cities.",
      role: "protagonist",
      traits: ["curious", "shy"],
      notes: ["Protagonist goal: To feel less scared of the huge city."],
    },
    {
      name: "Dad",
      description: "Otto's gentle, playful father.",
      role: "mentor",
      traits: ["supportive"],
      notes: [],
    },
  ],
  interests: ["cities", "lights", "adventures with dad"],
  pageCount: 24,
  customInstructions: ["soft watercolor", "nighttime glow", "For all the small explorers."],
};


/**
 * ============================================================
 * 3. AUTHOR → Manuscript (manuscript + page breakdown)
 * ============================================================
 */

// Individual manuscript pages (author's text-only output).
export const ManuscriptPageSchema = z.object({
  summary: z.string().min(1),                 // what happens on this page (1–2 sentences)
  text: z.string().min(1),                    // actual manuscript text
  imageConcept: z.string().min(1),            // high-level image description
});

export type ManuscriptPage = z.infer<typeof ManuscriptPageSchema>;

// Manuscript metadata (without pages, for embedding in Story).
export const ManuscriptMetaSchema = z.object({
  title: z.string().min(1),                             // final or near-final title
  logline: z.string().min(1),                           // 1-sentence story hook
  theme: z.string().min(1),                             // theme (should echo brief)
  setting: z.string().min(1),                           // major setting descriptor
  moral: z.string().optional(),                         // moral (if explicit)
  tone: z.string().optional(),                          // narrative tone
  styleNotes: z.string().optional(),                    // author notes about style, voice, rhythm
});

export type ManuscriptMeta = z.infer<typeof ManuscriptMetaSchema>;

// Full Manuscript: what AuthorAgent emits, Director consumes.
// Note: This is the intermediate format; Story uses a normalized version.
export const ManuscriptSchema = z.object({
  blurb: StoryBlurbSchema,                              // story blurb with brief, plot beats, creative liberty
  title: z.string().min(1),                             // final or near-final title
  logline: z.string().min(1),                           // 1-sentence story hook
  theme: z.string().min(1),                             // theme (should echo brief)
  setting: z.string().min(1),                           // major setting descriptor
  moral: z.string().optional(),                         // moral (if explicit)
  ageRange: AgeRangeSchema,                             // target age (copied/adjusted from brief)
  tone: z.string().optional(),                          // narrative tone
  styleNotes: z.string().optional(),                    // author notes about style, voice, rhythm
  characters: z.array(StoryCharacterSchema).min(1),     // enriched cast
  pages: z.array(ManuscriptPageSchema).min(1),          // per-page manuscript content
  pageCount: z.number().int().min(8).max(32),           // must match pages.length in practice
})
.refine((manuscript) => manuscript.pages.length === manuscript.pageCount, {
  message: "pages.length must equal pageCount",
  path: ["pages"],
});

export type Manuscript = z.infer<typeof ManuscriptSchema>;

// Example Manuscript.
export const exampleManuscript: Manuscript = {
  blurb: {
    brief: exampleStoryBrief,
    plotBeats: [
      "Otto arrives in the big city.",
      "The city feels overwhelming.",
      "Dad shows Otto small, cozy corners.",
      "Otto feels brave enough to explore.",
    ],
    allowCreativeLiberty: true,
  },
  title: "Otto and the City of Lights",
  logline: "A small boy explores a giant city with his dad and discovers it feels smaller with each shared adventure.",
  theme: "Finding courage in new places",
  setting: "a glowing, nighttime city full of tall buildings and cozy corners",
  moral: "New places feel smaller once you explore them together.",
  ageRange: { min: 4, max: 7 },
  tone: "warm, gently humorous",
  styleNotes: "Short, rhythmic sentences with repeated phrases like 'much, much bigger'.",
  characters: [
    {
      name: "Otto",
      description: "A small, thoughtful kid who's nervous about big cities.",
      role: "protagonist",
      traits: ["curious", "shy"],
      notes: ["Character arc: Otto goes from feeling tiny and overwhelmed to feeling brave and curious about the city."],
    },
    {
      name: "Dad",
      description: "Otto's gentle, playful father.",
      role: "mentor",
      traits: ["supportive"],
      notes: ["Character arc: Dad learns to let Otto lead the exploration by the end."],
    },
  ],
  pages: [
    {
      summary: "Otto and Dad arrive in the big city at night.",
      text: "The city was much, much bigger than Otto had imagined.",
      imageConcept: "A tiny Otto and Dad stepping out of a taxi into a sea of lights.",
    },
    {
      summary: "Otto feels small as the buildings loom overhead.",
      text: "Buildings leaned over him like giants, and lights blinked like a thousand curious eyes.",
      imageConcept: "Otto looking up at towering buildings, eyes wide.",
    },
    // ... more pages up to pageCount
  ],
  pageCount: 24,
};


/**
 * ============================================================
 * 4. DIRECTOR → Story (visual direction + complete story)
 * ============================================================
 *
 * This section defines the visual direction system including:
 * - Setting, lighting, color, mood, focal_hierarchy, atmosphere, materials, and constraints schemas
 * - ShotComposition DSL for cinematography and composition
 * - StoryBeat for narrative moments with visual instructions
 * - VisualStyleGuide for global visual style across the book
 * - StoryPage for individual pages with beats
 * - Story schema that connects everything together
 *
 * NORMALIZED STRUCTURE:
 * Story contains lookup tables for characters and manuscript pages.
 * Beats reference these by ID for conciseness while keeping the blob self-contained.
 *
 * Each style element (setting, lighting, color, mood, etc.) can be defined globally
 * and overridden per-shot via the ShotComposition.overrides system.
 */

// Shared style building blocks (full schemas + partial schemas for per-shot overrides).
export const LightingSchema = z.object({
  scheme: z.array(z.string().min(1)),               // "sunrise-soft", "rimlight"
  direction: z.array(z.string().min(1)),            // "back-left-sun"
  quality: z.string().optional(),                   // "very-soft"
  temperature_K: z.number().optional(),             // color temperature
  contrast_ratio: z.string().optional(),            // "gentle"
  volumetrics: z
    .object({
      godrays: z.string().optional(),
      ambient: z.string().optional(),
    })
    .optional(),
});

export const ColorScriptSchema = z.object({
  harmony: z.string().optional(),                   // e.g. "analogous-warm"
  palette: z.array(z.string().min(1)).default([]),  // hex or named colors
  accent_colors: z.array(z.string().min(1)).default([]),
  saturation_level: z.string().optional(),
  value_key: z.string().optional(),
});

export const MoodSchema = z.object({
  beat: z.string().optional(),                      // one-line narrative beat
  tone: z.array(z.string().min(1)).default([]),     // "harmonious", "cozy"
  sliders: z.record(z.number().min(0).max(1)).optional(), // normalized mood sliders
});

export const FocalHierarchySchema = z.object({
  priority: z.array(z.string().min(1)).default([]),               // ordered focus list (most to least important)
  min_visibility: z.record(z.array(z.string().min(1))).optional(), // required visible parts per subject
  no_crop: z.array(z.string().min(1)).default([]),                // elements that must not be cropped
  focus_plane: z.string().optional(),                             // focal plane subject id
});

export const AtmosphereFxSchema = z.object({
  fog: z
    .object({
      style_reference: z.string().optional(), // fog style: "smoke", "mist", "cloud", "haze"
      hue: z.string().optional(),             // fog color tint
      density: z.string().optional(),         // "light", "medium", "heavy"
      height: z.string().optional(),          // "ground-level", "mid-height", "high"
    })
    .optional(),
  bloom: z.string().optional(),               // bloom intensity: "subtle", "medium", "strong"
  lens_flare: z.string().optional(),          // lens flare style/intensity
  particles: z
    .object({
      type: z.string().optional(),            // "dust", "snow", "sparkles", "fireflies"
      density: z.string().optional(),         // "sparse", "moderate", "dense"
    })
    .optional(),
  dew: z.string().optional(),                 // dew/moisture effects
});

export const MaterialsMicrodetailSchema = z.object({
  microdetail_level: z.string().optional(),   // overall microdetail level: "low", "medium", "high"
  detail_budget: z
    .object({
      priority: z.array(z.string().min(1)).default([]),      // subjects/areas to prioritize detail
      deprioritize: z.array(z.string().min(1)).default([]),  // subjects/areas to simplify
    })
    .optional(),
});

export const ConstraintsSchema = z.object({
  negative: z.array(z.string().min(1)).default([]),        // negative prompts: things to avoid
  style_caps: z.record(z.string().min(1)).optional(),      // style caps: e.g. {"grain": "max-20%", "noise": "minimal"}
});

// Setting: shared setting/location/time descriptor used globally and per-beat.
export const SettingSchema = z.object({
  biome: z.string().optional(),                             // primary biome: "urban", "forest", "underwater"
  location: z.string().optional(),                          // specific location: "city_street", "park", "bedroom"
  detail_description: z.string().optional(),                // detailed setting description
  season: z.string().optional(),                            // season: "spring", "summer", "autumn", "winter"
  time_of_day: z.string().optional(),                       // time: "morning", "afternoon", "evening", "night"
  landmarks: z.array(z.string().min(1)).default([]),        // notable landmarks/features
  diegetic_lights: z.array(z.string().min(1)).default([]),  // light sources in scene: "streetlamps", "windows", "moon"
});

// Partial schemas allow per-shot overrides of global style settings.
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

// ShotComposition DSL: Defines the visual language for individual shots/illustrations.
// Includes size, angle, POV, composition, layout, staging, and cinematography.
// Overrides allow per-shot tweaks to global style settings.
export const ShotCompositionSchema = z.object({
  size: z.enum(["extreme_wide", "wide", "medium_wide", "medium", "medium_close", "close_up", "extreme_close_up", "macro_detail", "insert_object"]),
  angle: z.enum(["eye_level", "childs_eye", "high_angle", "birds_eye", "worms_eye", "low_angle_hero", "three_quarter_view", "profile_side", "dutch_tilt", "isometric_view"]),
  pov: z.enum(["objective_view", "character_pov", "over_shoulder", "follow_from_behind", "reaction_close", "crowd_pov", "threat_pov", "reflection_pov"]).optional(),
  composition: z.array(z.enum(["centered_hero", "thirds_composition", "symmetrical", "foreground_frame", "deep_space", "diagonal_composition", "negative_space", "silhouette", "shadow_play", "reflection_focus", "crowd_search"])).optional(),
  layout: z.enum(["full_bleed_single", "full_bleed_spread", "framed_illustration", "spot_illustration", "clustered_vignettes", "multi_panel", "progression_strip", "side_scroller_spread", "cutaway_cross_section", "dollhouse_view", "map_spread", "split_screen", "before_after", "zoom_sequence"]).optional(),
  staging: z
    .object({
      anchors: z.array(
          z.object({
            subject: z.string().min(1),   // subject identifier or description
            grid: z.string().min(1),      // rule-of-thirds grid location or shorthand
          })
        )
        .optional(),
      depth: z.object({
          fg: z.array(z.string().min(1)).optional(),  // foreground elements
          mg: z.array(z.string().min(1)).optional(),  // midground elements
          bg: z.array(z.string().min(1)).optional(),  // background elements
        })
        .optional(),
      negative_space: z.string().optional(), // low/medium/high; allows overrides
      leading_lines: z.string().optional(),  // description of guiding lines
    })
    .optional(),
  cinematography: z
    .object({
      focal_length_mm: z.number().optional(),
      aperture_f: z.number().optional(),
      dof: z.string().optional(),           // shallow/moderate/deep
      camera_height: z.string().optional(), // e.g. "seated-eye"
      movement: z.string().optional(),      // "slow-pan-out"
    })
    .optional(),
  overrides: z
    .object({
      lighting: LightingPartialSchema.optional(),
      color: ColorScriptPartialSchema.optional(),
      mood: MoodPartialSchema.optional(),
      focal_hierarchy: FocalHierarchyPartialSchema.optional(),
      atmosphere_fx: AtmosphereFxPartialSchema.optional(),
      materials_microdetail: MaterialsMicrodetailPartialSchema.optional(),
      constraints: ConstraintsPartialSchema.optional(),
    })
    .optional(), // per-shot tweaks to global art style
});

export type ShotComposition = z.infer<typeof ShotCompositionSchema>;

// BeatCharacter: concise character reference within a beat.
// References characters by id (key in Story.characters lookup table).
export const BeatCharacterSchema = z.object({
  id: z.string().min(1),                        // character id (key in Story.characters)
  expression: z.string().min(1),                // facial expression/emotion
  pose: z.string().min(1),                      // pose description and any props
  focus: z.enum(['primary', 'secondary', 'background']), // character's importance in shot
});

export type BeatCharacter = z.infer<typeof BeatCharacterSchema>;

// StoryBeat: one narrative moment + visual shot description.
// Each beat represents a single illustration with narrative context and visual direction.
export const StoryBeatSchema = z.object({
  order: z.number().int().min(1),          // global beat order across entire book
  purpose: z.enum(["setup", "build", "twist", "climax", "payoff", "button"]), // narrative purpose
  summary: z.string().min(1),              // what happens in this beat (1-2 sentences)
  emotion: z.string().min(1),              // emotional tone of the moment
  characters: z.array(BeatCharacterSchema).default([]), // characters present (refs to Story.characters)
  setting: SettingPartialSchema.optional(), // per-beat setting override (biome, location, time, etc.)
  shot: ShotCompositionSchema,             // complete visual direction for this shot
});

export type StoryBeat = z.infer<typeof StoryBeatSchema>;

// VisualStyleGuide: Global visual style applied across the entire book.
// Individual shots can override these settings via ShotComposition.overrides.
export const VisualStyleGuideSchema = z.object({
  art_direction: z.object({
    genre: z.array(z.string().min(1)).default([]),            // art genre: "anime", "lofi", "storybook"
    medium: z.array(z.string().min(1)).default([]),           // medium: "digital-illustration", "watercolor", "gouache"
    technique: z.array(z.string().min(1)).default([]),        // technique: "cel-shaded", "soft-brush", "lineart"
    style_strength: z.number().min(0).max(1).optional(),      // how strongly to push the style (0=subtle, 1=strong)
  }),
  setting: SettingSchema,                                     // global default setting (biome, time, location, etc.)
  lighting: LightingSchema.optional(),                        // global lighting setup
  color_script: ColorScriptSchema.optional(),                 // global color palette
  mood_narrative: MoodSchema.optional(),                      // overall narrative mood
  atmosphere_fx: AtmosphereFxSchema.optional(),               // atmospheric effects (fog, bloom, particles)
  materials_microdetail: MaterialsMicrodetailSchema.optional(), // material detail level
  constraints: ConstraintsSchema.optional(),                  // global constraints (negative prompts, style caps)
});

export type VisualStyleGuide = z.infer<typeof VisualStyleGuideSchema>;

// StoryPage: a single page with visual beats.
// Page number serves as the key for manuscript.pages lookup.
export const StoryPageSchema = z.object({
  pageNumber: z.number().int().min(1),                // page index (also key for manuscript.pages)
  beats: z.array(StoryBeatSchema).min(1),             // visual beats that happen on this page
});

export type StoryPage = z.infer<typeof StoryPageSchema>;

/**
 * Story: complete story ready for rendering (what DirectorAgent emits, Illustrator consumes).
 *
 * NORMALIZED STRUCTURE:
 * - characters: Record<id, StoryCharacter> - lookup table for all characters
 * - manuscript: { meta, pages: Record<pageNum, ManuscriptPage> } - lookup table for text
 * - pages: StoryPage[] - visual beats that reference the above by ID
 *
 * This structure is:
 * 1. Self-contained: all referenced data is in the blob
 * 2. Concise: no duplication of character/manuscript data
 * 3. Functional: immutable, serializable, no external lookups needed
 */
export const StorySchema = z.object({
  storyTitle: z.string().min(1),                                    // copy from manuscript
  ageRange: AgeRangeSchema,                                         // copy from manuscript
  characters: z.record(z.string(), StoryCharacterSchema),           // lookup table: id -> character
  manuscript: z.object({
    meta: ManuscriptMetaSchema,                                     // manuscript metadata
    pages: z.record(z.string(), ManuscriptPageSchema),              // lookup table: pageNum -> page content
  }),
  style: VisualStyleGuideSchema,                                    // global visual style guide
  pages: z.array(StoryPageSchema).min(1),                           // per-page visual plan with beats
});

export type Story = z.infer<typeof StorySchema>;

// Example Story (normalized structure).
export const exampleStory: Story = {
  storyTitle: "Otto and the City of Lights",
  ageRange: { min: 4, max: 7 },

  // Character lookup table (keyed by id)
  characters: {
    "otto": {
      name: "Otto",
      description: "A small, thoughtful kid who's nervous about big cities.",
      role: "protagonist",
      traits: ["curious", "shy"],
      notes: ["Character arc: Otto goes from feeling tiny and overwhelmed to feeling brave and curious about the city."],
    },
    "dad": {
      name: "Dad",
      description: "Otto's gentle, playful father.",
      role: "mentor",
      traits: ["supportive"],
      notes: ["Character arc: Dad learns to let Otto lead the exploration by the end."],
    },
  },

  // Manuscript lookup table (keyed by page number as string)
  manuscript: {
    meta: {
      title: "Otto and the City of Lights",
      logline: "A small boy explores a giant city with his dad and discovers it feels smaller with each shared adventure.",
      theme: "Finding courage in new places",
      setting: "a glowing, nighttime city full of tall buildings and cozy corners",
      moral: "New places feel smaller once you explore them together.",
      tone: "warm, gently humorous",
      styleNotes: "Short, rhythmic sentences with repeated phrases like 'much, much bigger'.",
    },
    pages: {
      "1": {
        summary: "Otto and Dad arrive in the big city at night.",
        text: "The city was much, much bigger than Otto had imagined.",
        imageConcept: "A tiny Otto and Dad stepping out of a taxi into a sea of lights.",
      },
      "2": {
        summary: "Otto feels small as the buildings loom overhead.",
        text: "Buildings leaned over him like giants, and lights blinked like a thousand curious eyes.",
        imageConcept: "Otto looking up at towering buildings, eyes wide.",
      },
      "3": {
        summary: "Dad points to a cozy corner café with warm light spilling onto the sidewalk.",
        text: "\"Let's start small,\" said Dad, pointing to a glowing café tucked between two buildings.",
        imageConcept: "Dad and Otto walking toward a warm, inviting café entrance.",
      },
    },
  },

  // Global visual style
  style: {
    art_direction: {
      genre: ["storybook", "contemporary"],
      medium: ["digital-illustration", "soft-brush"],
      technique: ["painterly", "atmospheric"],
      style_strength: 0.8,
    },
    setting: {
      biome: "urban",
      detail_description: "A modern city at night with glowing windows and warm street lighting",
      season: "autumn",
      time_of_day: "night",
      landmarks: ["tall buildings", "cozy cafes", "lit street corners"],
      diegetic_lights: ["window lights", "streetlamps", "neon signs", "headlights"],
    },
    lighting: {
      scheme: ["nighttime-warm", "urban-glow"],
      direction: ["ambient-multi-source", "soft-top"],
      quality: "soft",
      temperature_K: 3200,
      contrast_ratio: "gentle",
    },
    color_script: {
      harmony: "analogous-warm",
      palette: ["#1a1f3a", "#ffd89b", "#f4a460", "#2c3e6b"],
      accent_colors: ["#ffcc66", "#ff9a4d"],
      saturation_level: "medium",
      value_key: "low-key",
    },
    mood_narrative: {
      tone: ["cozy", "curious", "gently-adventurous"],
    },
    atmosphere_fx: {
      bloom: "medium",
      fog: {
        style_reference: "urban haze",
        hue: "warm amber",
        density: "light",
        height: "mid-height",
      },
    },
    materials_microdetail: {
      microdetail_level: "medium",
    },
    constraints: {
      negative: ["scary", "harsh shadows", "cold colors", "threatening"],
    },
  },

  // Pages with beats (reference characters and manuscript by ID)
  pages: [
    {
      pageNumber: 1,
      beats: [
        {
          order: 1,
          purpose: "setup",
          summary: "Otto and Dad arrive in the huge glowing city.",
          emotion: "small_but_curious",
          characters: [
            { id: "otto", expression: "wide-eyed and nervous", pose: "standing close to Dad, small backpack", focus: "primary" },
            { id: "dad", expression: "calm and reassuring smile", pose: "hand on Otto's shoulder, carrying suitcase", focus: "secondary" },
          ],
          setting: { location: "city_street" },
          shot: {
            size: "extreme_wide",
            angle: "childs_eye",
            pov: "objective_view",
            composition: ["negative_space", "deep_space"],
            layout: "full_bleed_spread",
            staging: {
              anchors: [{ subject: "otto", grid: "lower-center-third" }],
              depth: { fg: ["otto", "dad", "taxi"], mg: ["street", "pedestrians"], bg: ["buildings", "sky"] },
            },
            overrides: {
              atmosphere_fx: { bloom: "strong" },
            },
          },
        },
      ],
    },
    {
      pageNumber: 2,
      beats: [
        {
          order: 2,
          purpose: "build",
          summary: "Otto tilts his head back to see the tops of the towering buildings.",
          emotion: "overwhelmed_wonder",
          characters: [
            { id: "otto", expression: "awestruck, mouth slightly open", pose: "head tilted back, looking up", focus: "primary" },
          ],
          shot: {
            size: "medium",
            angle: "worms_eye",
            pov: "character_pov",
            layout: "full_bleed_single",
            staging: {
              depth: { fg: ["otto"], mg: ["lower building floors"], bg: ["upper floors", "glowing windows"] },
            },
          },
        },
      ],
    },
    {
      pageNumber: 3,
      beats: [
        {
          order: 3,
          purpose: "build",
          summary: "Dad guides Otto toward a small, welcoming café.",
          emotion: "comfort_emerging",
          characters: [
            { id: "otto", expression: "tentative hope", pose: "walking, holding Dad's hand", focus: "primary" },
            { id: "dad", expression: "encouraging smile", pose: "pointing toward café", focus: "secondary" },
          ],
          setting: { location: "city_street_near_cafe", landmarks: ["cozy corner café"] },
          shot: {
            size: "medium_wide",
            angle: "eye_level",
            layout: "full_bleed_single",
            staging: {
              anchors: [
                { subject: "otto", grid: "left-third" },
                { subject: "café", grid: "right-third" },
              ],
              depth: { fg: ["otto", "dad"], mg: ["café entrance"], bg: ["dark buildings"] },
            },
            overrides: {
              lighting: { scheme: ["café-warm-glow"] },
              atmosphere_fx: { bloom: "strong" },
            },
          },
        },
      ],
    },
  ],
};


/**
 * ============================================================
 * 5. ILLUSTRATOR → Book (final rendered book)
 * ============================================================
 */

// RenderedImage: a single generated image for a beat.
export const RenderedImageSchema = z.object({
  id: z.string().min(1),                             // image id
  pageNumber: z.number().int().min(1),               // page this image belongs to
  beatOrder: z.number().int().min(1).optional(),     // which beat this image came from (by order)
  url: z.string().url(),                             // storage URL
  width: z.number().int().positive(),                // px width
  height: z.number().int().positive(),               // px height
  mimeType: z.string().min(1),                       // e.g. "image/png"
  meta: z.record(z.unknown()).optional(),            // extra metadata (model, seed, etc.)
});

export type RenderedImage = z.infer<typeof RenderedImageSchema>;

// BookPage: a complete page with manuscript text and rendered image(s).
export const BookPageSchema = z.object({
  pageNumber: z.number().int().min(1),             // page index
  text: z.string().min(1),                         // manuscript text for this page
  images: z.array(RenderedImageSchema).min(1),     // rendered images for this page
});

export type BookPage = z.infer<typeof BookPageSchema>;

// Book: complete final book with all pages, text, and rendered images.
export const BookSchema = z.object({
  storyTitle: z.string().min(1),                   // book title
  ageRange: AgeRangeSchema,                        // target age range
  pages: z.array(BookPageSchema).min(1),           // complete pages with text and images
  meta: z.record(z.unknown()).optional(),          // book-level metadata (creation date, version, etc.)
});

export type Book = z.infer<typeof BookSchema>;

// Example RenderedImage.
export const exampleRenderedImage: RenderedImage = {
  id: "img_otto_city_page1_v1",
  pageNumber: 1,
  beatOrder: 1,
  url: "https://example.com/images/otto-city-page1.png",
  width: 2048,
  height: 1536,
  mimeType: "image/png",
  meta: {
    model: "sdxl-1.0",
    seed: 123456,
    promptVersion: "v1",
  },
};

// Example Book.
export const exampleBook: Book = {
  storyTitle: "Otto and the City of Lights",
  ageRange: { min: 4, max: 7 },
  pages: [
    {
      pageNumber: 1,
      text: "The city was much, much bigger than Otto had imagined.",
      images: [exampleRenderedImage],
    },
    // ... more pages
  ],
  meta: {
    createdAt: "2025-01-01T00:00:00Z",
    version: "1.0",
  },
};


/**
 * ============================================================
 * 6. EXECUTION FLOW DIAGRAM (typed agents)
 * ============================================================
 *
 * Conceptual pipeline for children's book generation:
 *
 *  BookBuilderAgent  →  AuthorAgent  →  DirectorAgent  →  IllustratorAgent
 *  (user prompt)        (Manuscript)    (Story)         (Book)
 *
 * Flow breakdown:
 * 1. BookBuilderAgent: Takes raw user prompt → StoryBrief
 *    - Extracts title, theme, characters, age range, custom instructions from natural language
 *
 * 2. AuthorAgent: Writes the manuscript → Manuscript
 *    - Expands brief into full manuscript with per-page text
 *    - Enriches characters with arc/development notes
 *
 * 3. DirectorAgent: Creates complete story → Story
 *    - Normalizes characters into lookup table (Story.characters)
 *    - Normalizes manuscript pages into lookup table (Story.manuscript.pages)
 *    - Breaks manuscript pages into StoryBeats (visual narrative moments)
 *    - Defines global VisualStyleGuide
 *    - Specifies ShotComposition for each beat (composition, lighting, setting, etc.)
 *    - Characters in beats reference the lookup table by id
 *
 * 4. IllustratorAgent: Generates final book → Book
 *    - Resolves character/manuscript references from lookup tables
 *    - Renders each beat using the visual specifications
 *    - Returns complete book with images and metadata
 */

// Generic agent shape: a function from Input to Output (async).
export type Agent<Input, Output> = (input: Input) => Promise<Output>;

// Each agent defined in terms of its concrete input/output types.
export type BookBuilderAgent = Agent<string, StoryBrief>; // Takes raw user prompt, produces StoryBrief
export type AuthorAgent = Agent<StoryBrief, Manuscript>;
export type DirectorAgent = Agent<Manuscript, Story>;
export type IllustratorAgent = Agent<Story, Book>;

// Example instance signatures (implementations would be your actual logic).
export const bookBuilderAgent: BookBuilderAgent = async (userPrompt) => {
  // ... build StoryBrief from raw user prompt ...
  return exampleStoryBrief;
};

export const authorAgent: AuthorAgent = async (brief) => {
  // ... expand brief into full Manuscript ...
  return exampleManuscript;
};

export const directorAgent: DirectorAgent = async (manuscript) => {
  // ... normalize characters and pages, create beats with shot compositions ...
  return exampleStory;
};

export const illustratorAgent: IllustratorAgent = async (story) => {
  // ... resolve references from lookup tables, generate images, return complete book ...
  return exampleBook;
};

// End-to-end pipeline executor example (fully typed).
export async function executePipeline(userPrompt: string): Promise<{
  brief: StoryBrief;
  manuscript: Manuscript;
  story: Story;
  book: Book;
}> {
  const brief = await bookBuilderAgent(userPrompt);     // string -> StoryBrief
  const manuscript = await authorAgent(brief);          // StoryBrief -> Manuscript
  const story = await directorAgent(manuscript);        // Manuscript -> Story
  const book = await illustratorAgent(story);           // Story -> Book

  return { brief, manuscript, story, book };
}

/**
 * ============================================================
 * HELPER FUNCTIONS (for resolving references)
 * ============================================================
 */

/**
 * Resolve a beat character reference to full character data.
 */
export function resolveCharacter(story: Story, beatChar: BeatCharacter): StoryCharacter & BeatCharacter {
  const character = story.characters[beatChar.id];
  if (!character) {
    throw new Error(`Character not found: ${beatChar.id}`);
  }
  return { ...character, ...beatChar };
}

/**
 * Resolve a page number to its manuscript content.
 */
export function resolveManuscriptPage(story: Story, pageNumber: number): ManuscriptPage {
  const page = story.manuscript.pages[String(pageNumber)];
  if (!page) {
    throw new Error(`Manuscript page not found: ${pageNumber}`);
  }
  return page;
}

/**
 * Get the manuscript text for a story page.
 */
export function getPageText(story: Story, pageNumber: number): string {
  return resolveManuscriptPage(story, pageNumber).text;
}

/**
 * ============================================================
 * ARCHITECTURE SUMMARY (class diagram view)
 * ============================================================
 *
 * Data structures and their relationships:
 *
 * StoryCharacter (domain model)
 *   - name, description, role, traits, notes[]
 *   - Used in: StoryBrief, Manuscript, Story.characters lookup
 *
 * StoryBrief (user requirements)
 *   - title, storyArc, setting, tone, moral
 *   - ageRange: AgeRange
 *   - characters: StoryCharacter[]
 *   - customInstructions[], interests[]
 *
 * Manuscript (text-only story - intermediate format)
 *   - title, logline, theme, setting, moral, tone
 *   - ageRange: AgeRange
 *   - characters: StoryCharacter[] (enriched with notes)
 *   - pages: ManuscriptPage[]
 *   - Each ManuscriptPage contains: summary, text, imageConcept
 *
 * Story (normalized, self-contained blob for rendering)
 *   - storyTitle, ageRange
 *   - characters: Record<id, StoryCharacter>  ← LOOKUP TABLE
 *   - manuscript: { meta, pages: Record<pageNum, ManuscriptPage> }  ← LOOKUP TABLE
 *   - style: VisualStyleGuide
 *   - pages: StoryPage[]
 *
 * StoryPage (complete page with visual beats)
 *   - pageNumber (also key for manuscript.pages lookup)
 *   - beats: StoryBeat[]
 *
 * StoryBeat (narrative moment + visual specification)
 *   - order, purpose (setup/build/twist/climax/payoff/button)
 *   - summary, emotion
 *   - characters[]: { id, expression, pose, focus }  ← References Story.characters
 *   - setting: partial override
 *   - shot: ShotComposition
 *
 * BeatCharacter (concise reference)
 *   - id (key in Story.characters)
 *   - expression, pose, focus
 *
 * Setting (shared setting descriptor)
 *   - biome, location, detail_description
 *   - season, time_of_day
 *   - landmarks, diegetic_lights
 *   - Used globally in VisualStyleGuide and per-shot in overrides
 *
 * VisualStyleGuide (global visual style)
 *   - art_direction: genre, medium, technique, style_strength
 *   - setting: Setting (global default)
 *   - lighting, color_script, mood_narrative
 *   - atmosphere_fx, materials_microdetail, constraints
 *
 * ShotComposition (per-shot visual direction)
 *   - size, angle, pov, composition, layout
 *   - staging: anchors, depth layers, negative_space
 *   - cinematography: focal_length, aperture, dof
 *   - overrides: lighting, color, mood, focal_hierarchy, atmosphere_fx, materials_microdetail, constraints
 *
 * Book (final rendered book)
 *   - storyTitle, ageRange
 *   - pages: BookPage[]
 *   - meta: {createdAt, version, ...}
 *
 * BookPage (complete page with text and images)
 *   - pageNumber, text
 *   - images: RenderedImage[]
 *
 * RenderedImage (single generated image)
 *   - id, pageNumber, beatOrder
 *   - url, width, height, mimeType
 *   - meta: {model, seed, promptVersion, ...}
 *
 * Data flow:
 *   StoryBrief → Manuscript → Story (normalized) → Book
 *
 * Key relationships:
 *   - Story.characters[id] contains full StoryCharacter definitions
 *   - Story.manuscript.pages[pageNum] contains manuscript text
 *   - StoryBeat.characters[].id references Story.characters
 *   - StoryPage.pageNumber is key for Story.manuscript.pages
 *   - ShotComposition.overrides partially override VisualStyleGuide globals
 *   - BookPage combines manuscript text with rendered images
 */
