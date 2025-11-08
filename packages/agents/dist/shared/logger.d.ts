export type LogMethod = (...args: unknown[]) => void;
export interface Logger {
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
    debug: LogMethod;
    child: (bindings: Record<string, unknown>) => Logger;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map