// ArtDirectorAgent literally acts as art director. It reads the writer's draft and
// briefs the illustrator with page-by-page visual goals.
import { Agent, run } from '@openai/agents';
import { IllustrationPlan, IllustrationPlanSchema, StoryDraft } from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '@bookbug/shared';
import { AgentConfig } from './agentConfig.js';
import { z } from 'zod';

export interface ArtDirectorAgentConfig {
  model?: string;
  log?: typeof defaultLogger;
}

export class ArtDirectorAgent {
  // The planner bridges narrative beats and future renders, so its output
  // keeps track of consistent style guidance for every visual node.
  private readonly agent: Agent<ArtDirectorContext, typeof IMAGE_PROMPT_SCHEMA>;
  private readonly log: typeof defaultLogger;

  constructor({ model = AgentConfig.model('artDirector'), log = defaultLogger }: ArtDirectorAgentConfig = {}) {
    this.log = log;
    this.agent = new Agent({
      name: 'BookBug Art Director',
      instructions: ({ context }) => {
        if (!context) {
          throw new Error('Art director agent requires context');
        }
        return buildArtDirectorInstructions(context);
      },
      model,
      outputType: IMAGE_PROMPT_SCHEMA,
    });
  }

  async plan(draft: StoryDraft): Promise<IllustrationPlan> {
    const pages = await Promise.all(
      draft.pages.map(async (page) => {
        const stylePreset = draft.styleNotes || draft.characters[0]?.traits.join(', ') || DEFAULT_IMAGE_STYLE;
        const response = await run(
          this.agent,
          '',
          {
            context: {
              storyTitle: draft.title,
              pageSummary: page.summary,
              imageConcept: page.imageConcept,
              preferredStyle: stylePreset,
            },
          }
        );

        const parsed = response.finalOutput as ImagePrompt | undefined;
        if (!parsed) {
          throw new Error('Art director agent did not return structured prompt data');
        }

        return {
          pageNumber: page.pageNumber,
          prompt: parsed.prompt,
          negativePrompt: parsed.negativePrompt,
          stylePreset: parsed.stylePreset || stylePreset,
          aspectRatio: '3:4' as const,
        };
      })
    );

    const plan: IllustrationPlan = {
      storyTitle: draft.title,
      pages,
      globalStyle: draft.styleNotes || DEFAULT_IMAGE_STYLE,
    };

    const validated = IllustrationPlanSchema.parse(plan);
    this.log.info({ title: plan.storyTitle, pages: plan.pages.length }, 'Art director agent produced prompts');
    return validated;
  }
}

export const DEFAULT_IMAGE_STYLE = 'storybook-watercolor';

const IMAGE_PROMPT_SCHEMA = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  stylePreset: z.string().optional(),
});

type ArtDirectorContext = {
  storyTitle: string;
  pageSummary: string;
  imageConcept: string;
  preferredStyle?: string;
};

type ImagePrompt = z.infer<typeof IMAGE_PROMPT_SCHEMA>;

function buildArtDirectorInstructions(context: ArtDirectorContext): string {
  const preferredStyle = context.preferredStyle ? `\nPreferred style from user/story context: ${context.preferredStyle}` : '';
  return `Story Title: ${context.storyTitle}

Story Page Summary:
${context.pageSummary}

Author Image Concept:
${context.imageConcept}

${IMAGE_STYLE_GUIDANCE}

Respond with a single JSON object:
{
  "prompt": "<detailed image prompt>",
  "negativePrompt": "<optional negatives>",
  "stylePreset": "<style instructions>"
}

If the user provided a preferred style, integrate it naturally. Provide concrete visual details (lighting, mood, composition).${preferredStyle}`;
}

const IMAGE_STYLE_GUIDANCE = `Image Generation Guidelines

- Ensure characters remain consistent with their described traits (hair, clothing, accessories).
- Highlight emotional beats using color, lighting, and composition.
- Keep backgrounds aligned with the story setting and time of day.
- Avoid text or typography in the image unless explicitly requested.
- Keep imagery wholesome, age-appropriate, and inviting for children.`;
