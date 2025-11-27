import ora, { type Ora } from 'ora';

/**
 * Create a spinner for CLI progress indication
 */
export function createSpinner(): Ora {
  return ora({
    spinner: 'dots',
  });
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
