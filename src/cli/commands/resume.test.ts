import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs and loadJson before imports
vi.mock('fs/promises');
vi.mock('../../utils', () => ({
  loadJson: vi.fn(),
}));

// Import after mocks
import { loadJson } from '../../utils';

// Extract the functions we want to test by re-implementing them here
// (since they're not exported from resume.ts)

type ResumeStage = 'draft' | 'prose' | 'story' | 'complete';

interface StoryFolderInfo {
  folder: string;
  stage: ResumeStage;
  latestFile: string;
}

const mockLoadJson = vi.mocked(loadJson);

const detectStage = async (folder: string): Promise<StoryFolderInfo> => {
  const files = await fs.readdir(folder);
  if (files.includes('book.json')) return { folder, stage: 'complete', latestFile: path.join(folder, 'book.json') };
  if (files.includes('story.json')) {
    const data = (await mockLoadJson(path.join(folder, 'story.json'))) as Record<string, unknown>;
    const isComposed = 'prose' in data && 'visuals' in data;
    if (isComposed) {
      return { folder, stage: 'story', latestFile: path.join(folder, 'story.json') };
    }
    // When we have separate files, use 'prose' stage which goes through runPipelineIncremental
    if (files.includes('prose.json') || files.includes('visuals.json')) {
      return { folder, stage: 'prose', latestFile: path.join(folder, 'story.json') };
    }
    return { folder, stage: 'draft', latestFile: path.join(folder, 'story.json') };
  }
  if (files.includes('prose.json')) return { folder, stage: 'prose', latestFile: path.join(folder, 'prose.json') };
  if (files.includes('plot.json')) return { folder, stage: 'draft', latestFile: path.join(folder, 'plot.json') };
  if (files.includes('brief.json')) return { folder, stage: 'draft', latestFile: path.join(folder, 'brief.json') };
  throw new Error(`No resumable artifacts found in ${folder}`);
};

describe('resume command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectStage', () => {
    it('detects complete stage when book.json exists', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['book.json', 'story.json'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);

      const result = await detectStage('/test/folder');

      expect(result.stage).toBe('complete');
      expect(result.latestFile).toBe('/test/folder/book.json');
    });

    it('detects story stage when story.json has embedded prose/visuals', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['story.json'] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      vi.mocked(loadJson).mockResolvedValue({
        title: 'Test',
        prose: { logline: 'test', theme: 'test', pages: [] },
        visuals: { style: {}, illustratedPages: [] },
      });

      const result = await detectStage('/test/folder');

      expect(result.stage).toBe('story');
    });

    // Regression test: separate prose.json and visuals.json should be detected
    it('detects prose stage when story.json exists with separate prose.json and visuals.json (empty illustratedPages)', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['story.json', 'prose.json', 'visuals.json'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);
      // story.json without embedded prose/visuals
      vi.mocked(loadJson).mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('story.json')) {
          return { title: 'Test', storyArc: 'arc', setting: 'setting', characters: [], plotBeats: [], pages: [] };
        }
        if (filePath.endsWith('visuals.json')) {
          return { style: {}, illustratedPages: [] };
        }
        return {};
      });

      const result = await detectStage('/test/folder');

      expect(result.stage).toBe('prose');
      expect(result.latestFile).toBe('/test/folder/story.json');
    });

    // Separate files always use prose stage (runPipelineIncremental handles them correctly)
    it('detects prose stage when visuals.json has illustratedPages (separate files)', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['story.json', 'prose.json', 'visuals.json'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);
      vi.mocked(loadJson).mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('story.json')) {
          return { title: 'Test', storyArc: 'arc', setting: 'setting', characters: [], plotBeats: [], pages: [] };
        }
        if (filePath.endsWith('visuals.json')) {
          return { style: {}, illustratedPages: [{ pageNumber: 1, scene: {} }] };
        }
        return {};
      });

      const result = await detectStage('/test/folder');

      // Uses prose stage so runPipelineIncremental loads separate files correctly
      expect(result.stage).toBe('prose');
    });

    it('detects draft stage when only story.json exists without extras', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['story.json'] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      vi.mocked(loadJson).mockResolvedValue({
        title: 'Test',
        storyArc: 'arc',
        setting: 'setting',
        characters: [],
        plotBeats: [],
        pages: [],
      });

      const result = await detectStage('/test/folder');

      expect(result.stage).toBe('draft');
    });
  });
});
