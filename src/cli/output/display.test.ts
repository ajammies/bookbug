import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { displayBrief, displayManuscript, displayStory, displayBook } from './display';
import type { StoryBrief, Manuscript, Story, RenderedBook } from '../../core/schemas';

// Mock console.log to capture output
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

beforeEach(() => {
  consoleSpy.mockClear();
});

afterEach(() => {
  consoleSpy.mockClear();
});

describe('displayBrief', () => {
  const minimalBrief: StoryBrief = {
    title: 'The Magic Garden',
    storyArc: 'A rabbit discovers a hidden garden',
    setting: 'A cottage in the woods',
    ageRange: { min: 4, max: 8 },
    pageCount: 24,
    characters: [
      { name: 'Luna', description: 'A curious rabbit', traits: [], notes: [] },
    ],
    interests: [],
    customInstructions: [],
  };

  it('displays brief title', () => {
    displayBrief(minimalBrief);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('The Magic Garden');
  });

  it('displays story arc', () => {
    displayBrief(minimalBrief);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('A rabbit discovers a hidden garden');
  });

  it('displays age range', () => {
    displayBrief(minimalBrief);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('4-8 years');
  });

  it('displays characters', () => {
    displayBrief(minimalBrief);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Luna');
    expect(output).toContain('A curious rabbit');
  });

  it('displays optional tone when present', () => {
    const briefWithTone = { ...minimalBrief, tone: 'Whimsical' };
    displayBrief(briefWithTone);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Whimsical');
  });

  it('displays optional moral when present', () => {
    const briefWithMoral = { ...minimalBrief, moral: 'Be curious' };
    displayBrief(briefWithMoral);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Be curious');
  });

  it('displays character role when present', () => {
    const briefWithRole: StoryBrief = {
      ...minimalBrief,
      characters: [
        { name: 'Luna', description: 'A curious rabbit', role: 'protagonist', traits: [], notes: [] },
      ],
    };
    displayBrief(briefWithRole);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('protagonist');
  });
});

describe('displayManuscript', () => {
  const minimalBlurb = {
    brief: {
      title: 'Test',
      storyArc: 'Test arc',
      setting: 'Test setting',
      ageRange: { min: 4, max: 8 },
      pageCount: 8,
      characters: [{ name: 'Test', description: 'Test char', traits: [], notes: [] }],
      interests: [],
      customInstructions: [],
    },
    plotBeats: [],
    allowCreativeLiberty: true,
  };

  const minimalManuscript: Manuscript = {
    blurb: minimalBlurb,
    title: 'The Magic Garden',
    logline: 'A rabbit finds wonder in unexpected places',
    theme: 'Curiosity and discovery',
    setting: 'A hidden garden',
    ageRange: { min: 4, max: 8 },
    pageCount: 8,
    characters: [{ name: 'Luna', description: 'A curious rabbit', traits: [], notes: [] }],
    pages: [
      { summary: 'Luna finds the gate', text: 'Luna found an old gate.', imageConcept: 'Rabbit at gate' },
      { summary: 'Luna enters garden', text: 'She pushed it open.', imageConcept: 'Garden entrance' },
      { summary: 'Luna meets friend', text: 'A butterfly appeared.', imageConcept: 'Butterfly meeting' },
      { summary: 'They explore', text: 'Together they explored.', imageConcept: 'Exploration' },
      { summary: 'Discovery', text: 'They found a pond.', imageConcept: 'Pond scene' },
      { summary: 'Playing', text: 'They played all day.', imageConcept: 'Playing' },
      { summary: 'Sunset', text: 'The sun began to set.', imageConcept: 'Sunset' },
      { summary: 'Home', text: 'Luna went home happy.', imageConcept: 'Happy ending' },
    ],
  };

  it('displays manuscript title', () => {
    displayManuscript(minimalManuscript);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('The Magic Garden');
  });

  it('displays logline', () => {
    displayManuscript(minimalManuscript);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('A rabbit finds wonder in unexpected places');
  });

  it('displays first 5 page summaries', () => {
    displayManuscript(minimalManuscript);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Luna finds the gate');
    expect(output).toContain('Luna enters garden');
    expect(output).toContain('Luna meets friend');
    expect(output).toContain('They explore');
    expect(output).toContain('Discovery');
  });

  it('shows remaining page count when more than 5 pages', () => {
    displayManuscript(minimalManuscript);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('3 more pages');
  });

  it('does not show remaining count for 5 or fewer pages', () => {
    const shortManuscript: Manuscript = {
      ...minimalManuscript,
      pageCount: 5,
      pages: minimalManuscript.pages.slice(0, 5),
    };
    displayManuscript(shortManuscript);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).not.toContain('more pages');
  });
});

