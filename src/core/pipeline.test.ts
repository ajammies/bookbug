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
  ProseSetup,
  ProsePage,
  VisualStyleGuide,
  IllustratedPage,
} from './schemas';
import type { StoryOutputManager } from '../cli/utils/output';

// Mock the agents
vi.mock('./agents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./agents')>();
  return {
    ...actual,
    proseSetupAgent: vi.fn(),
    prosePageAgent: vi.fn(),
    styleGuideAgent: vi.fn(),
    pageVisualsAgent: vi.fn(),
    renderPage: vi.fn(),
  };
});

import {
  proseSetupAgent,
  prosePageAgent,
  styleGuideAgent,
  pageVisualsAgent,
  renderPage,
} from './agents';

const mockedProseSetupAgent = vi.mocked(proseSetupAgent);
const mockedProsePageAgent = vi.mocked(prosePageAgent);
const mockedStyleGuideAgent = vi.mocked(styleGuideAgent);
const mockedPageVisualsAgent = vi.mocked(pageVisualsAgent);
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
  customInstructions: [],
  plot: {
    storyArcSummary: 'A hero goes on a journey',
    plotBeats: [
      { purpose: 'setup', description: 'Hero starts journey' },
      { purpose: 'conflict', description: 'Hero faces challenge' },
      { purpose: 'climax', description: 'Hero overcomes' },
      { purpose: 'resolution', description: 'Hero succeeds' },
    ],
    allowCreativeLiberty: true,
  },
};

const mockProseSetup: ProseSetup = {
  logline: 'A hero saves the day',
  theme: 'Courage',
};

const mockProsePage1: ProsePage = {
  summary: 'Page 1',
  text: 'Once upon a time...',
  imageConcept: 'Hero standing',
};

const mockProsePage2: ProsePage = {
  summary: 'Page 2',
  text: 'The end.',
  imageConcept: 'Hero celebrating',
};

const mockProse: Prose = {
  logline: 'A hero saves the day',
  theme: 'Courage',
  pages: [mockProsePage1, mockProsePage2],
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
    mockedProseSetupAgent.mockResolvedValue(mockProseSetup);
    mockedProsePageAgent
      .mockResolvedValueOnce(mockProsePage1)
      .mockResolvedValueOnce(mockProsePage2);
  });

  it('generates prose setup then pages sequentially', async () => {
    const result = await generateProse(mockStoryWithPlot);

    expect(result.title).toBe('Test Story');
    expect(result.prose.logline).toBe('A hero saves the day');
    expect(result.prose.pages).toHaveLength(2);
  });

  it('calls prose setup agent once', async () => {
    await generateProse(mockStoryWithPlot);

    expect(mockedProseSetupAgent).toHaveBeenCalledTimes(1);
    expect(mockedProseSetupAgent).toHaveBeenCalledWith(mockStoryWithPlot);
  });

  it('passes previous pages to prose page agent', async () => {
    await generateProse(mockStoryWithPlot);

    expect(mockedProsePageAgent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      pageNumber: 1,
      previousPages: [],
    }));

    expect(mockedProsePageAgent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      pageNumber: 2,
      previousPages: [mockProsePage1],
    }));
  });

  it('calls onProgress for setup and each page', async () => {
    const onProgress = vi.fn();

    await generateProse(mockStoryWithPlot, { onProgress });

    expect(onProgress).toHaveBeenCalledWith('prose-setup', 'start');
    expect(onProgress).toHaveBeenCalledWith('prose-setup', 'complete');
    expect(onProgress).toHaveBeenCalledWith('prose-page-1', 'start');
    expect(onProgress).toHaveBeenCalledWith('prose-page-1', 'complete');
    expect(onProgress).toHaveBeenCalledWith('prose-page-2', 'start');
    expect(onProgress).toHaveBeenCalledWith('prose-page-2', 'complete');
  });
});

describe('generateVisuals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStyleGuideAgent.mockResolvedValue(mockStyleGuide);
    mockedPageVisualsAgent
      .mockResolvedValueOnce(mockIllustratedPage1)
      .mockResolvedValueOnce(mockIllustratedPage2);
  });

  it('generates style guide then illustrated pages', async () => {
    const result = await generateVisuals(mockStoryWithProse);

    expect(result.title).toBe('Test Story');
    expect(result.visuals.style).toEqual(mockStyleGuide);
    expect(result.visuals.illustratedPages).toHaveLength(2);
  });

  it('calls style guide agent once', async () => {
    await generateVisuals(mockStoryWithProse);

    expect(mockedStyleGuideAgent).toHaveBeenCalledTimes(1);
    expect(mockedStyleGuideAgent).toHaveBeenCalledWith(mockStoryWithProse);
  });

  it('calls page visuals agent for each prose page', async () => {
    await generateVisuals(mockStoryWithProse);

    expect(mockedPageVisualsAgent).toHaveBeenCalledTimes(2);
    expect(mockedPageVisualsAgent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      pageNumber: 1,
      prosePage: mockProsePage1,
    }));
    expect(mockedPageVisualsAgent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      pageNumber: 2,
      prosePage: mockProsePage2,
    }));
  });

  it('calls onProgress for style guide and each page', async () => {
    const onProgress = vi.fn();

    await generateVisuals(mockStoryWithProse, { onProgress });

    expect(onProgress).toHaveBeenCalledWith('style-guide', 'start');
    expect(onProgress).toHaveBeenCalledWith('style-guide', 'complete');
    expect(onProgress).toHaveBeenCalledWith('visuals-page-1', 'start');
    expect(onProgress).toHaveBeenCalledWith('visuals-page-1', 'complete');
    expect(onProgress).toHaveBeenCalledWith('visuals-page-2', 'start');
    expect(onProgress).toHaveBeenCalledWith('visuals-page-2', 'complete');
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
      'landscape'
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
    mockedProseSetupAgent.mockResolvedValue(mockProseSetup);
    mockedStyleGuideAgent.mockResolvedValue(mockStyleGuide);
    mockedProsePageAgent
      .mockResolvedValueOnce(mockProsePage1)
      .mockResolvedValueOnce(mockProsePage2);
    mockedPageVisualsAgent
      .mockResolvedValueOnce(mockIllustratedPage1)
      .mockResolvedValueOnce(mockIllustratedPage2);
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

    // Prose stage
    expect(mockedProseSetupAgent).toHaveBeenCalledTimes(1);
    expect(mockedProsePageAgent).toHaveBeenCalledTimes(2);

    // Visuals stage
    expect(mockedStyleGuideAgent).toHaveBeenCalledTimes(1);
    expect(mockedPageVisualsAgent).toHaveBeenCalledTimes(2);

    // Render stage
    expect(mockedRenderPage).toHaveBeenCalledTimes(2);
  });

  it('calls onProgress for each stage', async () => {
    const onProgress = vi.fn();

    await executePipeline(mockStoryWithPlot, { onProgress });

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
