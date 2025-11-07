type ModelMap = {
    concierge: string;
    author: string;
    artDirector: string;
    illustrator: string;
};
export declare class AgentConfig {
    private static readonly _env;
    static readonly MODELS: ModelMap;
    static model(key: keyof ModelMap): string;
    static get env(): Readonly<typeof AgentConfig._env>;
}
export type AgentModelKey = keyof typeof AgentConfig.MODELS;
export {};
//# sourceMappingURL=agentConfig.d.ts.map