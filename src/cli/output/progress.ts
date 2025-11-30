import ora, { type Ora } from 'ora';
import { createProgressRotator, type ProgressRotator } from '../utils/progress-rotator';
import type { OnStepProgress } from '../../core/agents';

/**
 * Create a spinner for CLI progress indication
 */
export function createSpinner(): Ora {
  return ora({
    spinner: 'dots',
  });
}

/**
 * Callbacks for pipeline progress handling
 */
export interface PipelineProgressCallbacks {
  onProgress: OnStepProgress;
  onThinking: (message: string) => void;
}

/**
 * Options for createPipelineProgress
 */
export interface CreatePipelineProgressOptions {
  spinner: Ora;
  progressMessages: string[];
  intervalMs?: number;
  majorPhases?: string[];
  longRunningPhases?: string[];
}

/**
 * Create progress callbacks for executePipeline.
 * Coordinates spinner updates with progress message rotation during long phases.
 */
export function createPipelineProgress(
  options: CreatePipelineProgressOptions
): PipelineProgressCallbacks {
  const {
    spinner,
    progressMessages,
    intervalMs = 3000,
    majorPhases = ['prose', 'visuals', 'render'],
    longRunningPhases = ['prose', 'visuals'],
  } = options;

  let rotator: ProgressRotator | null = null;

  const onProgress: OnStepProgress = (step, status) => {
    if (status === 'start') {
      spinner.start(formatStep(step));
      if (longRunningPhases.includes(step)) {
        rotator = createProgressRotator(progressMessages, intervalMs, (msg) => {
          if (spinner.isSpinning) spinner.text = msg;
        });
        rotator.start();
      }
    } else if (status === 'complete') {
      if (longRunningPhases.includes(step)) {
        rotator?.stop();
        rotator = null;
      }
      if (majorPhases.includes(step)) {
        spinner.succeed(formatStep(step, true));
      }
    }
  };

  const onThinking = (msg: string): void => {
    if (spinner.isSpinning && !rotator) spinner.text = msg;
  };

  return { onProgress, onThinking };
}

/**
 * Format step name for display
 */
export function formatStep(step: string, complete = false): string {
  const stepNames: Record<string, string> = {
    'book-builder': 'Extracting story brief',
    'prose': 'Writing prose',
    'visuals': 'Creating visual direction',
    'renderer': 'Rendering illustrations',
  };

  const name = stepNames[step] || step;
  return complete ? `${name} ✓` : `${name}...`;
}

/**
 * Display a progress bar (for multi-step operations)
 */
export function progressBar(current: number, total: number, width = 30): string {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.round((current / total) * 100);
  return `[${bar}] ${percent}%`;
}
