import { describe, it, expect, vi, beforeEach } from 'vitest';
import { manuscriptAgent, type ManuscriptResult } from './manuscript-agent';

vi.mock('../services/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/ai')>();
  return {
    ...actual,
    generateObject: vi.fn(),
  };
});

vi.mock('../config', () => ({
  getModel: vi.fn(() => 'mock-model'),
}));

import { generateObject } from '../services/ai';

const mockGenerateObject = vi.mocked(generateObject);

const mockResult = <T>(object: T) => ({ object }) as unknown as Awaited<ReturnType<typeof generateObject>>;

const SAMPLE_MANUSCRIPT = `The Little Star Who Lost Her Sparkle

Luna was the smallest star in the night sky. She lived high above the sleepy town of Willowbrook, twinkling beside her mother and father.

One evening, Luna noticed something terrible. Her light was fading! "Mama, I'm scared," she whispered.

"Don't worry, little one," said her mother. "Sometimes stars need to rest."

But Luna couldn't rest. She tumbled down through the clouds, landing softly in a meadow.

A curious rabbit hopped over. "Why are you so dim?" he asked.

"I've lost my sparkle," Luna said sadly.

The rabbit thought for a moment. "My friend the owl is very wise. Maybe she can help."

Together, they found the owl in her old oak tree. "To find your sparkle," the owl said, "you must help someone else first."

Luna looked around. A little mouse was shivering in the cold. Luna wrapped her last bit of warmth around him.

Suddenly, Luna began to glow brighter than ever before! "Kindness," the owl smiled, "is the brightest light of all."

Luna floated back up to the sky, her sparkle restored. And every night, she remembered: true light comes from helping others.

The End`;

