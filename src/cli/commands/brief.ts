import { Command } from 'commander';
import { runStoryIntake } from '../prompts/story-intake';
import { displayBrief } from '../output/display';

export const briefCommand = new Command('brief')
  .description('Create a StoryBrief through conversational chat')
  .argument('[prompt]', 'Optional initial story idea (can also provide interactively)')
  .option('-o, --output <path>', 'Output file path for JSON')
  .action(async (prompt: string | undefined, options: { output?: string }) => {
    try {
      const brief = await runStoryIntake(prompt);

      displayBrief(brief);

      if (options.output) {
        const fs = await import('fs/promises');
        await fs.writeFile(options.output, JSON.stringify(brief, null, 2));
        console.log(`\nBrief saved to: ${options.output}`);
      }
    } catch (error) {
      console.error('Failed to create brief:', error);
      process.exit(1);
    }
  });
