import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  createOutputManager,
  loadOutputManager,
  isStoryFolder,
} from './output';

vi.mock('fs/promises');
vi.mock('./naming', () => ({
  createStoryFolderName: vi.fn(() => 'test-story-20241126-143052'),
}));

const mockedFs = vi.mocked(fs);

describe('createOutputManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
  });

  it('creates story folder and assets subfolder', async () => {
    const manager = await createOutputManager('Test Story');

    expect(mockedFs.mkdir).toHaveBeenCalledWith(
      'output/test-story-20241126-143052',
      { recursive: true }
    );
    expect(mockedFs.mkdir).toHaveBeenCalledWith(
      'output/test-story-20241126-143052/assets',
      { recursive: true }
    );
  });

  it('returns manager with correct folder path', async () => {
    const manager = await createOutputManager('Test Story');

    expect(manager.folder).toBe('output/test-story-20241126-143052');
  });

  it('saveBrief writes to brief.json', async () => {
    const manager = await createOutputManager('Test Story');
    const brief = { title: 'Test' } as any;

    await manager.saveBrief(brief);

    expect(mockedFs.writeFile).toHaveBeenCalledWith(
      'output/test-story-20241126-143052/brief.json',
      JSON.stringify(brief, null, 2)
    );
  });

  it('saveBlurb writes to blurb.json', async () => {
    const manager = await createOutputManager('Test Story');
    const blurb = { brief: {} } as any;

    await manager.saveBlurb(blurb);

    expect(mockedFs.writeFile).toHaveBeenCalledWith(
      'output/test-story-20241126-143052/blurb.json',
      JSON.stringify(blurb, null, 2)
    );
  });

  it('saveStory writes to story.json', async () => {
    const manager = await createOutputManager('Test Story');
    const story = { storyTitle: 'Test' } as any;

    await manager.saveStory(story);

    expect(mockedFs.writeFile).toHaveBeenCalledWith(
      'output/test-story-20241126-143052/story.json',
      JSON.stringify(story, null, 2)
    );
  });

  it('saveBook writes to book.json', async () => {
    const manager = await createOutputManager('Test Story');
    const book = { storyTitle: 'Test' } as any;

    await manager.saveBook(book);

    expect(mockedFs.writeFile).toHaveBeenCalledWith(
      'output/test-story-20241126-143052/book.json',
      JSON.stringify(book, null, 2)
    );
  });

  it('uses custom path when provided', async () => {
    const manager = await createOutputManager('Test Story', '/custom/path');

    expect(manager.folder).toBe('/custom/path');
    expect(mockedFs.mkdir).toHaveBeenCalledWith('/custom/path', {
      recursive: true,
    });
    expect(mockedFs.mkdir).toHaveBeenCalledWith('/custom/path/assets', {
      recursive: true,
    });
  });
});

describe('loadOutputManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads manager from artifact file path', async () => {
    mockedFs.readdir.mockResolvedValue(['brief.json'] as any);

    const manager = await loadOutputManager('/some/path/story/brief.json');

    expect(manager.folder).toBe('/some/path/story');
  });

  it('throws error if no artifact files found', async () => {
    mockedFs.readdir.mockResolvedValue(['random.txt'] as any);

    await expect(
      loadOutputManager('/some/path/folder/file.txt')
    ).rejects.toThrow('Not a valid story folder');
  });

  it('accepts folder with blurb.json', async () => {
    mockedFs.readdir.mockResolvedValue(['blurb.json'] as any);

    const manager = await loadOutputManager('/path/blurb.json');
    expect(manager.folder).toBe('/path');
  });

  it('accepts folder with manuscript.json', async () => {
    mockedFs.readdir.mockResolvedValue(['manuscript.json'] as any);

    const manager = await loadOutputManager('/path/manuscript.json');
    expect(manager.folder).toBe('/path');
  });

  it('accepts folder with story.json', async () => {
    mockedFs.readdir.mockResolvedValue(['story.json'] as any);

    const manager = await loadOutputManager('/path/story.json');
    expect(manager.folder).toBe('/path');
  });

  it('accepts folder with book.json', async () => {
    mockedFs.readdir.mockResolvedValue(['book.json'] as any);

    const manager = await loadOutputManager('/path/book.json');
    expect(manager.folder).toBe('/path');
  });
});

describe('isStoryFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true if folder contains brief.json', async () => {
    mockedFs.readdir.mockResolvedValue(['brief.json', 'other.txt'] as any);

    const result = await isStoryFolder('/path/to/story/file.txt');
    expect(result).toBe(true);
  });

  it('returns true if folder contains any artifact file', async () => {
    mockedFs.readdir.mockResolvedValue(['manuscript.json'] as any);

    const result = await isStoryFolder('/path/to/story/file.txt');
    expect(result).toBe(true);
  });

  it('returns false if folder contains no artifact files', async () => {
    mockedFs.readdir.mockResolvedValue(['readme.md', 'config.json'] as any);

    const result = await isStoryFolder('/path/to/folder/file.txt');
    expect(result).toBe(false);
  });

  it('returns false on readdir error', async () => {
    mockedFs.readdir.mockRejectedValue(new Error('ENOENT'));

    const result = await isStoryFolder('/nonexistent/path/file.txt');
    expect(result).toBe(false);
  });
});
