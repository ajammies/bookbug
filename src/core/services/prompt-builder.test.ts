import { describe, it, expect } from 'vitest';
import { buildBeatPrompt, buildSimplePrompt } from './prompt-builder';
import type { StoryBeat, VisualStyleGuide, StoryCharacter } from '../schemas';

describe('buildBeatPrompt', () => {
  const minimalStyle: VisualStyleGuide = {
    art_direction: {
      genre: ['fantasy'],
      medium: ['digital illustration'],
      technique: ['soft shading'],
    },
    setting: {
      landmarks: [],
      diegetic_lights: [],
    },
  };

  const minimalBeat: StoryBeat = {
    order: 1,
    purpose: 'setup',
    summary: 'Luna discovers a magical garden gate',
    emotion: 'curious',
    characters: [],
    shot: {
      size: 'wide',
      angle: 'eye_level',
    },
  };

  const characters: Record<string, StoryCharacter> = {
    luna: {
      name: 'Luna',
      description: 'A fluffy white rabbit with big curious eyes',
      traits: ['curious', 'brave'],
      notes: [],
    },
  };

  it('includes beat summary in prompt', () => {
    const { prompt } = buildBeatPrompt(minimalBeat, minimalStyle, {});
    expect(prompt).toContain('Luna discovers a magical garden gate');
  });

  it('includes emotion in prompt', () => {
    const { prompt } = buildBeatPrompt(minimalBeat, minimalStyle, {});
    expect(prompt).toContain('curious mood');
  });

  it('includes art style from style guide', () => {
    const { prompt } = buildBeatPrompt(minimalBeat, minimalStyle, {});
    expect(prompt).toContain('fantasy');
    expect(prompt).toContain('digital illustration');
  });

  it('includes shot composition', () => {
    const { prompt } = buildBeatPrompt(minimalBeat, minimalStyle, {});
    expect(prompt).toContain('wide shot');
    expect(prompt).toContain('eye level');
  });

  it('includes character details when present', () => {
    const beatWithCharacter: StoryBeat = {
      ...minimalBeat,
      characters: [
        {
          id: 'luna',
          expression: 'surprised',
          pose: 'standing upright',
          focus: 'primary',
        },
      ],
    };

    const { prompt } = buildBeatPrompt(beatWithCharacter, minimalStyle, characters);
    expect(prompt).toContain('Luna');
    expect(prompt).toContain('fluffy white rabbit');
    expect(prompt).toContain('surprised expression');
    expect(prompt).toContain('standing upright pose');
  });

  it('includes setting details from beat override', () => {
    const beatWithSetting: StoryBeat = {
      ...minimalBeat,
      setting: {
        location: 'enchanted forest',
        time_of_day: 'golden hour',
        season: 'spring',
        landmarks: [],
        diegetic_lights: [],
      },
    };

    const { prompt } = buildBeatPrompt(beatWithSetting, minimalStyle, {});
    expect(prompt).toContain('enchanted forest');
    expect(prompt).toContain('golden hour');
    expect(prompt).toContain('spring');
  });

  it('falls back to global setting when beat has no setting', () => {
    const styleWithSetting: VisualStyleGuide = {
      ...minimalStyle,
      setting: {
        location: 'magical garden',
        biome: 'temperate forest',
        landmarks: [],
        diegetic_lights: [],
      },
    };

    const { prompt } = buildBeatPrompt(minimalBeat, styleWithSetting, {});
    expect(prompt).toContain('magical garden');
  });

  it('includes lighting when present', () => {
    const styleWithLighting: VisualStyleGuide = {
      ...minimalStyle,
      lighting: {
        scheme: ['natural', 'soft'],
        direction: ['side'],
        quality: 'diffused',
        temperature_K: 5500,
      },
    };

    const { prompt } = buildBeatPrompt(minimalBeat, styleWithLighting, {});
    expect(prompt).toContain('natural soft');
    expect(prompt).toContain('side lighting');
  });

  it('includes warm lighting description for low temperature', () => {
    const styleWithWarmLight: VisualStyleGuide = {
      ...minimalStyle,
      lighting: {
        scheme: [],
        direction: [],
        temperature_K: 3000,
      },
    };

    const { prompt } = buildBeatPrompt(minimalBeat, styleWithWarmLight, {});
    expect(prompt).toContain('warm lighting');
  });

  it('includes color palette when present', () => {
    const styleWithColor: VisualStyleGuide = {
      ...minimalStyle,
      color_script: {
        palette: ['soft pink', 'lavender', 'mint green'],
        accent_colors: [],
        harmony: 'analogous',
        saturation_level: 'medium',
      },
    };

    const { prompt } = buildBeatPrompt(minimalBeat, styleWithColor, {});
    expect(prompt).toContain('soft pink');
    expect(prompt).toContain('analogous color harmony');
  });

  it('includes picture book qualifier', () => {
    const { prompt } = buildBeatPrompt(minimalBeat, minimalStyle, {});
    expect(prompt).toContain("children's picture book");
  });

  it('generates negative prompt with defaults', () => {
    const { negativePrompt } = buildBeatPrompt(minimalBeat, minimalStyle, {});
    expect(negativePrompt).toContain('blurry');
    expect(negativePrompt).toContain('low quality');
    expect(negativePrompt).toContain('scary');
    expect(negativePrompt).toContain('violent');
  });

  it('includes custom constraints in negative prompt', () => {
    const styleWithConstraints: VisualStyleGuide = {
      ...minimalStyle,
      constraints: {
        negative: ['photorealistic', 'dark themes'],
      },
    };

    const { negativePrompt } = buildBeatPrompt(minimalBeat, styleWithConstraints, {});
    expect(negativePrompt).toContain('photorealistic');
    expect(negativePrompt).toContain('dark themes');
  });

  it('handles composition rules', () => {
    const beatWithComposition: StoryBeat = {
      ...minimalBeat,
      shot: {
        size: 'medium',
        angle: 'three_quarter_view',
        composition: ['thirds_composition', 'negative_space'],
      },
    };

    const { prompt } = buildBeatPrompt(beatWithComposition, minimalStyle, {});
    expect(prompt).toContain('rule of thirds');
    expect(prompt).toContain('negative space');
  });
});

describe('buildSimplePrompt', () => {
  it('generates watercolor style prompt', () => {
    const { prompt } = buildSimplePrompt('a rabbit in a garden', 'watercolor');
    expect(prompt).toContain('watercolor illustration');
    expect(prompt).toContain('a rabbit in a garden');
    expect(prompt).toContain("children's picture book");
  });

  it('generates digital style prompt', () => {
    const { prompt } = buildSimplePrompt('a rabbit in a garden', 'digital');
    expect(prompt).toContain('digital illustration');
  });

  it('generates cartoon style prompt', () => {
    const { prompt } = buildSimplePrompt('a rabbit in a garden', 'cartoon');
    expect(prompt).toContain('cartoon style');
  });

  it('generates realistic style prompt', () => {
    const { prompt } = buildSimplePrompt('a rabbit in a garden', 'realistic');
    expect(prompt).toContain('realistic illustration');
  });

  it('defaults to digital style', () => {
    const { prompt } = buildSimplePrompt('a rabbit in a garden');
    expect(prompt).toContain('digital illustration');
  });

  it('includes appropriate negative prompt', () => {
    const { negativePrompt } = buildSimplePrompt('a rabbit in a garden');
    expect(negativePrompt).toContain('blurry');
    expect(negativePrompt).toContain('scary');
    expect(negativePrompt).toContain('inappropriate');
  });
});
