import type { RenderedImage } from '../protocols/storyProtocols.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface ImageStore {
  saveRender(storyTitle: string, render: RenderedImage): Promise<void>;
}

export class InMemoryImageStore implements ImageStore {
  private readonly renders = new Map<string, RenderedImage[]>();

  async saveRender(storyTitle: string, render: RenderedImage): Promise<void> {
    const existing = this.renders.get(storyTitle) ?? [];
    existing.push(render);
    this.renders.set(storyTitle, existing);
  }

  getRenders(storyTitle: string): RenderedImage[] {
    return this.renders.get(storyTitle) ?? [];
  }
}

export interface FileSystemImageStoreOptions {
  baseDir?: string;
}

export class FileSystemImageStore implements ImageStore {
  private readonly baseDir: string;

  constructor({ baseDir = path.resolve(process.cwd(), 'data', 'renders') }: FileSystemImageStoreOptions = {}) {
    this.baseDir = baseDir;
  }

  async saveRender(storyTitle: string, render: RenderedImage): Promise<void> {
    const storyDir = path.join(this.baseDir, toSlug(storyTitle));
    await fs.mkdir(storyDir, { recursive: true });
    const fileName = `${render.pageNumber.toString().padStart(3, '0')}.json`;
    const filePath = path.join(storyDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(render, null, 2), 'utf8');
  }
}

function toSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'story';
}
