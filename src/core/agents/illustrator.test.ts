import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  filterStoryForPage,
  renderPage,
  renderPageMock,
  createBook,
} from './illustrator';
import type { Story, RenderedPage } from '../schemas';

// Mock image-generation module
vi.mock('../services/image-generation', () => ({
  generatePageImage: vi.fn().mockResolvedValue({ url: 'https://generated.com/image.png' }),
}));

import { generatePageImage } from '../services/image-generation';

const createMinimalStory = (overrides?: Partial<Story>): Story => ({
  storyTitle: 'The Magic Garden',
  ageRange: { min: 4, max: 8 },
  characters: {
    luna: { name: 'Luna', description: 'A curious rabbit', traits: [], notes: [] },
    pip: { name: 'Pip', description: 'A friendly bird', traits: [], notes: [] },
  },
  manuscript: {
    meta: {
      title: 'The Magic Garden',
      logline: 'A rabbit discovers wonder',
      theme: 'Curiosity',
      setting: 'A hidden garden',
    },
    pages: {
      '1': { summary: 'Intro', text: 'Luna found a gate.', imageConcept: 'Gate scene' },
      '2': { summary: 'Discovery', text: 'She entered the garden.', imageConcept: 'Garden' },
    },
  },
  style: {
    art_direction: {
      genre: ['whimsical'],
      medium: ['watercolor'],
      technique: ['soft edges'],
    },
    setting: {
      landmarks: ['old oak tree'],
      diegetic_lights: ['sunbeams'],
    },
  },
  pages: [
    {
      pageNumber: 1,
      beats: [
        {
          order: 1,
          purpose: 'setup',
          summary: 'Luna finds the gate',
          emotion: 'curious',
          characters: [
            { id: 'luna', expression: 'curious', pose: 'looking up', focus: 'primary' },
          ],
          shot: { size: 'wide', angle: 'eye_level' },
        },
      ],
    },
    {
      pageNumber: 2,
      beats: [
        {
          order: 1,
          purpose: 'build',
          summary: 'Luna and Pip explore',
          emotion: 'excited',
          characters: [
            { id: 'luna', expression: 'happy', pose: 'walking', focus: 'primary' },
            { id: 'pip', expression: 'cheerful', pose: 'flying', focus: 'secondary' },
          ],
          shot: { size: 'medium', angle: 'eye_level' },
        },
      ],
    },
  ],
  ...overrides,
});

describe('filterStoryForPage', () => {
  it('extracts correct page by page number (1-indexed)', () => {
    const story = createMinimalStory();

    const slice = filterStoryForPage(story, 1);

    expect(slice.page.pageNumber).toBe(1);
    expect(slice.page.text).toBe('Luna found a gate.');
  });

  it('extracts second page correctly', () => {
    const story = createMinimalStory();

    const slice = filterStoryForPage(story, 2);

    expect(slice.page.pageNumber).toBe(2);
    expect(slice.page.text).toBe('She entered the garden.');
  });

  it('includes story title and style', () => {
    const story = createMinimalStory();

    const slice = filterStoryForPage(story, 1);

    expect(slice.storyTitle).toBe('The Magic Garden');
    expect(slice.style.art_direction.genre).toContain('whimsical');
  });

  it('extracts only referenced characters', () => {
    const story = createMinimalStory();

    // Page 1 only references 'luna'
    const slice1 = filterStoryForPage(story, 1);
    expect(Object.keys(slice1.characters)).toEqual(['luna']);
    expect(slice1.characters.luna?.name).toBe('Luna');

    // Page 2 references both 'luna' and 'pip'
    const slice2 = filterStoryForPage(story, 2);
    expect(Object.keys(slice2.characters).sort()).toEqual(['luna', 'pip']);
  });

  it('handles page with no beats gracefully', () => {
    const story = createMinimalStory({
      pages: [{ pageNumber: 1, beats: [] }],
    });

    const slice = filterStoryForPage(story, 1);

    expect(slice.characters).toEqual({});
    expect(slice.page.beats).toEqual([]);
  });

  it('handles missing manuscript page gracefully', () => {
    const story = createMinimalStory();
    // Request page 3 which doesn't exist in manuscript
    story.pages.push({
      pageNumber: 3,
      beats: [
        {
          order: 1,
          purpose: 'payoff',
          summary: 'End',
          emotion: 'happy',
          characters: [],
          shot: { size: 'wide', angle: 'eye_level' },
        },
      ],
    });

    const slice = filterStoryForPage(story, 3);

    expect(slice.page.pageNumber).toBe(3);
    expect(slice.page.text).toBeUndefined();
  });

  it('handles duplicate character IDs in beats', () => {
    const story = createMinimalStory({
      pages: [
        {
          pageNumber: 1,
          beats: [
            {
              order: 1,
              purpose: 'setup',
              summary: 'Luna appears twice',
              emotion: 'curious',
              characters: [
                { id: 'luna', expression: 'curious', pose: 'sitting', focus: 'primary' },
                { id: 'luna', expression: 'happy', pose: 'standing', focus: 'secondary' },
              ],
              shot: { size: 'wide', angle: 'eye_level' },
            },
          ],
        },
      ],
    });

    const slice = filterStoryForPage(story, 1);

    // Should only have one 'luna' entry despite duplicate references
    expect(Object.keys(slice.characters)).toEqual(['luna']);
  });

  it('handles non-existent character ID gracefully', () => {
    const story = createMinimalStory({
      pages: [
        {
          pageNumber: 1,
          beats: [
            {
              order: 1,
              purpose: 'setup',
              summary: 'Unknown character',
              emotion: 'curious',
              characters: [
                { id: 'unknown', expression: 'neutral', pose: 'standing', focus: 'primary' },
              ],
              shot: { size: 'wide', angle: 'eye_level' },
            },
          ],
        },
      ],
    });

    const slice = filterStoryForPage(story, 1);

    // 'unknown' ID doesn't exist in story.characters, should be filtered out
    expect(slice.characters).toEqual({});
  });

  it('includes beats in the slice', () => {
    const story = createMinimalStory();

    const slice = filterStoryForPage(story, 1);

    expect(slice.page.beats).toHaveLength(1);
    expect(slice.page.beats![0]!.summary).toBe('Luna finds the gate');
  });
});

