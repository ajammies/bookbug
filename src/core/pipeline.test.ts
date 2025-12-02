import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runPipelineIncremental,
  generateProse,
  generateVisuals,
  renderBook,
  type PipelineState,
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

vi.mock('./agents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./agents')>();
  return {
    ...actual,
    proseAgent: vi.fn(),
    proseSetupAgent: vi.fn(),
    prosePageAgent: vi.fn(),
    pageVisualsAgent: vi.fn(),
    visualsAgent: vi.fn(),
    styleGuideAgent: vi.fn(),
    generateCharacterAppearances: vi.fn(),
    generateCharacterDesigns: vi.fn(),
    renderPage: vi.fn(),
  };
});

import {
  proseAgent,
  proseSetupAgent,
  prosePageAgent,
  pageVisualsAgent,
  visualsAgent,
  styleGuideAgent,
  generateCharacterAppearances,
  generateCharacterDesigns,
  renderPage,
} from './agents';

const mockedProseAgent = vi.mocked(proseAgent);
const mockedProseSetupAgent = vi.mocked(proseSetupAgent);
const mockedProsePageAgent = vi.mocked(prosePageAgent);
const mockedPageVisualsAgent = vi.mocked(pageVisualsAgent);
const mockedVisualsAgent = vi.mocked(visualsAgent);
const mockedStyleGuideAgent = vi.mocked(styleGuideAgent);
const mockedGenerateCharacterAppearances = vi.mocked(generateCharacterAppearances);
const mockedGenerateCharacterDesigns = vi.mocked(generateCharacterDesigns);
const mockedRenderPage = vi.mocked(renderPage);

const mockStoryWithPlot: StoryWithPlot = {
  title: 'Test Story',
  storyArc: 'A test adventure',
  setting: 'Test land',
  ageRange: { min: 4, max: 8 },
  pageCount: 2,
  characters: [{ name: 'Hero', description: 'The main character', personalityTraits: [], notes: [] }],
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
  art_style: { genre: ['fantasy'], medium: ['watercolor'], technique: ['soft edges'] },
  setting: { landmarks: [], diegetic_lights: [] },
};

const mockIllustratedPage1: IllustratedPage = {
  pageNumber: 1,
  beats: [{ order: 1, purpose: 'setup', summary: 'Hero stands', emotion: 'determined', characters: [], shot: { size: 'wide', angle: 'eye_level' } }],
};

const mockIllustratedPage2: IllustratedPage = {
  pageNumber: 2,
  beats: [{ order: 1, purpose: 'payoff', summary: 'Hero celebrates', emotion: 'joyful', characters: [], shot: { size: 'medium', angle: 'eye_level' } }],
};

const mockVisuals: VisualDirection = {
  style: mockStyleGuide,
  illustratedPages: [mockIllustratedPage1, mockIllustratedPage2],
};

const mockStoryWithProse: StoryWithProse = { ...mockStoryWithPlot, prose: mockProse };
const mockComposedStory: ComposedStory = { ...mockStoryWithProse, visuals: mockVisuals };

describe('generateProse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedProseAgent.mockResolvedValue(mockProse);
  });

  it('generates prose and returns StoryWithProse', async () => {
    const result = await generateProse(mockStoryWithPlot);
    expect(result.title).toBe('Test Story');
    expect(result.prose.logline).toBe('A hero saves the day');
    expect(result.prose.pages).toHaveLength(2);
  });

  it('calls prose agent with story', async () => {
    await generateProse(mockStoryWithPlot);
    expect(mockedProseAgent).toHaveBeenCalledTimes(1);
    expect(mockedProseAgent).toHaveBeenCalledWith(mockStoryWithPlot, undefined);
  });
});

describe('generateVisuals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedVisualsAgent.mockResolvedValue(mockVisuals);
  });

  it('generates visuals and returns ComposedStory', async () => {
    const result = await generateVisuals(mockStoryWithProse);
    expect(result.title).toBe('Test Story');
    expect(result.visuals.style).toEqual(mockStyleGuide);
    expect(result.visuals.illustratedPages).toHaveLength(2);
  });

  it('calls visuals agent with story', async () => {
    await generateVisuals(mockStoryWithProse);
    expect(mockedVisualsAgent).toHaveBeenCalledTimes(1);
    expect(mockedVisualsAgent).toHaveBeenCalledWith(mockStoryWithProse, undefined);
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
      savePlot: vi.fn(),
      saveProse: vi.fn(),
      saveStory: vi.fn(),
      saveBook: vi.fn(),
      savePageImage: vi.fn().mockResolvedValue('/test/folder/assets/page-1.png'),
      saveCharacterDesign: vi.fn().mockResolvedValue('assets/characters/test.png'),
      saveQualityResult: vi.fn().mockResolvedValue('assets/quality/page-1.json'),
      saveFailedImage: vi.fn().mockResolvedValue('assets/failed/page-1-attempt-1.png'),
    };

    await renderBook(mockComposedStory, { outputManager });
    expect(outputManager.savePageImage).toHaveBeenCalledTimes(2);
  });

  it('calls onStep for each page', async () => {
    const onStep = vi.fn();
    await renderBook(mockComposedStory, { onStep });
    expect(onStep).toHaveBeenCalledWith('render-1');
    expect(onStep).toHaveBeenCalledWith('render-2');
  });
});

