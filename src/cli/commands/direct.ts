import { Command } from 'commander';
import { runVisuals } from '../../core/pipeline';
import { StoryWithProseSchema, type VisualDirection } from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { getOrCreateOutputManager } from '../utils/output';

/**
 * Display visual direction summary
 */
const displayVisuals = (visuals: VisualDirection): void => {
  console.log('\n🎨 Visual direction created:');
  console.log(`  Style: ${visuals.style.art_direction.genre.join(', ') || 'custom'}`);
  console.log(`  Pages: ${visuals.illustratedPages.length}`);
  const totalBeats = visuals.illustratedPages.reduce((sum, p) => sum + p.beats.length, 0);
  console.log(`  Total beats: ${totalBeats}`);
};

export const directCommand = new Command('direct')
  .description('Create visual direction from a StoryWithProse')
  .argument('<prose-file>', 'Path to StoryWithProse JSON file (prose.json)')
  .option('-o, --output <path>', 'Output file path for JSON')
  .action(async (proseFile: string, options: { output?: string }) => {
    const spinner = createSpinner();

    try {
      // Load and validate story with prose
      spinner.start('Loading story...');
      const fs = await import('fs/promises');
      const storyJson = await fs.readFile(proseFile, 'utf-8');
      const storyWithProse = StoryWithProseSchema.parse(JSON.parse(storyJson));
      spinner.succeed('Story loaded');

      // Generate visual direction
      spinner.start('Creating visual direction...');
      const visuals = await runVisuals(storyWithProse);
      spinner.succeed('Visual direction complete');

      displayVisuals(visuals);

      // Save to story folder
      const outputManager = await getOrCreateOutputManager(proseFile, storyWithProse.title);
      // Save the full ComposedStory
      const composedStory = { ...storyWithProse, visuals };
      await outputManager.saveStory(composedStory);
      console.log(`\nStory saved to: ${outputManager.folder}/story.json`);
    } catch (error) {
      spinner.fail('Failed to create visual direction');
      console.error(error);
      process.exit(1);
    }
  });
