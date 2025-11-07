// IllustratorAgent is the production floor. It consumes art director briefs and
// outputs tangible image metadata while logging any failures for the org.
import { IllustrationPlan, RenderedImage, RenderedImageSchema } from '../protocols/storyProtocols.js';
import { ImageStore } from '../utils/imageStore.js';
import { logger as defaultLogger } from '@bookbug/shared';
import { run, type AgentProvider } from './providers/agentProvider.js';
import { ClaudeAgentProvider } from './providers/claudeAgentProvider.js';
import { z } from 'zod';

export class IllustratorAgent {
  // Renderer relies on planner input plus the shared ImageStore to leave
  // artifacts other systems can reuse (web preview, print, etc.).
  private readonly agent: AgentProvider<ImageRenderResult>;
  private readonly log: typeof defaultLogger;

  constructor(log: typeof defaultLogger = defaultLogger) {
    this.log = log;
    this.agent = this.createAdapter();
  }

  async render(storyTitle: string, plan: IllustrationPlan, imageStore: ImageStore): Promise<RenderedImage[]> {
    const renders: RenderedImage[] = [];

    for (const page of plan.pages) {
      const response = await run(
        this.agent,
        buildIllustratorPrompt({ prompt: page.prompt, stylePreset: page.stylePreset })
      );

      const parsed = response.finalOutput as ImageRenderResult | undefined;
      if (!parsed || parsed.status !== 'success' || !parsed.imageUrl) {
        this.log.error({ page: page.pageNumber, error: parsed?.errorMessage }, 'Illustrator agent failed to produce image');
        throw new Error(`Image generation failed for page ${page.pageNumber}`);
      }

      const render: RenderedImage = RenderedImageSchema.parse({
        pageNumber: page.pageNumber,
        imagePath: parsed.imageUrl,
        prompt: page.prompt,
        stylePreset: page.stylePreset,
        provider: 'openai-image',
        seed: parsed.seed,
        createdAt: new Date().toISOString(),
      });

      await imageStore.saveRender(storyTitle, render);
      renders.push(render);
    }

    this.log.info({ title: storyTitle, pages: renders.length }, 'Illustrator agent produced images');
    return renders;
  }

  private createAdapter(): AgentProvider<ImageRenderResult> {
    const instructions = ILLUSTRATOR_SYSTEM_INSTRUCTIONS;
    return new ClaudeAgentProvider<ImageRenderResult>({
      name: 'BookBug Illustrator',
      instructions,
      model: CLAUDE_ILLUSTRATOR_MODEL,
      outputType: IMAGE_RENDER_RESPONSE_SCHEMA,
      maxOutputTokens: 1024,
    });
  }
}

const IMAGE_RENDER_RESPONSE_SCHEMA = z.object({
  status: z.enum(['success', 'failed']),
  imageUrl: z.string().url().optional(),
  seed: z.number().int().optional(),
  errorMessage: z.string().optional(),
});

type ImageRenderResult = z.infer<typeof IMAGE_RENDER_RESPONSE_SCHEMA>;

const ILLUSTRATOR_SYSTEM_INSTRUCTIONS = `You are the BookBug Illustrator. When prompted, decide whether the description can be rendered. Respond with JSON containing status, optional imageUrl, optional seed, and optional errorMessage.`;

function buildIllustratorPrompt(context: { prompt: string; stylePreset?: string }): string {
  const styleText = context.stylePreset ? `Style preset: ${context.stylePreset}` : 'Style preset: default storybook';
  return `${styleText}
Primary prompt:
${context.prompt}`;
}

const CLAUDE_ILLUSTRATOR_MODEL = 'claude-3-5-sonnet-20241022';
