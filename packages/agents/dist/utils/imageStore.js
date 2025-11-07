import { promises as fs } from 'node:fs';
import path from 'node:path';
export class InMemoryImageStore {
    renders = new Map();
    async saveRender(storyTitle, render) {
        const existing = this.renders.get(storyTitle) ?? [];
        existing.push(render);
        this.renders.set(storyTitle, existing);
    }
    getRenders(storyTitle) {
        return this.renders.get(storyTitle) ?? [];
    }
}
export class FileSystemImageStore {
    baseDir;
    constructor({ baseDir = path.resolve(process.cwd(), 'data', 'renders') } = {}) {
        this.baseDir = baseDir;
    }
    async saveRender(storyTitle, render) {
        const storyDir = path.join(this.baseDir, toSlug(storyTitle));
        await fs.mkdir(storyDir, { recursive: true });
        const fileName = `${render.pageNumber.toString().padStart(3, '0')}.json`;
        const filePath = path.join(storyDir, fileName);
        await fs.writeFile(filePath, JSON.stringify(render, null, 2), 'utf8');
    }
}
function toSlug(value) {
    const normalized = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return normalized || 'story';
}
//# sourceMappingURL=imageStore.js.map