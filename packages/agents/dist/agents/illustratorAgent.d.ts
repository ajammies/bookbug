import { IllustrationPlan, RenderedImage } from '../protocols/storyProtocols.js';
import { ImageStore } from '../utils/imageStore.js';
import { logger as defaultLogger } from '@bookbug/shared';
export interface IllustratorAgentConfig {
    model?: string;
    log?: typeof defaultLogger;
}
export declare class IllustratorAgent {
    private readonly agent;
    private readonly log;
    constructor({ model, log }?: IllustratorAgentConfig);
    render(storyTitle: string, plan: IllustrationPlan, imageStore: ImageStore): Promise<RenderedImage[]>;
}
//# sourceMappingURL=illustratorAgent.d.ts.map