import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executePipeline,
  runProse,
  runVisuals,
  runBook,
} from './pipeline';
import type { StoryWithPlot, StoryWithProse, ComposedStory, Prose, VisualDirection } from './schemas';
import type { StoryOutputManager } from '../cli/utils/output';

// Mock the agents
vi.mock('./agents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./agents')>();
  return {
    ...actual,
    proseAgent: vi.fn(),
    visualsAgent: vi.fn(),
    renderPage: vi.fn(),
  };
});

import { proseAgent, visualsAgent, renderPage } from './agents';

const mockedProseAgent = vi.mocked(proseAgent);
const mockedVisualsAgent = vi.mocked(visualsAgent);
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

const mockProse: Prose = {
  logline: 'A hero saves the day',
  theme: 'Courage',
  pages: [
    { summary: 'Page 1', text: 'Once upon a time...', imageConcept: 'Hero standing' },
    { summary: 'Page 2', text: 'The end.', imageConcept: 'Hero celebrating' },
  ],
};

const mockVisuals: VisualDirection = {
  style: {
    art_direction: {
      genre: ['fantasy'],
      medium: ['watercolor'],
      technique: ['soft edges'],
    },
    setting: {
      landmarks: [],
      diegetic_lights: [],
    },
  },
  illustratedPages: [
    {
      pageNumber: 1,
      beats: [{
        order: 1,
        purpose: 'setup',
        summary: 'Hero stands',
        emotion: 'determined',
        characters: [],
        shot: { size: 'wide', angle: 'eye_level' },
      }],
    },
    {
      pageNumber: 2,
      beats: [{
        order: 1,
        purpose: 'payoff',
        summary: 'Hero celebrates',
        emotion: 'joyful',
        characters: [],
        shot: { size: 'medium', angle: 'eye_level' },
      }],
    },
  ],
};

describe('executePipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedProseAgent.mockResolvedValue(mockProse);
    mockedVisualsAgent.mockResolvedValue(mockVisuals);
    mockedRenderPage.mockImplementation(async (_story, pageNumber) => ({
      pageNumber,
      url: `https://example.com/page${pageNumber}.png`,
    }));
  });

  it('runs full pipeline and returns book stage result', async () => {
    const result = await executePipeline(mockStoryWithPlot);

    expect(result.stage).toBe('book');
    if (result.stage === 'book') {
      expect(result.story.title).toBe('Test Story');
      expect(result.story.prose).toEqual(mockProse);
      expect(result.story.visuals).toEqual(mockVisuals);
      expect(result.book.pages).toHaveLength(2);
    }
  });

  it('stops after prose stage when stopAfter is prose', async () => {
    const result = await executePipeline(mockStoryWithPlot, { stopAfter: 'prose' });

    expect(result.stage).toBe('prose');
    if (result.stage === 'prose') {
      expect(result.storyWithPlot).toEqual(mockStoryWithPlot);
      expect(result.prose).toEqual(mockProse);
    }
    expect(mockedVisualsAgent).not.toHaveBeenCalled();
    expect(mockedRenderPage).not.toHaveBeenCalled();
  });

  it('stops after visuals stage when stopAfter is visuals', async () => {
    const result = await executePipeline(mockStoryWithPlot, { stopAfter: 'visuals' });

    expect(result.stage).toBe('visuals');
    if (result.stage === 'visuals') {
      expect(result.storyWithProse.prose).toEqual(mockProse);
      expect(result.visuals).toEqual(mockVisuals);
    }
    expect(mockedRenderPage).not.toHaveBeenCalled();
  });

  it('calls onProgress callbacks at each stage', async () => {
    const onProgress = vi.fn();

    await executePipeline(mockStoryWithPlot, { onProgress });

    expect(onProgress).toHaveBeenCalledWith('prose', 'start');
    expect(onProgress).toHaveBeenCalledWith('prose', 'complete', mockProse);
    expect(onProgress).toHaveBeenCalledWith('visuals', 'start');
    expect(onProgress).toHaveBeenCalledWith('visuals', 'complete', mockVisuals);
    expect(onProgress).toHaveBeenCalledWith('renderer', 'start');
    expect(onProgress).toHaveBeenCalledWith('renderer', 'complete', expect.any(Object));
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
      expect.objectContaining({ prose: mockProse })
    );
    expect(outputManager.saveStory).toHaveBeenCalledWith(
      expect.objectContaining({ visuals: mockVisuals })
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

describe('runProse', () => {
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

describe('runVisuals', () => {
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
