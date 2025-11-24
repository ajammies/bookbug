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
  arc: z.string().optional(),            // character change or journey (optional everywhere)
});

export type StoryCharacter = z.infer<typeof StoryCharacterSchema>;


/**
 * ============================================================
 * 2. CONCIERGE → StoryBrief (requirements / intent)
 * ============================================================
 */

// High-level requirements that ConciergeAgent collects from user.
export const StoryBriefSchema = z.object({
  title: z.string().min(1),                             // working title
  theme: z.string().min(1),                             // core theme
  tone: z.string().optional(),                          // e.g. "whimsical", "gentle"
  setting: z.string().min(1),                           // e.g. "underwater city"
  moral: z.string().optional(),                         // optional explicit moral
  ageRange: AgeRangeSchema,                             // target reader age
  characters: z.array(StoryCharacterSchema).min(1),     // cast at intake
  protagonistGoal: z.string().optional(),               // main goal if known
  interests: z.array(z.string().min(1)).default([]),    // kid interests: "dinosaurs", "space"
  pageCount: z.number().int().min(8).max(32).default(24), // total pages
  plotBeats: z.array(z.string().min(1)).default([]),    // optional user-specified beats
  allowCreativeLiberty: z.boolean().default(true),      // how strictly to follow input
  writingStyleReferences: z.array(z.string().min(1)).default([]), // style refs / comps
  dedication: z.string().optional(),                    // optional dedication text
});

export type StoryBrief = z.infer<typeof StoryBriefSchema>;

// Example StoryBrief (what ConciergeAgent would output).
export const exampleStoryBrief: StoryBrief = {
  title: "Otto and the City of Lights",
  theme: "Finding courage in new places",
  tone: "warm and curious",
  setting: "a shimmering nighttime city",
  moral: "New places feel smaller once you explore them.",
  ageRange: { min: 4, max: 7 },
  characters: [
    {
      name: "Otto",
      description: "A small, thoughtful kid who’s nervous about big cities.",
      role: "protagonist",
      traits: ["curious", "shy"],
    },
    {
      name: "Dad",
      description: "Otto’s gentle, playful father.",
      role: "mentor",
      traits: ["supportive"],
    },
  ],
  protagonistGoal: "To feel less scared of the huge city.",
  interests: ["cities", "lights", "adventures with dad"],
  pageCount: 24,
  plotBeats: [
    "Otto arrives in the big city.",
    "The city feels overwhelming.",
    "Dad shows Otto small, cozy corners.",
    "Otto feels brave enough to explore.",
  ],
  allowCreativeLiberty: true,
  writingStyleReferences: ["soft watercolor", "nighttime glow"],
  dedication: "For all the small explorers.",
};


/**
 * ============================================================
 * 3. AUTHOR → StoryDraft (manuscript + page breakdown)
 * ============================================================
 */

// Narrative fragment reused by pages and beats.
const NarrativeBeatSchema = z.object({
  summary: z.string().min(1),                 // what happens (1–2 sentences)
  emotion: z.string().optional(),             // emotional tone
  time: z.string().optional(),                // time-of-day label
  location: z.string().optional(),            // location label
  text_snippet: z.string().optional(),        // link to manuscript text
});

// Individual story pages (author’s output).
export const StoryPageSchema = NarrativeBeatSchema.extend({
  pageNumber: z.number().int().min(1),        // page index
  text: z.string().min(1),                    // actual manuscript text
  imageConcept: z.string().min(1),            // high-level image description
  imagePrompt: z.string().min(1),             // model-facing prompt for image
});

export type StoryPage = z.infer<typeof StoryPageSchema>;

