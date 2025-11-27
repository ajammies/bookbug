import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executePipeline,
  runProse,
  runVisuals,
  runBook,
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
    proseAgent: vi.fn(),
    visualsAgent: vi.fn(),
    proseSetupAgent: vi.fn(),
    prosePageAgent: vi.fn(),
    styleGuideAgent: vi.fn(),
    pageVisualsAgent: vi.fn(),
    renderPage: vi.fn(),
  };
});

import {
  proseAgent,
  visualsAgent,
  proseSetupAgent,
  prosePageAgent,
  styleGuideAgent,
  pageVisualsAgent,
  renderPage,
} from './agents';

const mockedProseAgent = vi.mocked(proseAgent);
const mockedVisualsAgent = vi.mocked(visualsAgent);
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

describe('executePipeline (incremental)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup incremental agent mocks
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

  it('runs full pipeline page-by-page and returns book stage result', async () => {
    const result = await executePipeline(mockStoryWithPlot);

    expect(result.stage).toBe('book');
    if (result.stage === 'book') {
      expect(result.story.title).toBe('Test Story');
      expect(result.story.prose.logline).toBe('A hero saves the day');
      expect(result.story.prose.pages).toHaveLength(2);
      expect(result.story.visuals.style).toEqual(mockStyleGuide);
      expect(result.story.visuals.illustratedPages).toHaveLength(2);
      expect(result.book.pages).toHaveLength(2);
    }
  });

  it('generates style guide and prose setup upfront', async () => {
    await executePipeline(mockStoryWithPlot);

    expect(mockedStyleGuideAgent).toHaveBeenCalledTimes(1);
    expect(mockedProseSetupAgent).toHaveBeenCalledTimes(1);
  });

  it('processes each page incrementally', async () => {
    await executePipeline(mockStoryWithPlot);

    // Each page agent should be called twice (once per page)
    expect(mockedProsePageAgent).toHaveBeenCalledTimes(2);
    expect(mockedPageVisualsAgent).toHaveBeenCalledTimes(2);
    expect(mockedRenderPage).toHaveBeenCalledTimes(2);
  });

  it('passes previous pages context to prose page agent', async () => {
    await executePipeline(mockStoryWithPlot);

    // First call should have empty previousPages
    expect(mockedProsePageAgent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      pageNumber: 1,
      previousPages: [],
    }));

    // Second call should have first page in previousPages
    expect(mockedProsePageAgent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      pageNumber: 2,
      previousPages: [mockProsePage1],
    }));
  });

  it('stops after prose stage when stopAfter is prose', async () => {
    const result = await executePipeline(mockStoryWithPlot, { stopAfter: 'prose' });

    expect(result.stage).toBe('prose');
    if (result.stage === 'prose') {
      expect(result.prose.pages).toHaveLength(2);
    }
    // Should not call render
    expect(mockedRenderPage).not.toHaveBeenCalled();
  });

  it('stops after visuals stage when stopAfter is visuals', async () => {
    const result = await executePipeline(mockStoryWithPlot, { stopAfter: 'visuals' });

    expect(result.stage).toBe('visuals');
    if (result.stage === 'visuals') {
      expect(result.storyWithProse.prose.pages).toHaveLength(2);
      expect(result.visuals.illustratedPages).toHaveLength(2);
    }
    expect(mockedRenderPage).not.toHaveBeenCalled();
  });

  it('calls onProgress callbacks for setup and rendering', async () => {
    const onProgress = vi.fn();

    await executePipeline(mockStoryWithPlot, { onProgress });

    // Setup phase
    expect(onProgress).toHaveBeenCalledWith('setup', 'start');
    expect(onProgress).toHaveBeenCalledWith('setup', 'complete', expect.any(Object));
    // Render phase (page callbacks)
    expect(onProgress).toHaveBeenCalledWith('page-1', 'start');
    expect(onProgress).toHaveBeenCalledWith('page-1', 'complete', expect.any(Object));
    expect(onProgress).toHaveBeenCalledWith('page-2', 'start');
    expect(onProgress).toHaveBeenCalledWith('page-2', 'complete', expect.any(Object));
    // Final
    expect(onProgress).toHaveBeenCalledWith('complete', 'complete', expect.any(Object));
  });

  it('calls onPageComplete callback after each page renders', async () => {
    const onPageComplete = vi.fn();

    await executePipeline(mockStoryWithPlot, { onPageComplete });

    expect(onPageComplete).toHaveBeenCalledTimes(2);
    expect(onPageComplete).toHaveBeenCalledWith(1, expect.objectContaining({ pageNumber: 1 }));
    expect(onPageComplete).toHaveBeenCalledWith(2, expect.objectContaining({ pageNumber: 2 }));
  });

  it('saves artifacts when outputManager is provided', async () => {
    const outputManager: StoryOutputManager = {
      folder: '/test/folder',
      saveBrief: vi.fn(),
      saveBlurb: vi.fn(),
      saveProse: vi.fn(),
      saveStory: vi.fn(),
      saveBook: vi.fn(),
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

    expect(result.stage).toBe('book');
    // No errors thrown, pipeline completes successfully
  });

  it('saves prose even when stopping early', async () => {
    const outputManager: StoryOutputManager = {
      folder: '/test/folder',
      saveBrief: vi.fn(),
      saveBlurb: vi.fn(),
      saveProse: vi.fn(),
      saveStory: vi.fn(),
      saveBook: vi.fn(),
    };

    await executePipeline(mockStoryWithPlot, { stopAfter: 'prose', outputManager });

    expect(outputManager.saveProse).toHaveBeenCalled();
    expect(outputManager.saveStory).not.toHaveBeenCalled();
    expect(outputManager.saveBook).not.toHaveBeenCalled();
  });
});

