// IllustratorAgent is the production floor. It consumes art director briefs and
// outputs tangible image metadata while logging any failures for the org.
import { Agent, run } from '@openai/agents';
import { RenderedImageSchema } from '../protocols/storyProtocols.js';
import { logger as defaultLogger } from '@bookbug/shared';
import { AgentConfig } from './agentConfig.js';
import { z } from 'zod';
export class IllustratorAgent {
    // Renderer relies on planner input plus the shared ImageStore to leave
    // artifacts other systems can reuse (web preview, print, etc.).
    agent;
    log;
    constructor({ model = AgentConfig.model('illustrator'), log = defaultLogger } = {}) {
        this.log = log;
        this.agent = new Agent({
            name: 'BookBug Illustrator',
            instructions: ({ context }) => {
                if (!context) {
                    throw new Error('Illustrator agent requires context');
                }
                return buildIllustratorInstructions(context);
            },
            model,
            outputType: IMAGE_RENDER_RESPONSE_SCHEMA,
        });
    }
    async render(storyTitle, plan, imageStore) {
        const renders = [];
        for (const page of plan.pages) {
            const response = await run(this.agent, '', {
                context: {
                    prompt: page.prompt,
                    stylePreset: page.stylePreset,
                },
            });
            const parsed = response.finalOutput;
            if (!parsed || parsed.status !== 'success' || !parsed.imageUrl) {
                this.log.error({ page: page.pageNumber, error: parsed?.errorMessage }, 'Illustrator agent failed to produce image');
                throw new Error(`Image generation failed for page ${page.pageNumber}`);
            }
            const render = RenderedImageSchema.parse({
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
}
const IMAGE_RENDER_RESPONSE_SCHEMA = z.object({
    status: z.enum(['success', 'failed']),
    imageUrl: z.string().url().optional(),
    seed: z.number().int().optional(),
    errorMessage: z.string().optional(),
});
function buildIllustratorInstructions(context) {
    const styleText = context.stylePreset ? `Style preset: ${context.stylePreset}\n` : '';
    return `${styleText}Primary prompt:
${context.prompt}

Render a single high-quality illustration that matches the description. Respond with JSON containing {"status":"success"|"failed","imageUrl":"<url>","seed":<number?>,"errorMessage":"<optional>"}.`;
}
//# sourceMappingURL=illustratorAgent.js.map