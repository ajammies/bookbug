import ora, { type Ora } from 'ora';
import { showSelector } from './selector';

/**
 * CliUI: Interface for CLI user interaction.
 * Passed to pipeline via dependency injection.
 */
export interface CliUI {
  /** Show a progress spinner with message */
  progress: (message: string) => void;
  /** Stop spinner with success message */
  succeed: (message: string) => void;
  /** Stop spinner with failure message */
  fail: (message: string) => void;
  /** Show selector (auto-stops any running spinner) */
  prompt: (config: { question: string; options: string[] }) => Promise<string>;
}

/**
 * Factory function that creates a CliUI with closure-captured spinner state.
 * The prompt method automatically stops the spinner before showing selector.
 */
export const createCliUI = (): CliUI => {
  let spinner: Ora | null = null;

  return {
    progress: (message: string) => {
      spinner?.stop();
      spinner = ora(message).start();
    },
    succeed: (message: string) => {
      spinner?.succeed(message);
      spinner = null;
    },
    fail: (message: string) => {
      spinner?.fail(message);
      spinner = null;
    },
    prompt: async (config: { question: string; options: string[] }) => {
      // Clear and stop spinner to fully release terminal before inquirer
      spinner?.clear();
      spinner?.stop();
      spinner = null;
      return showSelector(config);
    },
  };
};