// Author enriches characters with arcs.
// Full StoryDraft: what AuthorAgent emits, ArtDirector consumes.
export const StoryDraftSchema = z.object({
  title: z.string().min(1),                             // final or near-final title
  logline: z.string().min(1),                           // 1-sentence story hook
  theme: z.string().min(1),                             // theme (should echo brief)
  setting: z.string().min(1),                           // major setting descriptor
  moral: z.string().optional(),                         // moral (if explicit)
  ageRange: AgeRangeSchema,                             // target age (copied/adjusted from brief)
  tone: z.string().optional(),                          // narrative tone
  styleNotes: z.string().optional(),                    // author notes about style, voice, rhythm
  characters: z.array(StoryCharacterSchema).min(1),     // enriched cast (arc optional within)
  pages: z.array(StoryPageSchema).min(1),               // per-page content
  pageCount: z.number().int().min(8).max(32),           // must match pages.length in practice
});

export type StoryDraft = z.infer<typeof StoryDraftSchema>;

// Example StoryDraft.
export const exampleStoryDraft: StoryDraft = {
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
      description: "A small, thoughtful kid who’s nervous about big cities.",
      role: "protagonist",
      traits: ["curious", "shy"],
      arc: "Otto goes from feeling tiny and overwhelmed to feeling brave and curious about the city.",
    },
    {
      name: "Dad",
      description: "Otto’s gentle, playful father.",
      role: "mentor",
      traits: ["supportive"],
      arc: "Dad learns to let Otto lead the exploration by the end.",
    },
  ],
  pages: [
    {
      pageNumber: 1,
      summary: "Otto and Dad arrive in the big city at night.",
      text: "The city was much, much bigger than Otto had imagined.",
      imageConcept: "A tiny Otto and Dad stepping out of a taxi into a sea of lights.",
      imagePrompt: "Nighttime city, small child and father stepping out of a taxi, glowing skyscrapers, warm colors.",
    },
    {
      pageNumber: 2,
      summary: "Otto feels small as the buildings loom overhead.",
      text: "Buildings leaned over him like giants, and lights blinked like a thousand curious eyes.",
      imageConcept: "Otto looking up at towering buildings, eyes wide.",
      imagePrompt: "Child in city street, worm's eye view of tall lit buildings, atmospheric, gentle not scary.",
    },
    // ... more pages up to pageCount
  ],
  pageCount: 24,
};


/**
 * ============================================================
 * 4. ART DIRECTION → StoryBeat & IllustrationPlan
 * ============================================================
 *
 * We reuse the StoryBeat & ShotStyle DSL from the previous file.
 * Here, we plug it into a higher-level IllustrationPlan that
 * connects beats to pages & story draft content.
 */

// --- Assume these are imported from your visual DSL module ---
// import { storyBeatSchema, StoryBeat } from "./visual-storybeat";

// For clarity, repeat minimal types here (could be imported instead).
export const storyRoleEnum = z.enum(["setup", "build", "twist", "climax", "payoff", "button"]);

export type StoryRole = z.infer<typeof storyRoleEnum>;

// Shared style building blocks (full) + partials for overrides.
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

export const FocusMapSchema = z.object({
  priority: z.array(z.string().min(1)).default([]),               // ordered focus list
  min_visibility: z.record(z.array(z.string().min(1))).optional(), // required visible parts
  no_crop: z.array(z.string().min(1)).default([]),                // elements that must not be cropped
  focus_plane: z.string().optional(),                             // focal plane subject id
});

export const LightingPartialSchema = LightingSchema.partial();
export const ColorScriptPartialSchema = ColorScriptSchema.partial();
export const MoodPartialSchema = MoodSchema.partial();
export const FocusPartialSchema = FocusMapSchema.partial();

export type Lighting = z.infer<typeof LightingSchema>;
export type ColorScript = z.infer<typeof ColorScriptSchema>;
export type Mood = z.infer<typeof MoodSchema>;
export type FocusMap = z.infer<typeof FocusMapSchema>;

// In real code, import shotStyleSchema from visual DSL file.
const StagingSchema = z.object({
  anchors: z
    .array(
      z.object({
        subject_id: z.string().min(1),
        grid: z.string().min(1), // rule-of-thirds grid location or shorthand
      })
    )
    .optional(),
  depth: z
    .object({
      fg: z.array(z.string().min(1)).optional(),
      mg: z.array(z.string().min(1)).optional(),
      bg: z.array(z.string().min(1)).optional(),
    })
    .optional(),
  negative_space: z.string().optional(), // low/medium/high; allows overrides
  leading_lines: z.string().optional(),  // description of guiding lines
});

