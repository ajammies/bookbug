import { input, select, Separator } from '@inquirer/prompts';

interface SelectorConfig {
  question: string;
  options: string[];
}

/**
 * Show selector with options and custom input fallback
 */
export const showSelector = async (config: SelectorConfig): Promise<string> => {
  const choices = [
    ...config.options.map(option => ({ name: option, value: option })),
    new Separator(),
    { name: 'Enter custom response', value: '__CUSTOM__' },
  ];

  const answer = await select({
    message: config.question,
    choices,
  });

  return answer === '__CUSTOM__'
    ? await input({ message: 'Your response:' })
    : answer;
};
