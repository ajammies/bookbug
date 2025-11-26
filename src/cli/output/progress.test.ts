import { describe, it, expect } from 'vitest';
import { createSpinner, formatStep, progressBar } from './progress';

describe('createSpinner', () => {
  it('returns a spinner instance with dots spinner', () => {
    const spinner = createSpinner();

    expect(spinner).toBeDefined();
    expect(typeof spinner.start).toBe('function');
    expect(typeof spinner.stop).toBe('function');
    expect(typeof spinner.succeed).toBe('function');
    expect(typeof spinner.fail).toBe('function');
  });
});

describe('formatStep', () => {
  it('formats known step name', () => {
    expect(formatStep('book-builder')).toBe('Extracting story brief...');
  });

  it('formats completed known step', () => {
    expect(formatStep('book-builder', true)).toBe('Extracting story brief ✓');
  });

  it('formats author step', () => {
    expect(formatStep('author')).toBe('Writing manuscript...');
    expect(formatStep('author', true)).toBe('Writing manuscript ✓');
  });

  it('formats director step', () => {
    expect(formatStep('director')).toBe('Creating visual direction...');
    expect(formatStep('director', true)).toBe('Creating visual direction ✓');
  });

  it('formats illustrator step', () => {
    expect(formatStep('illustrator')).toBe('Rendering illustrations...');
    expect(formatStep('illustrator', true)).toBe('Rendering illustrations ✓');
  });

  it('uses step name as fallback for unknown steps', () => {
    expect(formatStep('unknown-step')).toBe('unknown-step...');
    expect(formatStep('unknown-step', true)).toBe('unknown-step ✓');
  });
});

describe('progressBar', () => {
  it('shows empty bar at 0%', () => {
    const result = progressBar(0, 10, 10);
    expect(result).toBe('[░░░░░░░░░░] 0%');
  });

  it('shows full bar at 100%', () => {
    const result = progressBar(10, 10, 10);
    expect(result).toBe('[██████████] 100%');
  });

  it('shows half bar at 50%', () => {
    const result = progressBar(5, 10, 10);
    expect(result).toBe('[█████░░░░░] 50%');
  });

  it('rounds percentage correctly', () => {
    const result = progressBar(1, 3, 9);
    expect(result).toBe('[███░░░░░░] 33%');
  });

  it('uses default width of 30', () => {
    const result = progressBar(5, 10);
    expect(result).toContain('[');
    expect(result).toContain(']');
    expect(result).toContain('50%');
    // Width 30 = 15 filled, 15 empty
    const barContent = result.slice(1, result.indexOf(']'));
    expect(barContent.length).toBe(30);
  });
});
