import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executePipeline,
  generateProse,
  generateVisuals,
  renderBook,
} from './pipeline';
import type {
  StoryWithPlot,
  StoryWithProse,
  ComposedStory,
  Prose,
  VisualDirection,
  VisualStyleGuide,
  IllustratedPage,
} from './schemas';
import type { StoryOutputManager } from '../cli/utils/output';

// Mock the agents
vi.mock('./agents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./agents')>();
  return {
    ...actual,
    proseAgent: vi.fn(),
    visualsAgent: vi.fn(),
    styleGuideAgent: vi.fn(),
    generateCharacterDesigns: vi.fn(),
    renderPage: vi.fn(),
  };
});

import {
  proseAgent,
  visualsAgent,
  styleGuideAgent,
  generateCharacterDesigns,
  renderPage,
} from './agents';

const mockedProseAgent = vi.mocked(proseAgent);
const mockedVisualsAgent = vi.mocked(visualsAgent);
const mockedStyleGuideAgent = vi.mocked(styleGuideAgent);
const mockedGenerateCharacterDesigns = vi.mocked(generateCharacterDesigns);
const mockedRenderPage = vi.mocked(renderPage);

// Test fixtures
const mockStoryWithPlot: StoryWithPlot = {
  title: 'Test Story',
  storyArc: 'A test adventure',
  setting: 'Test land',
  ageRange: { min: 4, max: 8 },
  pageCount: 2,
  characters: [{ name: 'Hero', description: 'The main character', traits: [], notes: [] }],
  interests: [],
  
  plot: {
    storyArcSummary: 'A hero goes on a journey',
    plotBeats: [
      { purpose: 'setup', description: 'Hero starts journey' },
      { purpose: 'conflict', description: 'Hero faces challenge' },
      { purpose: 'climax', description: 'Hero overcomes' },
      { purpose: 'payoff', description: 'Hero succeeds' },
    ],
    allowCreativeLiberty: true,
  },
};

const mockProse: Prose = {
  logline: 'A hero saves the day',
  theme: 'Courage',
  pages: [
    { summary: 'Page 1', text: 'Once upon a time...', imageConcept: 'Hero standing' },
    { summary: 'Page 2', text: 'The end.', imageConcept: 'Hero celebrating' },
  ],
};

const mockStyleGuide: VisualStyleGuide = {
  art_direction: {
    genre: ['fantasy'],
    medium: ['watercolor'],
    technique: ['soft edges'],
  },
  setting: {
    landmarks: [],
    diegetic_lights: [],
  },
};

const mockIllustratedPage1: IllustratedPage = {
  pageNumber: 1,
  beats: [{
    order: 1,
    purpose: 'setup',
    summary: 'Hero stands',
    emotion: 'determined',
    characters: [],
    shot: { size: 'wide', angle: 'eye_level' },
  }],
};

const mockIllustratedPage2: IllustratedPage = {
  pageNumber: 2,
  beats: [{
    order: 1,
    purpose: 'payoff',
    summary: 'Hero celebrates',
    emotion: 'joyful',
    characters: [],
    shot: { size: 'medium', angle: 'eye_level' },
  }],
};

const mockVisuals: VisualDirection = {
  style: mockStyleGuide,
  illustratedPages: [mockIllustratedPage1, mockIllustratedPage2],
};

const mockStoryWithProse: StoryWithProse = {
  ...mockStoryWithPlot,
  prose: mockProse,
};

const mockComposedStory: ComposedStory = {
  ...mockStoryWithProse,
  visuals: mockVisuals,
};

describe('generateProse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedProseAgent.mockResolvedValue(mockProse);
  });

  it('generates prose in single call', async () => {
    const result = await generateProse(mockStoryWithPlot);

    expect(result.title).toBe('Test Story');
    expect(result.prose.logline).toBe('A hero saves the day');
    expect(result.prose.pages).toHaveLength(2);
  });

  it('calls prose agent once with story', async () => {
    await generateProse(mockStoryWithPlot);

    expect(mockedProseAgent).toHaveBeenCalledTimes(1);
    expect(mockedProseAgent).toHaveBeenCalledWith(mockStoryWithPlot, undefined);
  });

  it('calls onProgress for prose stage', async () => {
    const onProgress = vi.fn();

    await generateProse(mockStoryWithPlot, { onProgress });

    expect(onProgress).toHaveBeenCalledWith('prose', 'start');
    expect(onProgress).toHaveBeenCalledWith('prose', 'complete');
  });
});

describe('generateVisuals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedVisualsAgent.mockResolvedValue(mockVisuals);
  });

  it('generates visuals in single call', async () => {
    const result = await generateVisuals(mockStoryWithProse);

    expect(result.title).toBe('Test Story');
    expect(result.visuals.style).toEqual(mockStyleGuide);
    expect(result.visuals.illustratedPages).toHaveLength(2);
  });

  it('calls visuals agent once with story', async () => {
    await generateVisuals(mockStoryWithProse);

    expect(mockedVisualsAgent).toHaveBeenCalledTimes(1);
    expect(mockedVisualsAgent).toHaveBeenCalledWith(mockStoryWithProse, undefined);
  });

  it('calls onProgress for visuals stage', async () => {
    const onProgress = vi.fn();

    await generateVisuals(mockStoryWithProse, { onProgress });

    expect(onProgress).toHaveBeenCalledWith('visuals', 'start');
    expect(onProgress).toHaveBeenCalledWith('visuals', 'complete');
  });
});

