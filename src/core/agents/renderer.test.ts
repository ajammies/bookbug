import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  filterStoryForPage,
  renderPage,
  renderPageMock,
  createBook,
} from './renderer';
import type { ComposedStory, RenderedPage } from '../schemas';

// Mock image-generation module
vi.mock('../services/image-generation', () => ({
  generatePageImage: vi.fn().mockResolvedValue({ url: 'https://generated.com/image.png' }),
}));

import { generatePageImage } from '../services/image-generation';

const createMinimalStory = (overrides?: Partial<ComposedStory>): ComposedStory => ({
  // StoryBrief fields
  title: 'The Magic Garden',
  storyArc: 'A rabbit discovers a hidden garden',
  setting: 'A hidden garden in the woods',
  ageRange: { min: 4, max: 8 },
  pageCount: 2,
  characters: [
    { name: 'Luna', description: 'A curious rabbit', traits: [], notes: [], visualDescription: 'Small white rabbit with big curious eyes' },
    { name: 'Pip', description: 'A friendly bird', traits: [], notes: [], visualDescription: 'Small blue bird with orange beak' },
  ],
  interests: [],
  // Character designs with sprite sheets
  characterDesigns: [
    { character: { name: 'Luna', description: 'A curious rabbit', traits: [], notes: [], visualDescription: 'Small white rabbit with big curious eyes' }, spriteSheetUrl: 'https://example.com/luna-sprite.png' },
    { character: { name: 'Pip', description: 'A friendly bird', traits: [], notes: [], visualDescription: 'Small blue bird with orange beak' }, spriteSheetUrl: 'https://example.com/pip-sprite.png' },
  ],
  
  // PlotStructure
  plot: {
    storyArcSummary: 'A rabbit discovers wonder in a hidden garden',
    plotBeats: [
      { purpose: 'setup', description: 'Luna finds the gate' },
      { purpose: 'conflict', description: 'She hesitates' },
      { purpose: 'climax', description: 'She enters' },
      { purpose: 'payoff', description: 'She finds a friend' },
    ],
    allowCreativeLiberty: true,
  },
  // Prose
  prose: {
    logline: 'A rabbit discovers wonder',
    theme: 'Curiosity',
    pages: [
      { summary: 'Intro', text: 'Luna found a gate.', imageConcept: 'Gate scene' },
      { summary: 'Discovery', text: 'She entered the garden.', imageConcept: 'Garden' },
    ],
  },
  // VisualDirection
  visuals: {
    style: {
      art_style: {
        genre: ['whimsical'],
        medium: ['watercolor'],
        technique: ['soft edges'],
      },
      setting: {
        landmarks: ['old oak tree'],
        diegetic_lights: ['sunbeams'],
      },
    },
    illustratedPages: [
      {
        pageNumber: 1,
        beats: [
          {
            order: 1,
            purpose: 'setup',
            summary: 'Luna finds the gate',
            emotion: 'curious',
            characters: [
              { id: 'Luna', expression: 'curious', pose: 'looking up', focus: 'primary' },
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
              { id: 'Luna', expression: 'happy', pose: 'walking', focus: 'primary' },
              { id: 'Pip', expression: 'cheerful', pose: 'flying', focus: 'secondary' },
            ],
            shot: { size: 'medium', angle: 'eye_level' },
          },
        ],
      },
    ],
  },
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
    expect(slice.style.art_style.genre).toContain('whimsical');
  });

  it('includes all character designs for consistent reference', () => {
    const story = createMinimalStory();

    // Both pages get all character designs
    const slice1 = filterStoryForPage(story, 1);
    expect(slice1.characterDesigns.map(d => d.character.name)).toEqual(['Luna', 'Pip']);

    const slice2 = filterStoryForPage(story, 2);
    expect(slice2.characterDesigns.map(d => d.character.name)).toEqual(['Luna', 'Pip']);
  });

  it('handles page with no beats gracefully', () => {
    const story = createMinimalStory();
    story.visuals.illustratedPages = [{ pageNumber: 1, beats: [] }];

    const slice = filterStoryForPage(story, 1);

    // Still includes all character designs for reference
    expect(slice.characterDesigns.map(d => d.character.name)).toEqual(['Luna', 'Pip']);
    expect(slice.page.beats).toEqual([]);
  });

  it('handles missing prose page gracefully', () => {
    const story = createMinimalStory();
    // Request page 3 which doesn't exist in prose
    story.visuals.illustratedPages.push({
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

  it('handles missing characterDesigns gracefully', () => {
    const story = createMinimalStory();
    story.characterDesigns = undefined;

    const slice = filterStoryForPage(story, 1);

    expect(slice.characterDesigns).toEqual([]);
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
      expect.any(Object), // format spec
      expect.any(Object)  // options
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
      expect.objectContaining({ name: 'Large Square' }),
      expect.any(Object)
    );
  });

  it('passes specified format to generatePageImage', async () => {
    const story = createMinimalStory();

    await renderPage(story, 1, { format: 'landscape' });

    expect(generatePageImage).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ name: 'Landscape' }),
      expect.any(Object)
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
