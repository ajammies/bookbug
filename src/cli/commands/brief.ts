import { Command } from 'commander';
import { runStoryIntake } from '../prompts/story-intake';
import { displayBrief } from '../output/display';
import { createOutputManager } from '../utils/output';

export const briefCommand = new Command('brief')
  .description('Create a StoryBrief through conversational chat')
  .argument('[prompt]', 'Optional initial story idea (can also provide interactively)')
  .option('-o, --output <path>', 'Custom output folder path')
  .action(async (prompt: string | undefined, options: { output?: string }) => {
    try {
      const brief = await runStoryIntake(prompt);

      displayBrief(brief);

      // Save to story folder (custom path or auto-generated)
      const outputManager = await createOutputManager(brief.title, options.output);
      await outputManager.saveBrief(brief);
      console.log(`\nBrief saved to: ${outputManager.folder}/brief.json`);
    } catch (error) {
      console.error('Failed to create brief:', error);
      process.exit(1);
    }
  });