export type Staging = z.infer<typeof StagingSchema>;

export const shotStyleSchema = z.object({
  size: z.enum(["extreme_wide", "wide", "medium_wide", "medium", "medium_close", "close_up", "extreme_close_up", "macro_detail", "insert_object"]),
  angle: z.enum(["eye_level", "childs_eye", "high_angle", "birds_eye", "worms_eye", "low_angle_hero", "three_quarter_view", "profile_side", "dutch_tilt", "isometric_view"]),
  pov: z.enum(["objective_view", "character_pov", "over_shoulder", "follow_from_behind", "reaction_close", "crowd_pov", "threat_pov", "reflection_pov"]).optional(),
  composition: z.array(z.enum(["centered_hero", "thirds_composition", "symmetrical", "foreground_frame", "deep_space", "diagonal_composition", "negative_space", "silhouette", "shadow_play", "reflection_focus", "crowd_search"])).optional(),
  layout: z.enum(["full_bleed_single", "full_bleed_spread", "framed_illustration", "spot_illustration", "clustered_vignettes", "multi_panel", "progression_strip", "side_scroller_spread", "cutaway_cross_section", "dollhouse_view", "map_spread", "split_screen", "before_after", "zoom_sequence"]).optional(),
  presets: z.array(z.string().min(1)).optional(), // references to predefined partial shot templates
  staging: StagingSchema.optional(),
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
      focus: FocusPartialSchema.optional(),
    })
    .optional(), // per-shot tweaks to global art style
});

export type ShotStyle = z.infer<typeof shotStyleSchema>;

// StoryBeat: one narrative moment + visual shot description.
export const storyBeatSchema = NarrativeBeatSchema.extend({
  id: z.string(),                          // beat id
  page: z.number().int().min(1),           // which page it belongs to
  order: z.number().int().min(1),          // global beat order
  role: storyRoleEnum,                     // setup / build / etc.
  focus_character: z.string().optional().nullable(), // POV/primary character
  shot_style: shotStyleSchema,             // visual DSL
});

export type StoryBeat = z.infer<typeof storyBeatSchema>;

export const CharacterStyleSchema = z.object({
  id: z.string().min(1),                                // subject/character handle
  role: z.enum(["primary", "secondary", "background"]).optional(),
  archetype: z.string().optional(),                     // e.g. "wise-fatherly"
  species: z.string().optional(),                       // taxonomy or shorthand
  traits: z.array(z.string().min(1)).default([]),       // descriptors: "friendly", "elderly"
  pose: z.string().optional(),                          // canonical/default pose
  gaze: z.string().optional(),                          // gaze direction/quality
  props: z.array(z.string().min(1)).default([]),        // required props
  count: z.string().optional(),                         // numeric or qualitative count
  scale_vs_frame: z.string().optional(),                // "dominant", "small", etc.
  layer: z.string().optional(),                         // foreground/midground/background
  must_show: z.array(z.string().min(1)).default([]),    // required visible parts
  material_profile: z.array(z.string().min(1)).optional(), // materials shorthand
});

export type CharacterStyle = z.infer<typeof CharacterStyleSchema>;

