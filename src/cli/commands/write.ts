import { Command } from 'commander';
import { generateProse } from '../../core/pipeline';
import { StoryWithPlotSchema, type Prose } from '../../core/schemas';
import { getOrCreateOutputManager } from '../utils/output';
import { loadJson } from '../../utils';

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
  .action(async (storyFile: string) => {
    try {
      console.log('Loading story...');
      const storyWithPlot = StoryWithPlotSchema.parse(await loadJson(storyFile));

      console.log('Writing prose...');
      const storyWithProse = await generateProse(storyWithPlot);

      displayProse(storyWithProse.prose);

      const outputManager = await getOrCreateOutputManager(storyFile, storyWithPlot.title);
      await outputManager.saveProse(storyWithProse);
      console.log(`\nProse saved to: ${outputManager.folder}/prose.json`);
    } catch (error) {
      console.error('Failed to write prose:', error);
      process.exit(1);
    }
  });
