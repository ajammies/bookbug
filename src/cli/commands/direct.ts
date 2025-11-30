import { Command } from 'commander';
import { generateVisuals } from '../../core/pipeline';
import { StoryWithProseSchema, type VisualDirection } from '../../core/schemas';
import { getOrCreateOutputManager } from '../utils/output';
import { loadJson } from '../../utils';

const displayVisuals = (visuals: VisualDirection): void => {
  console.log('\n🎨 Visual direction created:');
  console.log(`  Style: ${visuals.style.art_style.genre.join(', ') || 'custom'}`);
  console.log(`  Pages: ${visuals.illustratedPages.length}`);
  const totalBeats = visuals.illustratedPages.reduce((sum, p) => sum + p.beats.length, 0);
  console.log(`  Total beats: ${totalBeats}`);
};

export const directCommand = new Command('direct')
  .description('Create visual direction from a StoryWithProse')
  .argument('<prose-file>', 'Path to StoryWithProse JSON file (prose.json)')
  .option('-o, --output <path>', 'Output file path for JSON')
  .action(async (proseFile: string) => {
    try {
      console.log('Loading story...');
      const storyWithProse = StoryWithProseSchema.parse(await loadJson(proseFile));

      console.log('Creating visual direction...');
      const composedStory = await generateVisuals(storyWithProse);

      displayVisuals(composedStory.visuals);

      const outputManager = await getOrCreateOutputManager(proseFile, storyWithProse.title);
      await outputManager.saveStory(composedStory);
      console.log(`\nStory saved to: ${outputManager.folder}/story.json`);
    } catch (error) {
      console.error('Failed to create visual direction:', error);
      process.exit(1);
    }
  });
