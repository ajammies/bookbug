import type { RenderedImage } from '../protocols/storyProtocols.js';
export interface ImageStore {
    saveRender(storyTitle: string, render: RenderedImage): Promise<void>;
}
export declare class InMemoryImageStore implements ImageStore {
    private readonly renders;
    saveRender(storyTitle: string, render: RenderedImage): Promise<void>;
    getRenders(storyTitle: string): RenderedImage[];
}
export interface FileSystemImageStoreOptions {
    baseDir?: string;
}
export declare class FileSystemImageStore implements ImageStore {
    private readonly baseDir;
    constructor({ baseDir }?: FileSystemImageStoreOptions);
    saveRender(storyTitle: string, render: RenderedImage): Promise<void>;
}
//# sourceMappingURL=imageStore.d.ts.map