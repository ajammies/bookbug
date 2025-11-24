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
 * 3. AUTHOR → StoryDraft (manuscript + page breakdown)
 * ============================================================
 */

// Individual story pages (author’s output).
export const StoryPageSchema = z.object({
  blurb: StoryBlurbSchema,
  pageNumber: z.number().int().min(1),        // page index
  summary: z.string().min(1),                 // what happens on this page (1–2 sentences)
  text: z.string().min(1),                    // actual manuscript text
  imageConcept: z.string().min(1),            // high-level image description
});

export type StoryPage = z.infer<typeof StoryPageSchema>;



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
  characters: z.array(StoryCharacterSchema).min(1), // enriched cast
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
      pageNumber: 1,
      summary: "Otto and Dad arrive in the big city at night.",
      text: "The city was much, much bigger than Otto had imagined.",
      imageConcept: "A tiny Otto and Dad stepping out of a taxi into a sea of lights.",
      imagePrompt: "Nighttime city, small child and father stepping out of a taxi, glowing skyscrapers, warm colors.",
    },
    {
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
 * 4. ART DIRECTION → StoryBeat & ArtBible
 * ============================================================
 *
 * This section defines the visual direction system including:
 * - Lighting, color, mood, focal_hierarchy, atmosphere, materials, and constraints schemas
 * - ShotComposition DSL for cinematography and composition
 * - StoryBeat for narrative moments with visual instructions
 * - VisualStyleGuide for global visual style across the book
 * - ArtBible that connects beats to pages & story draft
 *
 * Each style element (lighting, color, mood, etc.) can be defined globally
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

// Partial schemas allow per-shot overrides of global style settings.
export const LightingPartialSchema = LightingSchema.partial();
export const ColorScriptPartialSchema = ColorScriptSchema.partial();
export const MoodPartialSchema = MoodSchema.partial();
export const FocalHierarchyPartialSchema = FocalHierarchySchema.partial();
export const AtmosphereFxPartialSchema = AtmosphereFxSchema.partial();
export const MaterialsMicrodetailPartialSchema = MaterialsMicrodetailSchema.partial();
export const ConstraintsPartialSchema = ConstraintsSchema.partial();

export type Lighting = z.infer<typeof LightingSchema>;
export type ColorScript = z.infer<typeof ColorScriptSchema>;
export type Mood = z.infer<typeof MoodSchema>;
export type FocalHierarchy = z.infer<typeof FocalHierarchySchema>;
export type AtmosphereFx = z.infer<typeof AtmosphereFxSchema>;
export type MaterialsMicrodetail = z.infer<typeof MaterialsMicrodetailSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;

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
            subject_id: z.string().min(1),
            grid: z.string().min(1), // rule-of-thirds grid location or shorthand
          })
        )
        .optional(),
      depth: z.object({
          fg: z.array(z.string().min(1)).optional(),
          mg: z.array(z.string().min(1)).optional(),
          bg: z.array(z.string().min(1)).optional(),
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

// StoryBeat: one narrative moment + visual shot description.
// Each beat represents a single illustration with narrative context and visual direction.
export const StoryBeatSchema = z.object({
  id: z.string(),                          // unique beat identifier
  order: z.number().int().min(1),          // global beat order across entire book
  page: z.number().int().min(1),           // which page this beat belongs to
  purpose: z.enum(["setup", "build", "twist", "climax", "payoff", "button"]), // narrative purpose
  summary: z.string(),                     // what happens in this beat (1-2 sentences)
  emotion: z.string(),                     // emotional tone of the moment
  text_snippet: z.string().optional(),     // corresponding manuscript text (if any)
  characters: z.array(z.object({
    id: z.string(),                        // character identifier (matches StoryCharacter.name)
    expression: z.string(),                // facial expression/emotion
    pose_and_props: z.string(),            // pose description and any props
    focus: z.enum(['primary', 'secondary', 'background']) // character's importance in shot
  })).default([]),                         // characters present in this beat
  location: z.string().optional(),         // location label (e.g. "city_street")
  time: z.string().optional(),             // time-of-day label (e.g. "night", "sunset")
  shot_composition: ShotCompositionSchema,             // complete visual direction for this shot
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
  characters: z.array(StoryCharacterSchema).default([]),      // character roster for the story
  setting: z.object({
    biome: z.string().optional(),                             // primary biome: "urban", "forest", "underwater"
    detail_description: z.string().optional(),                // detailed setting description
    season: z.string().optional(),                            // season: "spring", "summer", "autumn", "winter"
    time_of_day: z.string().optional(),                       // default time: "morning", "afternoon", "evening", "night"
    landmarks: z.array(z.string().min(1)).default([]),        // notable landmarks/features
    diegetic_lights: z.array(z.string().min(1)).default([]),  // light sources in scene: "streetlamps", "windows", "moon"
  }),
  lighting: LightingSchema.optional(),                        // global lighting setup
  color_script: ColorScriptSchema.optional(),                 // global color palette
  mood_narrative: MoodSchema.optional(),                      // overall narrative mood
  atmosphere_fx: AtmosphereFxSchema.optional(),               // atmospheric effects (fog, bloom, particles)
  materials_microdetail: MaterialsMicrodetailSchema.optional(), // material detail level
  constraints: ConstraintsSchema.optional(),                  // global constraints (negative prompts, style caps)
});

export type VisualStyleGuide = z.infer<typeof VisualStyleGuideSchema>;

// Plan for a *single page* of illustrations.
export const PageTreatmentSchema = z.object({
  pageNumber: z.number().int().min(1),                // page index
  storyPageRef: z.number().int().min(1),              // reference to StoryPage.pageNumber
  beats: z.array(StoryBeatSchema).min(1),             // beats that happen on this page
});

export type PageTreatment = z.infer<typeof PageTreatmentSchema>;

// Full ArtBible: what ArtDirectorAgent emits, Illustrator consumes.
export const ArtBibleSchema = z.object({
  storyTitle: z.string().min(1),                      // copy from draft
  storyId: z.string().optional(),                     // optional external id
  ageRange: AgeRangeSchema,                           // copy from draft
  pages: z.array(PageTreatmentSchema).min(1),         // per-page visual plan
});

export type ArtBible = z.infer<typeof ArtBibleSchema>;

// Example ArtBible (truncated).
export const exampleArtBible: ArtBible = {
  storyTitle: "Otto and the City of Lights",
  storyId: "otto-city-v1",
  ageRange: { min: 4, max: 7 },
  pages: [
    {
      pageNumber: 1,
      storyPageRef: 1,
      beats: [
        {
          id: "beat_001_opening",
          order: 1,
          page: 1,
          purpose: "setup",
          summary: "Otto and Dad arrive in the huge glowing city.",
          emotion: "small_but_curious",
          text_snippet: "The city was much, much bigger than Otto had imagined.",
          characters: [
            {
              id: "Otto",
              expression: "wide-eyed and nervous",
              pose_and_props: "standing close to Dad, small backpack",
              focus: "primary",
            },
            {
              id: "Dad",
              expression: "calm and reassuring smile",
              pose_and_props: "hand on Otto's shoulder, carrying suitcase",
              focus: "secondary",
            },
          ],
          location: "city_street",
          time: "night",
          shot_composition: {
            size: "extreme_wide",
            angle: "childs_eye",
            pov: "objective_view",
            composition: ["negative_space", "deep_space"],
            layout: "full_bleed_spread",
            overrides: {
              atmosphere_fx: {
                bloom: "strong",
                fog: {
                  style_reference: "urban haze",
                  density: "light",
                  hue: "warm amber",
                },
              },
            },
          },
        },
      ],
    },
    // ... other PageTreatment entries
  ],
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
 * Conceptual pipeline for children's book generation:
 *
 *  BookBuilderAgent  →  AuthorAgent  →  ArtDirectorAgent  →  IllustratorAgent
 *  (user intent)        (StoryDraft)    (ArtBible)          (RenderedImage[])
 *
 * Flow breakdown:
 * 1. BookBuilderAgent: Collects user requirements → StoryBrief
 *    - Gathers title, theme, characters, age range, custom instructions
 *
 * 2. AuthorAgent: Writes the story → StoryDraft
 *    - Expands brief into full manuscript with per-page text
 *    - Enriches characters with arc/development notes
 *
 * 3. ArtDirectorAgent: Creates visual plan → ArtBible
 *    - Breaks pages into StoryBeats (narrative moments)
 *    - Defines global VisualStyleGuide
 *    - Specifies ShotComposition for each beat (composition, lighting, etc.)
 *    - Characters in beats include expression, pose, and props
 *
 * 4. IllustratorAgent: Generates images → RenderedImage[]
 *    - Renders each beat using the visual specifications
 *    - Returns image metadata (URL, dimensions, generation params)
 */

// Generic agent shape: a function from Input to Output (async).
export type Agent<Input, Output> = (input: Input) => Promise<Output>;

// Each agent defined in terms of its concrete input/output types.
export type BookBuilderAgent = Agent<StoryBrief, StoryBrief>;
export type AuthorAgent = Agent<StoryBrief, StoryDraft>;
export type ArtDirectorAgent = Agent<StoryDraft, ArtBible>;
export type IllustratorAgent = Agent<ArtBible, RenderedImage[]>;

// Example instance signatures (implementations would be your actual logic).
export const bookBuilderAgent: BookBuilderAgent = async (input) => {
  // ... enrich and validate StoryBrief from user input ...
  return exampleStoryBrief;
};

export const authorAgent: AuthorAgent = async (brief) => {
  // ... expand brief into full StoryDraft ...
  return exampleStoryDraft;
};

export const artDirectorAgent: ArtDirectorAgent = async (draft) => {
  // ... map draft.pages to beats and shot compositions ...
  return exampleArtBible;
};

export const illustratorAgent: IllustratorAgent = async (artBible) => {
  // ... generate images for each page/beat ...
  return [exampleRenderedImage];
};

// End-to-end pipeline executor example (fully typed).
export async function executePipeline(brief: StoryBrief): Promise<{
  brief: StoryBrief;
  draft: StoryDraft;
  artBible: ArtBible;
  images: RenderedImage[];
}> {
  const enrichedBrief = await bookBuilderAgent(brief);  // StoryBrief -> StoryBrief (validated/enriched)
  const draft = await authorAgent(enrichedBrief);       // StoryBrief -> StoryDraft
  const artBible = await artDirectorAgent(draft);       // StoryDraft -> ArtBible
  const images = await illustratorAgent(artBible);      // ArtBible -> RenderedImage[]

  return { brief: enrichedBrief, draft, artBible, images };
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
 *   - Used in: StoryBrief, StoryDraft, VisualStyleGuide
 *
 * StoryBrief (user requirements)
 *   - title, storyArc, setting, tone, moral
 *   - ageRange: AgeRange
 *   - characters: StoryCharacter[]
 *   - customInstructions[], interests[]
 *
 * StoryDraft (manuscript)
 *   - title, logline, theme, setting, moral, tone
 *   - ageRange: AgeRange
 *   - characters: StoryCharacter[] (enriched with notes)
 *   - pages: StoryPage[]
 *   - Each StoryPage contains: pageNumber, summary, text, imageConcept, blurb
 *
 * VisualStyleGuide (global visual style)
 *   - art_direction: genre, medium, technique, style_strength
 *   - characters: StoryCharacter[]
 *   - setting: biome, season, time_of_day, landmarks
 *   - lighting, color_script, mood_narrative
 *   - atmosphere_fx, materials_microdetail, constraints
 *
 * ShotComposition (per-shot visual direction)
 *   - size, angle, pov, composition, layout
 *   - staging: anchors, depth layers, negative_space
 *   - cinematography: focal_length, aperture, dof
 *   - overrides: lighting, color, mood, focal_hierarchy, atmosphere_fx, materials_microdetail, constraints
 *
 * StoryBeat (narrative moment + visual specification)
 *   - id, order, page, purpose (setup/build/twist/climax/payoff/button)
 *   - summary, emotion, text_snippet
 *   - characters[]: {id, expression, pose_and_props, focus}
 *   - location, time
 *   - shot_composition: ShotComposition
 *
 * PageTreatment (single page plan)
 *   - pageNumber, storyPageRef
 *   - beats: StoryBeat[]
 *
 * ArtBible (complete visual plan)
 *   - storyTitle, storyId, ageRange
 *   - pages: PageTreatment[]
 *
 * RenderedImage (final output)
 *   - id, pageNumber, beatId
 *   - url, width, height, mimeType
 *   - meta: {model, seed, promptVersion, ...}
 *
 * Data flow:
 *   StoryBrief → StoryDraft → ArtBible → RenderedImage[]
 *
 * Key relationships:
 *   - StoryPage.blurb contains StoryBlurb (which contains StoryBrief)
 *   - StoryBeat.characters[].id references StoryCharacter.name
 *   - ShotComposition.overrides partially override VisualStyleGuide globals
 *   - RenderedImage.beatId links back to StoryBeat.id
 */
