// IllustratorAgent is the production floor. It consumes art director briefs and
// outputs tangible image metadata while logging any failures for the org.
import {
  IllustrationPlan,
  ImageRenderResponseSchema,
  type ImageRenderResult,
  RenderedImage,
  RenderedImageSchema,
} from '../protocols/storyProtocols.js';
import { ImageStore } from '../utils/imageStore.js';
import { logger as defaultLogger } from '../shared/logger.js';
import type { AgentProvider } from './providers/agentProvider.js';
import { ClaudeAgentProvider } from './providers/claudeAgentProvider.js';

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
      const response = await this.agent.run(IllustratorAgent.buildPrompt(page.prompt, page.stylePreset));

      const parsed = response.finalOutput as ImageRenderResult;
      if (parsed.status !== 'success' || !parsed.imageUrl) {
        this.log.error({ page: page.pageNumber, error: parsed.errorMessage }, 'Illustrator agent failed to produce image');
        throw new Error(`Image generation failed for page ${page.pageNumber}`);
      }

      const render: RenderedImage = RenderedImageSchema.parse({
        pageNumber: page.pageNumber,
        imagePath: parsed.imageUrl,
        prompt: page.prompt,
        stylePreset: page.stylePreset,
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
    return new ClaudeAgentProvider<ImageRenderResult>({
      name: 'BookBug Illustrator',
      instructions: IllustratorAgent.systemInstructions(),
      model: IllustratorAgent.CLAUDE_MODEL,
      outputType: ImageRenderResponseSchema,
      maxOutputTokens: 1024,
    });
  }

  private static buildPrompt(prompt: string, stylePreset?: string): string {
    const styleText = stylePreset ? `Style preset: ${stylePreset}` : 'Style preset: default storybook';
    return `${styleText}
Primary prompt:
${prompt}`;
  }

  private static systemInstructions(): string {
    return 'You are the BookBug Illustrator. Decide whether the description can be rendered and respond with JSON containing status, optional imageUrl, optional seed, and optional errorMessage.';
  }

  private static readonly CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
}
