#!/usr/bin/env npx ts-node
/**
 * Extract art_direction from a full prompt JSON and save as a style preset
 *
 * Usage:
 *   cat my-prompt.json | npx ts-node scripts/add-style.ts
 *   npx ts-node scripts/add-style.ts my-prompt.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';

const STYLES_DIR = path.join(process.cwd(), 'prompts', 'styles');

interface FullPrompt {
  art_direction?: {
    genre?: string[];
    medium?: string[];
    technique?: string[];
    style_strength?: number;
  };
}

interface StylePreset {
  name: string;
  art_direction: {
    genre: string[];
    medium: string[];
    technique: string[];
    style_strength?: number;
  };
}

const readStdin = async (): Promise<string> => {
  const chunks: string[] = [];
  const rl = readline.createInterface({ input: process.stdin });

  for await (const line of rl) {
    chunks.push(line);
  }

  return chunks.join('\n');
};

const prompt = async (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const toKebabCase = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const main = async () => {
  // Read input from file argument or stdin
  let input: string;
  const fileArg = process.argv[2];

  if (fileArg) {
    input = await fs.readFile(fileArg, 'utf-8');
  } else {
    console.log('Paste your prompt JSON (then Ctrl+D when done):');
    input = await readStdin();
  }

  // Parse JSON
  let fullPrompt: FullPrompt;
  try {
    fullPrompt = JSON.parse(input);
  } catch {
    console.error('Error: Invalid JSON input');
    process.exit(1);
  }

  // Extract art_direction
  const artDirection = fullPrompt.art_direction;
  if (!artDirection) {
    console.error('Error: No art_direction found in input');
    process.exit(1);
  }

  // Validate required fields
  if (!artDirection.genre?.length || !artDirection.medium?.length || !artDirection.technique?.length) {
    console.error('Error: art_direction must have genre, medium, and technique arrays');
    process.exit(1);
  }

  // Prompt for name
  const name = await prompt('Style name: ');
  if (!name.trim()) {
    console.error('Error: Name is required');
    process.exit(1);
  }

  // Build preset
  const preset: StylePreset = {
    name: name.trim(),
    art_direction: {
      genre: artDirection.genre,
      medium: artDirection.medium,
      technique: artDirection.technique,
      ...(artDirection.style_strength !== undefined && { style_strength: artDirection.style_strength }),
    },
  };

  // Ensure styles directory exists
  await fs.mkdir(STYLES_DIR, { recursive: true });

  // Save to file
  const filename = `${toKebabCase(name)}.json`;
  const filePath = path.join(STYLES_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(preset, null, 2) + '\n');

  console.log(`\n✓ Saved to: ${filePath}`);
  console.log('\nPreset:');
  console.log(JSON.stringify(preset, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