describe('runPipelineIncremental', () => {
  const mockProseSetup = { logline: mockProse.logline, theme: mockProse.theme, styleNotes: mockProse.styleNotes };
  const mockPipelineState: PipelineState = { history: [], brief: mockStoryWithPlot, plot: mockStoryWithPlot.plot };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedStyleGuideAgent.mockResolvedValue(mockStyleGuide);
    mockedProseSetupAgent.mockResolvedValue(mockProseSetup);
    mockedGenerateCharacterAppearances.mockResolvedValue(mockStoryWithPlot.characters);
    mockedGenerateCharacterDesigns.mockResolvedValue([
      { character: mockStoryWithPlot.characters[0]!, spriteSheetUrl: 'https://example.com/sprite.png' },
    ]);
    mockedProsePageAgent.mockImplementation(async ({ pageNumber }) => mockProse.pages[pageNumber - 1]!);
    mockedPageVisualsAgent.mockImplementation(async ({ pageNumber }) =>
      pageNumber === 1 ? mockIllustratedPage1 : mockIllustratedPage2
    );
    mockedRenderPage.mockImplementation(async (_story, pageNumber) => ({
      pageNumber,
      url: `https://example.com/page${pageNumber}.png`,
    }));
  });

  it('runs full pipeline and returns story and book', async () => {
    const result = await runPipelineIncremental(mockPipelineState);
    expect(result.story.title).toBe('Test Story');
    expect(result.story.prose.logline).toBe('A hero saves the day');
    expect(result.story.visuals.style).toEqual(mockStyleGuide);
    expect(result.book.pages).toHaveLength(2);
  });

  it('processes pages incrementally', async () => {
    await runPipelineIncremental(mockPipelineState);
    expect(mockedProsePageAgent).toHaveBeenCalledTimes(2);
    expect(mockedPageVisualsAgent).toHaveBeenCalledTimes(2);
    expect(mockedRenderPage).toHaveBeenCalledTimes(2);
  });

  it('calls ui.progress for each stage', async () => {
    const ui = { progress: vi.fn(), prompt: vi.fn() };
    await runPipelineIncremental(mockPipelineState, { ui });
    expect(ui.progress).toHaveBeenCalledWith('Creating style guide...');
    expect(ui.progress).toHaveBeenCalledWith('Setting up prose...');
    expect(ui.progress).toHaveBeenCalledWith('Designing character appearances...');
    expect(ui.progress).toHaveBeenCalledWith('Generating character designs...');
    expect(ui.progress).toHaveBeenCalledWith('Writing page 1...');
    expect(ui.progress).toHaveBeenCalledWith('Directing page 1...');
    expect(ui.progress).toHaveBeenCalledWith('Rendering page 1...');
    expect(ui.progress).toHaveBeenCalledWith('Writing page 2...');
    expect(ui.progress).toHaveBeenCalledWith('Directing page 2...');
    expect(ui.progress).toHaveBeenCalledWith('Rendering page 2...');
  });

  it('saves artifacts when outputManager is provided', async () => {
    const outputManager: StoryOutputManager = {
      folder: '/test/folder',
      saveBrief: vi.fn(),
      savePlot: vi.fn(),
      saveProse: vi.fn(),
      saveStory: vi.fn(),
      saveBook: vi.fn(),
      savePageImage: vi.fn().mockResolvedValue('/test/folder/assets/page-1.png'),
      saveCharacterDesign: vi.fn().mockResolvedValue('assets/characters/test.png'),
      saveQualityResult: vi.fn().mockResolvedValue('assets/quality/page-1.json'),
      saveFailedImage: vi.fn().mockResolvedValue('assets/failed/page-1-attempt-1.png'),
    };

    await runPipelineIncremental(mockPipelineState, { outputManager });
    expect(outputManager.saveProse).toHaveBeenCalled();
    expect(outputManager.saveStory).toHaveBeenCalled();
    expect(outputManager.saveBook).toHaveBeenCalled();
  });

  it('uses existing state when provided', async () => {
    const stateWithExistingArtifacts: PipelineState = {
      ...mockPipelineState,
      styleGuide: mockStyleGuide,
      proseSetup: mockProseSetup,
    };

    await runPipelineIncremental(stateWithExistingArtifacts);
    expect(mockedStyleGuideAgent).not.toHaveBeenCalled();
    expect(mockedProseSetupAgent).not.toHaveBeenCalled();
  });

  it('throws when plot is missing', async () => {
    const stateWithoutPlot: PipelineState = { history: [], brief: mockStoryWithPlot, plot: undefined };
    await expect(runPipelineIncremental(stateWithoutPlot)).rejects.toThrow('requires plot');
  });
});
