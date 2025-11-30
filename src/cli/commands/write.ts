import { Command } from 'commander';
import { generateProse } from '../../core/pipeline';
import { StoryWithPlotSchema, type Prose } from '../../core/schemas';
import { createSpinner } from '../output/progress';
import { getOrCreateOutputManager } from '../utils/output';
import { loadJson } from '../../utils';

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
  .argument('<story-file>', 'Path to StoryWithPlot JSON file (plot.json)')
  .option('-o, --output <path>', 'Output file path for JSON')
  .action(async (storyFile: string, options: { output?: string }) => {
    const spinner = createSpinner();

    try {
      // Load and validate story with plot
      spinner.start('Loading story...');
      const storyWithPlot = StoryWithPlotSchema.parse(await loadJson(storyFile));
      spinner.succeed('Story loaded');

      // Generate prose
      spinner.start('Writing prose...');
      const storyWithProse = await generateProse(storyWithPlot, {
        onThinking: (msg) => { if (spinner.isSpinning) spinner.text = `Thinking: ${msg}`; },
      });
      spinner.succeed('Prose written');

      displayProse(storyWithProse.prose);

      // Save prose to story folder
      const outputManager = await getOrCreateOutputManager(storyFile, storyWithPlot.title);
      await outputManager.saveProse(storyWithProse);
      console.log(`\nProse saved to: ${outputManager.folder}/prose.json`);
    } catch (error) {
      spinner.fail('Failed to write prose');
      console.error(error);
      process.exit(1);
    }
  });