describe('displayStory', () => {
  const minimalStory: Story = {
    storyTitle: 'The Magic Garden',
    ageRange: { min: 4, max: 8 },
    characters: {
      luna: { name: 'Luna', description: 'A curious rabbit', traits: [], notes: [] },
    },
    manuscript: {
      meta: {
        title: 'The Magic Garden',
        logline: 'A rabbit finds wonder',
        theme: 'Curiosity',
        setting: 'Garden',
      },
      pages: {
        '1': { summary: 'Intro', text: 'Luna found a gate.', imageConcept: 'Gate' },
      },
    },
    style: {
      art_direction: {
        genre: ['fantasy', 'childrens'],
        medium: ['digital illustration'],
        technique: ['soft shading'],
      },
      setting: {
        landmarks: [],
        diegetic_lights: [],
      },
    },
    pages: [
      {
        pageNumber: 1,
        beats: [
          {
            order: 1,
            purpose: 'setup',
            summary: 'Luna discovers the garden gate',
            emotion: 'curious',
            characters: [],
            shot: {
              size: 'wide',
              angle: 'eye_level',
            },
          },
        ],
      },
    ],
  };

  it('displays story title', () => {
    displayStory(minimalStory);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('The Magic Garden');
  });

  it('displays page count', () => {
    displayStory(minimalStory);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Pages:');
  });

  it('displays total beats', () => {
    displayStory(minimalStory);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Total Beats:');
  });

  it('displays art direction genres', () => {
    displayStory(minimalStory);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('fantasy');
    expect(output).toContain('childrens');
  });

  it('displays first page beats', () => {
    displayStory(minimalStory);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Luna discovers the garden gate');
    expect(output).toContain('wide');
    expect(output).toContain('eye_level');
  });
});

describe('displayBook', () => {
  const minimalBook: RenderedBook = {
    storyTitle: 'The Magic Garden',
    ageRange: { min: 4, max: 8 },
    format: 'square-large',
    pages: [
      { pageNumber: 1, url: 'https://example.com/page1.png' },
      { pageNumber: 2, url: 'https://example.com/page2.png' },
      { pageNumber: 3, url: 'https://example.com/page3.png' },
      { pageNumber: 4, url: 'https://example.com/page4.png' },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  it('displays book title', () => {
    displayBook(minimalBook);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('The Magic Garden');
  });

  it('displays age range', () => {
    displayBook(minimalBook);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('4-8 years');
  });

  it('displays format', () => {
    displayBook(minimalBook);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('square-large');
  });

  it('displays first 3 page previews', () => {
    displayBook(minimalBook);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Page 1');
    expect(output).toContain('Page 2');
    expect(output).toContain('Page 3');
  });

  it('shows remaining page count when more than 3 pages', () => {
    displayBook(minimalBook);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('1 more pages');
  });

  it('displays page URLs', () => {
    displayBook(minimalBook);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('https://example.com/page1.png');
  });

  it('displays completion message', () => {
    displayBook(minimalBook);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Book generation complete!');
  });
});