describe('renderBook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRenderPage.mockImplementation(async (_story, pageNumber) => ({
      pageNumber,
      url: `https://example.com/page${pageNumber}.png`,
    }));
  });

  it('renders all pages and creates book', async () => {
    const result = await renderBook(mockComposedStory);

    expect(result.storyTitle).toBe('Test Story');
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]?.pageNumber).toBe(1);
    expect(result.pages[1]?.pageNumber).toBe(2);
  });

  it('uses mock renderer when mock is true', async () => {
    const result = await renderBook(mockComposedStory, { mock: true });

    expect(mockedRenderPage).not.toHaveBeenCalled();
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]?.url).toContain('placeholder.com');
  });

  it('saves images when outputManager is provided', async () => {
    const outputManager: StoryOutputManager = {
      folder: '/test/folder',
      saveBrief: vi.fn(),
      saveBlurb: vi.fn(),
      saveProse: vi.fn(),
      saveStory: vi.fn(),
      saveBook: vi.fn(),
      savePageImage: vi.fn().mockResolvedValue('/test/folder/assets/page-1.png'),
      saveCharacterDesign: vi.fn().mockResolvedValue('assets/characters/test.png'),
    };

    await renderBook(mockComposedStory, { outputManager });

    expect(outputManager.savePageImage).toHaveBeenCalledTimes(2);
    expect(outputManager.savePageImage).toHaveBeenCalledWith(expect.objectContaining({ pageNumber: 1 }));
    expect(outputManager.savePageImage).toHaveBeenCalledWith(expect.objectContaining({ pageNumber: 2 }));
  });

  it('uses specified format', async () => {
    await renderBook(mockComposedStory, { format: 'landscape' });

    expect(mockedRenderPage).toHaveBeenCalledWith(
      mockComposedStory,
      expect.any(Number),
      expect.objectContaining({ format: 'landscape' })
    );
  });

  it('calls onProgress for each page', async () => {
    const onProgress = vi.fn();

    await renderBook(mockComposedStory, { onProgress });

    expect(onProgress).toHaveBeenCalledWith('render-page-1', 'start');
    expect(onProgress).toHaveBeenCalledWith('render-page-1', 'complete');
    expect(onProgress).toHaveBeenCalledWith('render-page-2', 'start');
    expect(onProgress).toHaveBeenCalledWith('render-page-2', 'complete');
  });
});

describe('executePipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStyleGuideAgent.mockResolvedValue(mockStyleGuide);
    mockedGenerateCharacterDesigns.mockResolvedValue([
      { character: mockStoryWithPlot.characters[0]!, spriteSheetUrl: 'https://example.com/sprite.png' },
    ]);
    mockedProseAgent.mockResolvedValue(mockProse);
    mockedVisualsAgent.mockResolvedValue(mockVisuals);
    mockedRenderPage.mockImplementation(async (_story, pageNumber) => ({
      pageNumber,
      url: `https://example.com/page${pageNumber}.png`,
    }));
  });

  it('runs full pipeline and returns story and book', async () => {
    const result = await executePipeline(mockStoryWithPlot);

    expect(result.story.title).toBe('Test Story');
    expect(result.story.prose.logline).toBe('A hero saves the day');
    expect(result.story.visuals.style).toEqual(mockStyleGuide);
    expect(result.book.pages).toHaveLength(2);
  });

  it('chains prose, visuals, and render stages', async () => {
    await executePipeline(mockStoryWithPlot);

    // Prose stage (single call)
    expect(mockedProseAgent).toHaveBeenCalledTimes(1);

    // Visuals stage (single call)
    expect(mockedVisualsAgent).toHaveBeenCalledTimes(1);

    // Render stage
    expect(mockedRenderPage).toHaveBeenCalledTimes(2);
  });

  it('calls onProgress for each stage', async () => {
    const onProgress = vi.fn();

    await executePipeline(mockStoryWithPlot, { onProgress });

    expect(onProgress).toHaveBeenCalledWith('setup', 'start');
    expect(onProgress).toHaveBeenCalledWith('setup', 'complete');
    expect(onProgress).toHaveBeenCalledWith('prose', 'start');
    expect(onProgress).toHaveBeenCalledWith('prose', 'complete');
    expect(onProgress).toHaveBeenCalledWith('visuals', 'start');
    expect(onProgress).toHaveBeenCalledWith('visuals', 'complete');
    expect(onProgress).toHaveBeenCalledWith('render', 'start');
    expect(onProgress).toHaveBeenCalledWith('render', 'complete');
  });

  it('saves artifacts when outputManager is provided', async () => {
    const outputManager: StoryOutputManager = {
      folder: '/test/folder',
      saveBrief: vi.fn(),
      saveBlurb: vi.fn(),
      saveProse: vi.fn(),
      saveStory: vi.fn(),
      saveBook: vi.fn(),
      savePageImage: vi.fn().mockResolvedValue('/test/folder/assets/page-1.png'),
      saveCharacterDesign: vi.fn().mockResolvedValue('assets/characters/test.png'),
    };

    await executePipeline(mockStoryWithPlot, { outputManager });

    expect(outputManager.saveProse).toHaveBeenCalledWith(
      expect.objectContaining({ prose: expect.objectContaining({ logline: 'A hero saves the day' }) })
    );
    expect(outputManager.saveStory).toHaveBeenCalledWith(
      expect.objectContaining({ visuals: expect.objectContaining({ style: mockStyleGuide }) })
    );
    expect(outputManager.saveBook).toHaveBeenCalledWith(
      expect.objectContaining({ pages: expect.any(Array) })
    );
  });

  it('does not save when outputManager is not provided', async () => {
    const result = await executePipeline(mockStoryWithPlot);

    // No errors thrown, pipeline completes successfully
    expect(result.book.pages).toHaveLength(2);
  });
});
