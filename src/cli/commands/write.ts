import { Command } from 'commander';
import { runProse } from '../../core/pipeline';
import { StoryWithPlotSchema, type Prose } from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { getOrCreateOutputManager } from '../utils/output';

/**
 * Display prose summary
 */
const displayProse = (prose: Prose): void => {
  console.log('\n📖 Prose written:');
  console.log(`  Logline: ${prose.logline}`);
  console.log(`  Theme: ${prose.theme}`);
  console.log(`  Pages: ${prose.pages.length}`);
};

export const writeCommand = new Command('write')
  .description('Write prose from a StoryWithPlot')
  .argument('<story-file>', 'Path to StoryWithPlot JSON file (blurb.json)')
  .option('-o, --output <path>', 'Output file path for JSON')
  .action(async (storyFile: string, options: { output?: string }) => {
    const spinner = createSpinner();

    try {
      // Load and validate story with plot
      spinner.start('Loading story...');
      const fs = await import('fs/promises');
      const storyJson = await fs.readFile(storyFile, 'utf-8');
      const storyWithPlot = StoryWithPlotSchema.parse(JSON.parse(storyJson));
      spinner.succeed('Story loaded');

      // Generate prose
      spinner.start('Writing prose...');
      const prose = await runProse(storyWithPlot);
      spinner.succeed('Prose written');

      displayProse(prose);

      // Save prose to story folder
      const outputManager = await getOrCreateOutputManager(storyFile, storyWithPlot.title);
      // Save the full StoryWithProse
      const storyWithProse = { ...storyWithPlot, prose };
      const proseFs = await import('fs/promises');
      const path = await import('path');
      await proseFs.writeFile(
        path.join(outputManager.folder, 'prose.json'),
        JSON.stringify(storyWithProse, null, 2)
      );
      console.log(`\nProse saved to: ${outputManager.folder}/prose.json`);
    } catch (error) {
      spinner.fail('Failed to write prose');
      console.error(error);
      process.exit(1);
    }
  });
