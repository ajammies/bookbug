// ArtDirectorAgent literally acts as art director. It reads the writer's draft and
// briefs the illustrator with page-by-page visual goals.
import { IllustrationPlan, IllustrationPlanSchema, StoryDraft } from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '@bookbug/shared';
import { run, type AgentProvider } from './providers/agentProvider.js';
import { ClaudeAgentProvider } from './providers/claudeAgentProvider.js';
import { z } from 'zod';

export class ArtDirectorAgent {
  // The planner bridges narrative beats and future renders, so its output
  // keeps track of consistent style guidance for every visual node.
  private readonly agent: AgentProvider<ImagePrompt>;
  private readonly log: typeof defaultLogger;

  constructor(log: typeof defaultLogger = defaultLogger) {
    this.log = log;
    this.agent = this.createAdapter();
  }

  async plan(draft: StoryDraft): Promise<IllustrationPlan> {
    const pages = await Promise.all(
      draft.pages.map(async (page) => {
        const stylePreset = draft.styleNotes || draft.characters[0]?.traits.join(', ') || DEFAULT_IMAGE_STYLE;
        const response = await run(
          this.agent,
          buildArtDirectorPrompt({
            storyTitle: draft.title,
            pageSummary: page.summary,
            imageConcept: page.imageConcept,
            preferredStyle: stylePreset,
          })
        );

        const parsed = response.finalOutput as ImagePrompt;

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

  private createAdapter(): AgentProvider<ImagePrompt> {
    const instructions = ART_DIRECTOR_SYSTEM_INSTRUCTIONS;
    return new ClaudeAgentProvider<ImagePrompt>({
      name: 'BookBug Art Director',
      instructions,
      model: CLAUDE_ART_DIRECTOR_MODEL,
      outputType: IMAGE_PROMPT_SCHEMA,
      maxOutputTokens: 1024,
    });
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

const ART_DIRECTOR_SYSTEM_INSTRUCTIONS = `You are the BookBug Art Director. When you receive a request, respond with JSON containing prompt, negativePrompt (optional), and stylePreset. Maintain visual continuity, highlight emotional beats, and keep outputs kid-friendly.`;

const CLAUDE_ART_DIRECTOR_MODEL = 'claude-3-5-sonnet-20241022';

function buildArtDirectorPrompt(context: ArtDirectorContext): string {
  const preferredStyle = context.preferredStyle ? `Preferred style cues: ${context.preferredStyle}` : 'Preferred style cues: none provided';
  return `Story title: ${context.storyTitle}
Page summary: ${context.pageSummary}
Author concept: ${context.imageConcept}
${preferredStyle}

${IMAGE_STYLE_GUIDANCE}`;
}

const IMAGE_STYLE_GUIDANCE = `Image Generation Guidelines

- Ensure characters remain consistent with their described traits (hair, clothing, accessories).
- Highlight emotional beats using color, lighting, and composition.
- Keep backgrounds aligned with the story setting and time of day.
- Avoid text or typography in the image unless explicitly requested.
- Keep imagery wholesome, age-appropriate, and inviting for children.`;