describe('runProse (batch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedProseAgent.mockResolvedValue(mockProse);
  });

  it('runs prose agent and returns prose', async () => {
    const result = await runProse(mockStoryWithPlot);

    expect(result).toEqual(mockProse);
    expect(mockedProseAgent).toHaveBeenCalledWith(mockStoryWithPlot);
  });
});

describe('runVisuals (batch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedVisualsAgent.mockResolvedValue(mockVisuals);
  });

  it('runs visuals agent and returns visual direction', async () => {
    const storyWithProse: StoryWithProse = { ...mockStoryWithPlot, prose: mockProse };

    const result = await runVisuals(storyWithProse);

    expect(result).toEqual(mockVisuals);
    expect(mockedVisualsAgent).toHaveBeenCalledWith(storyWithProse);
  });
});

describe('runBook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRenderPage.mockImplementation(async (_story, pageNumber) => ({
      pageNumber,
      url: `https://example.com/page${pageNumber}.png`,
    }));
  });

  const mockComposedStory: ComposedStory = {
    ...mockStoryWithPlot,
    prose: mockProse,
    visuals: mockVisuals,
  };

  it('renders all pages and creates book', async () => {
    const result = await runBook(mockComposedStory);

    expect(result.storyTitle).toBe('Test Story');
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]?.pageNumber).toBe(1);
    expect(result.pages[1]?.pageNumber).toBe(2);
  });

  it('uses mock renderer when mock is true', async () => {
    const result = await runBook(mockComposedStory, { mock: true });

    expect(mockedRenderPage).not.toHaveBeenCalled();
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]?.url).toContain('placeholder.com');
  });

  it('calls onPageRendered callback for each page', async () => {
    const onPageRendered = vi.fn();

    await runBook(mockComposedStory, { onPageRendered });

    expect(onPageRendered).toHaveBeenCalledTimes(2);
    expect(onPageRendered).toHaveBeenCalledWith(expect.objectContaining({ pageNumber: 1 }));
    expect(onPageRendered).toHaveBeenCalledWith(expect.objectContaining({ pageNumber: 2 }));
  });

  it('uses specified format', async () => {
    await runBook(mockComposedStory, { format: 'landscape' });

    expect(mockedRenderPage).toHaveBeenCalledWith(
      mockComposedStory,
      expect.any(Number),
      'landscape'
    );
  });
});