export const IllustrationStyleSchema = z.object({
  art_direction: z.object({
    genre: z.array(z.string().min(1)).default([]),            // e.g. "anime", "lofi"
    medium: z.array(z.string().min(1)).default([]),           // e.g. "digital-illustration"
    technique: z.array(z.string().min(1)).default([]),        // e.g. "cel-shaded"
    influences: z.array(z.string().min(1)).default([]),       // e.g. "cozy-slice-of-life"
    style_strength: z.number().min(0).max(1).optional(),      // how strongly to push the style
  }),
  characters: z.array(CharacterStyleSchema).default([]),
  setting: z.object({
    biome: z.string().optional(),                             // e.g. "enchanted-forest"
    micro_habitat: z.string().optional(),                     // e.g. "mossy-clearing"
    season: z.string().optional(),
    time_of_day: z.string().optional(),
    landmarks: z.array(z.string().min(1)).default([]),        // notable features
    diegetic_lights: z.array(z.string().min(1)).default([]),  // light sources in scene
  }),
  lighting: LightingSchema.optional(),
  color_script: ColorScriptSchema.optional(),
  mood_narrative: MoodSchema.optional(),
  atmosphere_fx: z
    .object({
      fog: z
        .object({
          hue: z.string().optional(),
          density: z.string().optional(),
          height: z.string().optional(),
        })
        .optional(),
      bloom: z.string().optional(),
      lens_flare: z.string().optional(),
      particles: z
        .object({
          type: z.string().optional(),
          density: z.string().optional(),
        })
        .optional(),
      dew: z.string().optional(),
    })
    .optional(),
  materials_microdetail: z
    .object({
      microdetail_level: z.string().optional(),
      detail_budget: z
        .object({
          priority: z.array(z.string().min(1)).default([]),
          deprioritize: z.array(z.string().min(1)).default([]),
        })
        .optional(),
    })
    .optional(),
  constraints: z
    .object({
      negative: z.array(z.string().min(1)).default([]),        // avoid list
      style_caps: z.record(z.string().min(1)).optional(),      // caps like grain/noise
    })
    .optional(),
});

export type IllustrationStyle = z.infer<typeof IllustrationStyleSchema>;

// Plan for a *single page* of illustrations.
export const IllustrationPagePlanSchema = z.object({
  pageNumber: z.number().int().min(1),                // page index
  storyPageRef: z.number().int().min(1),              // reference to StoryPage.pageNumber
  beats: z.array(storyBeatSchema).min(1),             // beats that happen on this page
});

export type IllustrationPagePlan = z.infer<typeof IllustrationPagePlanSchema>;

// Full IllustrationPlan: what ArtDirectorAgent emits, Illustrator consumes.
export const IllustrationPlanSchema = z.object({
  storyTitle: z.string().min(1),                      // copy from draft
  storyId: z.string().optional(),                     // optional external id
  ageRange: AgeRangeSchema,                           // copy from draft
  pageCount: z.number().int().min(8).max(32),         // must match draft.pageCount
  style: IllustrationStyleSchema,                     // required global style
  pages: z.array(IllustrationPagePlanSchema).min(1),  // per-page visual plan
});

export type IllustrationPlan = z.infer<typeof IllustrationPlanSchema>;

// Example IllustrationPlan (truncated).
export const exampleIllustrationPlan: IllustrationPlan = {
  storyTitle: "Otto and the City of Lights",
  storyId: "otto-city-v1",
  ageRange: { min: 4, max: 7 },
  pageCount: 24,
  pages: [
    {
      pageNumber: 1,
      storyPageRef: 1,
      beats: [
        {
          id: "beat_001_opening",
          page: 1,
          order: 1,
          role: "setup",
          focus_character: "Otto",
          location: "city_street",
          time: "night",
          summary: "Otto and Dad arrive in the huge glowing city.",
          emotion: "small_but_curious",
          text_snippet: "The city was much, much bigger than Otto had imagined.",
          shot_style: {
            size: "extreme_wide",
            angle: "childs_eye",
            pov: "objective_view",
            composition: ["negative_space", "deep_space"],
            layout: "full_bleed_spread",
            archetype: ["tiny_in_big_world"],
          },
        },
      ],
    },
    // ... other IllustrationPagePlan entries
  ],
  globalStyleNotes: "Soft edges, painterly light bloom, nighttime palette with warm windows.",
};


/**
 * ============================================================
 * 5. ILLUSTRATOR → RenderedImage
 * ============================================================
 */

