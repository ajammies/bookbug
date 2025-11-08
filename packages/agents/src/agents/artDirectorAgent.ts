// ArtDirectorAgent literally acts as art director. It reads the writer's draft and
// briefs the illustrator with page-by-page visual goals.
import {
  IllustrationPlan,
  IllustrationPlanSchema,
  ImagePromptSchema,
  type ImagePrompt,
  StoryDraft,
} from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '../shared/logger.js';
import { run, type AgentProvider } from './providers/agentProvider.js';
import { ClaudeAgentProvider } from './providers/claudeAgentProvider.js';

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
        const stylePreset = draft.styleNotes || draft.characters[0]?.traits.join(', ') || ArtDirectorAgent.defaultImageStyle;
        const response = await run(
          this.agent,
          ArtDirectorAgent.buildPrompt(draft.title, page.summary, page.imageConcept, stylePreset)
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
      globalStyle: draft.styleNotes || ArtDirectorAgent.defaultImageStyle,
    };

    const validated = IllustrationPlanSchema.parse(plan);
    this.log.info({ title: plan.storyTitle, pages: plan.pages.length }, 'Art director agent produced prompts');
    return validated;
  }

  private createAdapter(): AgentProvider<ImagePrompt> {
    return new ClaudeAgentProvider<ImagePrompt>({
      name: 'BookBug Art Director',
      instructions: ArtDirectorAgent.systemInstructions(),
      model: ArtDirectorAgent.CLAUDE_MODEL,
      outputType: ImagePromptSchema,
      maxOutputTokens: 1024,
    });
  }

  private static systemInstructions(): string {
    return 'You are the BookBug Art Director. Respond with JSON containing prompt, negativePrompt (optional), and stylePreset. Maintain visual continuity, highlight emotional beats, and keep outputs kid-friendly.';
  }

  private static buildPrompt(
    storyTitle: string,
    pageSummary: string,
    imageConcept: string,
    preferredStyle?: string
  ): string {
    const styleLine = preferredStyle ? `Preferred style cues: ${preferredStyle}` : 'Preferred style cues: none provided';
    return `Story title: ${storyTitle}
Page summary: ${pageSummary}
Author concept: ${imageConcept}
${styleLine}

${ArtDirectorAgent.IMAGE_STYLE_GUIDANCE}`;
  }

  static get defaultImageStyle(): string {
    return ArtDirectorAgent.DEFAULT_IMAGE_STYLE;
  }

  private static readonly CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
  private static readonly DEFAULT_IMAGE_STYLE = 'storybook-watercolor';
  private static readonly IMAGE_STYLE_GUIDANCE = `Image Generation Guidelines

- Ensure characters remain consistent with their described traits (hair, clothing, accessories).
- Highlight emotional beats using color, lighting, and composition.
- Keep backgrounds aligned with the story setting and time of day.
- Avoid text or typography in the image unless explicitly requested.
- Keep imagery wholesome, age-appropriate, and inviting for children.`;
}

export const DEFAULT_IMAGE_STYLE = ArtDirectorAgent.defaultImageStyle;
