/**
 * Progress Messages Agent
 *
 * Generates witty progress messages based on story context.
 * Used to display engaging updates during prose/visuals generation.
 */
import { generateObject } from '../services/ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import type { StoryWithPlot } from '../schemas';
import type { Logger } from '../utils/logger';

const ProgressMessagesSchema = z.object({
  messages: z
    .array(z.string())
    .min(10)
    .max(15)
    .describe('Witty progress messages mixing character actions and narrator commentary'),
});

const SYSTEM_PROMPT = `Generate 10-15 witty progress messages for a children's book creation process.

Mix these styles:
- Character actions: "[Character name] is practicing their hero poses..."
- Behind the scenes: "Meanwhile, [character] bounces impatiently..."
- Narrator commentary: "Our heroes have no idea what awaits them..."
- Creative process: "Sprinkling extra magic dust on page 5..."

Guidelines:
- Reference specific character names and traits from the story
- Keep messages short (5-12 words)
- Be playful and engaging for parents/kids watching
- Vary the style across messages
- Don't spoil plot twists`;

export const progressMessagesAgent = async (
  story: StoryWithPlot,
  logger?: Logger
): Promise<string[]> => {
  const context = {
    title: story.title,
    characters: story.characters.map((c) => ({ name: c.name, traits: c.traits })),
    setting: story.setting,
    tone: story.tone,
  };

  const { object } = await generateObject(
    {
      model: anthropic('claude-3-5-haiku-latest'),
      schema: ProgressMessagesSchema,
      system: SYSTEM_PROMPT,
      prompt: JSON.stringify(context, null, 2),
      maxOutputTokens: 1000,
    },
    logger,
    'progressMessagesAgent'
  );

  return object.messages;
};