describe('renderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls generatePageImage with filtered story slice', async () => {
    const story = createMinimalStory();

    await renderPage(story, 1);

    expect(generatePageImage).toHaveBeenCalledWith(
      expect.objectContaining({
        storyTitle: 'The Magic Garden',
        page: expect.objectContaining({ pageNumber: 1 }),
      }),
      expect.any(Object) // format spec
    );
  });

  it('returns RenderedPage with pageNumber and URL', async () => {
    const story = createMinimalStory();

    const result = await renderPage(story, 1);

    expect(result.pageNumber).toBe(1);
    expect(result.url).toBe('https://generated.com/image.png');
  });

  it('uses default format when not specified', async () => {
    const story = createMinimalStory();

    await renderPage(story, 1);

    // Should use square-large format (the default)
    expect(generatePageImage).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ name: 'Large Square' })
    );
  });

  it('passes specified format to generatePageImage', async () => {
    const story = createMinimalStory();

    await renderPage(story, 1, 'landscape');

    expect(generatePageImage).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ name: 'Landscape' })
    );
  });
});

describe('renderPageMock', () => {
  it('returns RenderedPage with correct pageNumber', () => {
    const result = renderPageMock(5);

    expect(result.pageNumber).toBe(5);
  });

  it('returns placeholder URL with page number', () => {
    const result = renderPageMock(3);

    expect(result.url).toBe('https://placeholder.com/pages/page3.png');
  });

  it('handles page 1', () => {
    const result = renderPageMock(1);

    expect(result.pageNumber).toBe(1);
    expect(result.url).toContain('page1');
  });

  it('handles large page numbers', () => {
    const result = renderPageMock(100);

    expect(result.pageNumber).toBe(100);
    expect(result.url).toContain('page100');
  });
});

describe('createBook', () => {
  it('creates Book with story metadata', () => {
    const story = createMinimalStory();
    const pages: RenderedPage[] = [
      { pageNumber: 1, url: 'https://example.com/1.png' },
    ];

    const book = createBook(story, pages);

    expect(book.storyTitle).toBe('The Magic Garden');
    expect(book.ageRange).toEqual({ min: 4, max: 8 });
  });

  it('includes all provided pages', () => {
    const story = createMinimalStory();
    const pages: RenderedPage[] = [
      { pageNumber: 1, url: 'https://example.com/1.png' },
      { pageNumber: 2, url: 'https://example.com/2.png' },
    ];

    const book = createBook(story, pages);

    expect(book.pages).toHaveLength(2);
    expect(book.pages[0]!.url).toBe('https://example.com/1.png');
    expect(book.pages[1]!.url).toBe('https://example.com/2.png');
  });

  it('uses default format when not specified', () => {
    const story = createMinimalStory();
    const pages: RenderedPage[] = [{ pageNumber: 1, url: 'https://example.com/1.png' }];

    const book = createBook(story, pages);

    expect(book.format).toBe('square-large');
  });

  it('uses specified format', () => {
    const story = createMinimalStory();
    const pages: RenderedPage[] = [{ pageNumber: 1, url: 'https://example.com/1.png' }];

    const book = createBook(story, pages, 'portrait-small');

    expect(book.format).toBe('portrait-small');
  });

  it('sets createdAt timestamp', () => {
    const story = createMinimalStory();
    const pages: RenderedPage[] = [{ pageNumber: 1, url: 'https://example.com/1.png' }];

    const before = new Date().toISOString();
    const book = createBook(story, pages);
    const after = new Date().toISOString();

    expect(book.createdAt >= before).toBe(true);
    expect(book.createdAt <= after).toBe(true);
  });

  it('handles empty pages array', () => {
    const story = createMinimalStory();

    const book = createBook(story, []);

    expect(book.pages).toEqual([]);
  });
});
