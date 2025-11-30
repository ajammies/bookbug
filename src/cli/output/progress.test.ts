import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSpinner, formatStep, progressBar, createPipelineProgress } from './progress';

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

  it('formats prose step', () => {
    expect(formatStep('prose')).toBe('Writing prose...');
    expect(formatStep('prose', true)).toBe('Writing prose ✓');
  });

  it('formats visuals step', () => {
    expect(formatStep('visuals')).toBe('Creating visual direction...');
    expect(formatStep('visuals', true)).toBe('Creating visual direction ✓');
  });

  it('formats renderer step', () => {
    expect(formatStep('renderer')).toBe('Rendering illustrations...');
    expect(formatStep('renderer', true)).toBe('Rendering illustrations ✓');
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

describe('createPipelineProgress', () => {
  const createMockSpinner = () => ({
    start: vi.fn(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
    isSpinning: true,
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns onProgress and onThinking callbacks', () => {
    const spinner = createMockSpinner();
    const { onProgress, onThinking } = createPipelineProgress({
      spinner: spinner as unknown as ReturnType<typeof createSpinner>,
      progressMessages: ['msg1', 'msg2'],
    });

    expect(typeof onProgress).toBe('function');
    expect(typeof onThinking).toBe('function');
  });

  it('starts spinner on phase start', () => {
    const spinner = createMockSpinner();
    const { onProgress } = createPipelineProgress({
      spinner: spinner as unknown as ReturnType<typeof createSpinner>,
      progressMessages: ['msg1'],
    });

    onProgress('prose', 'start');
    expect(spinner.start).toHaveBeenCalledWith('Writing prose...');
  });

  it('calls succeed on major phase complete', () => {
    const spinner = createMockSpinner();
    const { onProgress } = createPipelineProgress({
      spinner: spinner as unknown as ReturnType<typeof createSpinner>,
      progressMessages: ['msg1'],
    });

    onProgress('prose', 'complete');
    expect(spinner.succeed).toHaveBeenCalledWith('Writing prose ✓');
  });

  it('starts rotator for long-running phases', () => {
    const spinner = createMockSpinner();
    const { onProgress } = createPipelineProgress({
      spinner: spinner as unknown as ReturnType<typeof createSpinner>,
      progressMessages: ['msg1', 'msg2'],
      intervalMs: 100,
    });

    onProgress('prose', 'start');
    expect(spinner.text).toBe('msg1');

    vi.advanceTimersByTime(100);
    expect(spinner.text).toBe('msg2');
  });

  it('stops rotator on long-running phase complete', () => {
    const spinner = createMockSpinner();
    const { onProgress } = createPipelineProgress({
      spinner: spinner as unknown as ReturnType<typeof createSpinner>,
      progressMessages: ['msg1', 'msg2'],
      intervalMs: 100,
    });

    onProgress('prose', 'start');
    onProgress('prose', 'complete');

    const textAfterComplete = spinner.text;
    vi.advanceTimersByTime(100);
    expect(spinner.text).toBe(textAfterComplete);
  });

  it('onThinking updates spinner when rotator is not active', () => {
    const spinner = createMockSpinner();
    const { onThinking } = createPipelineProgress({
      spinner: spinner as unknown as ReturnType<typeof createSpinner>,
      progressMessages: ['msg1'],
    });

    onThinking('thinking message');
    expect(spinner.text).toBe('thinking message');
  });

  it('onThinking is suppressed when rotator is active', () => {
    const spinner = createMockSpinner();
    const { onProgress, onThinking } = createPipelineProgress({
      spinner: spinner as unknown as ReturnType<typeof createSpinner>,
      progressMessages: ['rotator msg'],
    });

    onProgress('prose', 'start');
    expect(spinner.text).toBe('rotator msg');

    onThinking('thinking message');
    expect(spinner.text).toBe('rotator msg');
  });

  it('does not start rotator for non-long-running phases', () => {
    const spinner = createMockSpinner();
    const { onProgress, onThinking } = createPipelineProgress({
      spinner: spinner as unknown as ReturnType<typeof createSpinner>,
      progressMessages: ['msg1'],
    });

    onProgress('render', 'start');
    onThinking('thinking allowed');
    expect(spinner.text).toBe('thinking allowed');
  });

  it('uses custom majorPhases and longRunningPhases', () => {
    const spinner = createMockSpinner();
    const { onProgress } = createPipelineProgress({
      spinner: spinner as unknown as ReturnType<typeof createSpinner>,
      progressMessages: ['msg1'],
      majorPhases: ['custom'],
      longRunningPhases: [],
    });

    onProgress('custom', 'complete');
    expect(spinner.succeed).toHaveBeenCalledWith('custom ✓');

    onProgress('prose', 'complete');
    expect(spinner.succeed).toHaveBeenCalledTimes(1);
  });
});