export const RenderedImageSchema = z.object({
  id: z.string(),                                  // image id
  pageNumber: z.number().int().min(1),             // page this image belongs to
  beatId: z.string().optional(),                   // which beat this image came from (if 1:1)
  url: z.string().url(),                           // storage URL
  width: z.number().int().positive(),              // px width
  height: z.number().int().positive(),             // px height
  mimeType: z.string().min(1),                     // e.g. "image/png"
  meta: z.record(z.unknown()).optional(),          // extra metadata (model, seed, etc.)
});

export type RenderedImage = z.infer<typeof RenderedImageSchema>;

// Example RenderedImage.
export const exampleRenderedImage: RenderedImage = {
  id: "img_otto_city_page1_v1",
  pageNumber: 1,
  beatId: "beat_001_opening",
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


/**
 * ============================================================
 * 6. EXECUTION FLOW DIAGRAM (typed agents)
 * ============================================================
 *
 * Conceptual pipeline:
 *
 *  ConciergeAgent  ->  AuthorAgent  ->  ArtDirectorAgent  ->  IllustratorAgent
 *  (user intent)       (StoryDraft)     (IllustrationPlan)   (RenderedImage[])
 */

// Generic agent shape: a function from Input to Output (async).
export type Agent<Input, Output> = (input: Input) => Promise<Output>;

// Input type for ConciergeAgent (what comes directly from the user/UI).
export interface ConciergeRequest {
  rawPrompt: string;                         // user’s freeform request
  preferredAgeRange?: AgeRange;             // optional hint
  preferredPageCount?: number;              // optional hint
  interests?: string[];                     // optional tags
}

// Each agent defined in terms of its concrete input/output types.
export type ConciergeAgent = Agent<ConciergeRequest, StoryBrief>;
export type AuthorAgent = Agent<StoryBrief, StoryDraft>;
export type ArtDirectorAgent = Agent<StoryDraft, IllustrationPlan>;
export type IllustratorAgent = Agent<IllustrationPlan, RenderedImage[]>;

// Example instance signatures (implementations would be your actual logic).
export const conciergeAgent: ConciergeAgent = async (input) => {
  // ... build a StoryBrief from ConciergeRequest ...
  return exampleStoryBrief;
};

export const authorAgent: AuthorAgent = async (brief) => {
  // ... expand brief into full StoryDraft ...
  return exampleStoryDraft;
};

export const artDirectorAgent: ArtDirectorAgent = async (draft) => {
  // ... map draft.pages to beats and shot styles ...
  return exampleIllustrationPlan;
};

export const illustratorAgent: IllustratorAgent = async (plan) => {
  // ... generate images for each page/beat ...
  return [exampleRenderedImage];
};

// End-to-end pipeline executor example (fully typed).
export async function executePipeline(request: ConciergeRequest): Promise<{
  brief: StoryBrief;
  draft: StoryDraft;
  illustrationPlan: IllustrationPlan;
  images: RenderedImage[];
}> {
  const brief = await conciergeAgent(request);           // ConciergeRequest -> StoryBrief
  const draft = await authorAgent(brief);               // StoryBrief -> StoryDraft
  const illustrationPlan = await artDirectorAgent(draft); // StoryDraft -> IllustrationPlan
  const images = await illustratorAgent(illustrationPlan); // IllustrationPlan -> RenderedImage[]

  return { brief, draft, illustrationPlan, images };
}

/**
 * In “class diagram” terms (expressed in TS):
 *
 * StoryBrief
 *   - ageRange: AgeRange
 *   - characters: StoryCharacter[]
 *
 * StoryDraft
 *   - ageRange: AgeRange
 *   - characters: StoryCharacterWithArc[]
 *   - pages: StoryPage[]
 *
 * IllustrationPlan
 *   - pages: IllustrationPagePlan[]
 *       - beats: StoryBeat[]
 *
 * RenderedImage
 *   - pageNumber, beatId (link back to IllustrationPlan / StoryBeat)
 *
 * And the flow of objects is:
 *   ConciergeRequest -> StoryBrief -> StoryDraft -> IllustrationPlan -> RenderedImage[]
 */