describe('manuscriptAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves exact manuscript text in ProsePage.text', async () => {
    const pageTexts = [
      'Luna was the smallest star in the night sky. She lived high above the sleepy town of Willowbrook, twinkling beside her mother and father.',
      'One evening, Luna noticed something terrible. Her light was fading! "Mama, I\'m scared," she whispered.',
    ];

    mockGenerateObject.mockResolvedValue(mockResult({
      story: {
        title: 'The Little Star Who Lost Her Sparkle',
        storyArc: 'A star loses her sparkle and discovers that kindness restores it',
        setting: 'Night sky above the sleepy town of Willowbrook',
        characters: [
          { name: 'Luna', description: 'A small star who loses her sparkle' },
        ],
        plotBeats: [
          { purpose: 'setup', description: 'Luna is introduced as a small star' },
          { purpose: 'conflict', description: 'Luna loses her sparkle' },
          { purpose: 'payoff', description: 'Luna regains her sparkle through kindness' },
        ],
      },
      proseSetup: {
        logline: 'A little star discovers that kindness is the brightest light of all.',
        theme: 'True light comes from helping others',
      },
      prosePages: [
        { text: pageTexts[0], summary: 'Introduction of Luna', imageConcept: 'A small star twinkling in the night sky' },
        { text: pageTexts[1], summary: 'Luna notices her fading light', imageConcept: 'Luna looking worried as her light dims' },
      ],
    }));

    const result = await manuscriptAgent(SAMPLE_MANUSCRIPT);

    expect(result.prosePages[0]!.text).toBe(pageTexts[0]);
    expect(result.prosePages[1]!.text).toBe(pageTexts[1]);
  });

  it('generates valid Story with all required fields', async () => {
    mockGenerateObject.mockResolvedValue(mockResult({
      story: {
        title: 'The Little Star',
        storyArc: 'A star learns about kindness',
        setting: 'Night sky',
        characters: [
          { name: 'Luna', description: 'A small star' },
          { name: 'Owl', description: 'A wise owl' },
        ],
        plotBeats: [
          { purpose: 'setup', description: 'Luna is introduced' },
          { purpose: 'conflict', description: 'Luna loses her sparkle' },
          { purpose: 'payoff', description: 'Luna regains sparkle' },
        ],
      },
      proseSetup: {
        logline: 'A star learns about kindness.',
        theme: 'Kindness',
      },
      prosePages: [
        { text: 'Page 1 text', summary: 'Summary 1', imageConcept: 'Concept 1' },
      ],
    }));

    const result = await manuscriptAgent(SAMPLE_MANUSCRIPT);

    expect(result.story.title).toBe('The Little Star');
    expect(result.story.storyArc).toBeDefined();
    expect(result.story.setting).toBeDefined();
    expect(result.story.characters).toHaveLength(2);
    expect(result.story.plotBeats.length).toBeGreaterThanOrEqual(3);
  });

  it('extracts ProseSetup with logline and theme', async () => {
    mockGenerateObject.mockResolvedValue(mockResult({
      story: {
        title: 'Test',
        storyArc: 'Arc',
        setting: 'Setting',
        characters: [{ name: 'Char', description: 'Desc' }],
        plotBeats: [
          { purpose: 'setup', description: 'Setup' },
          { purpose: 'conflict', description: 'Conflict' },
          { purpose: 'payoff', description: 'Resolution' },
        ],
      },
      proseSetup: {
        logline: 'A little star discovers kindness.',
        theme: 'Kindness is the brightest light',
        styleNotes: 'Warm and gentle tone',
      },
      prosePages: [
        { text: 'Text', summary: 'Summary', imageConcept: 'Concept' },
      ],
    }));

    const result = await manuscriptAgent(SAMPLE_MANUSCRIPT);

    expect(result.proseSetup.logline).toBe('A little star discovers kindness.');
    expect(result.proseSetup.theme).toBe('Kindness is the brightest light');
    expect(result.proseSetup.styleNotes).toBe('Warm and gentle tone');
  });

  it('generates summary and imageConcept for each page', async () => {
    mockGenerateObject.mockResolvedValue(mockResult({
      story: {
        title: 'Test',
        storyArc: 'Arc',
        setting: 'Setting',
        characters: [{ name: 'Char', description: 'Desc' }],
        plotBeats: [
          { purpose: 'setup', description: 'Setup' },
          { purpose: 'conflict', description: 'Conflict' },
          { purpose: 'payoff', description: 'Resolution' },
        ],
      },
      proseSetup: {
        logline: 'Logline',
        theme: 'Theme',
      },
      prosePages: [
        { text: 'Page text', summary: 'What happens on this page', imageConcept: 'Visual description for illustration' },
        { text: 'More text', summary: 'What happens next', imageConcept: 'Another visual description' },
      ],
    }));

    const result = await manuscriptAgent(SAMPLE_MANUSCRIPT);

    for (const page of result.prosePages) {
      expect(page.summary).toBeDefined();
      expect(page.summary.length).toBeGreaterThan(0);
      expect(page.imageConcept).toBeDefined();
      expect(page.imageConcept.length).toBeGreaterThan(0);
    }
  });

  it('passes logger to generateObject', async () => {
    const logger = { debug: vi.fn(), info: vi.fn(), error: vi.fn() } as unknown as import('../utils/logger').Logger;

    mockGenerateObject.mockResolvedValue(mockResult({
      story: {
        title: 'Test',
        storyArc: 'Arc',
        setting: 'Setting',
        characters: [{ name: 'Char', description: 'Desc' }],
        plotBeats: [
          { purpose: 'setup', description: 'Setup' },
          { purpose: 'conflict', description: 'Conflict' },
          { purpose: 'payoff', description: 'Resolution' },
        ],
      },
      proseSetup: { logline: 'Logline', theme: 'Theme' },
      prosePages: [{ text: 'Text', summary: 'Summary', imageConcept: 'Concept' }],
    }));

    await manuscriptAgent(SAMPLE_MANUSCRIPT, { logger });

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.any(Object),
      logger,
      'manuscriptAgent'
    );
  });

  it('throws on empty manuscript', async () => {
    await expect(manuscriptAgent('')).rejects.toThrow('Manuscript cannot be empty');
    await expect(manuscriptAgent('   ')).rejects.toThrow('Manuscript cannot be empty');
  });
});
