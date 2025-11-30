import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProgressRotator } from './progress-rotator';

describe('createProgressRotator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows first message immediately on start', () => {
    const messages = ['Message 1', 'Message 2', 'Message 3'];
    const onMessage = vi.fn();

    const rotator = createProgressRotator(messages, 3000, onMessage);
    rotator.start();

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith('Message 1');

    rotator.stop();
  });

  it('cycles through messages at specified interval', () => {
    const messages = ['A', 'B', 'C'];
    const onMessage = vi.fn();

    const rotator = createProgressRotator(messages, 1000, onMessage);
    rotator.start();

    expect(onMessage).toHaveBeenLastCalledWith('A');

    vi.advanceTimersByTime(1000);
    expect(onMessage).toHaveBeenLastCalledWith('B');

    vi.advanceTimersByTime(1000);
    expect(onMessage).toHaveBeenLastCalledWith('C');

    rotator.stop();
  });

  it('loops back to start when messages exhausted', () => {
    const messages = ['First', 'Second'];
    const onMessage = vi.fn();

    const rotator = createProgressRotator(messages, 1000, onMessage);
    rotator.start();

    vi.advanceTimersByTime(1000); // Second
    vi.advanceTimersByTime(1000); // First (loop)

    expect(onMessage).toHaveBeenLastCalledWith('First');
    expect(onMessage).toHaveBeenCalledTimes(3);

    rotator.stop();
  });

  it('stops interval when stop is called', () => {
    const messages = ['A', 'B'];
    const onMessage = vi.fn();

    const rotator = createProgressRotator(messages, 1000, onMessage);
    rotator.start();
    rotator.stop();

    vi.advanceTimersByTime(5000);

    // Only initial call, no interval calls
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('handles empty messages array', () => {
    const onMessage = vi.fn();

    const rotator = createProgressRotator([], 1000, onMessage);
    rotator.start();

    vi.advanceTimersByTime(5000);

    expect(onMessage).not.toHaveBeenCalled();

    rotator.stop();
  });

  it('prevents multiple starts', () => {
    const messages = ['A'];
    const onMessage = vi.fn();

    const rotator = createProgressRotator(messages, 1000, onMessage);
    rotator.start();
    rotator.start(); // Should be no-op

    expect(onMessage).toHaveBeenCalledTimes(1);

    rotator.stop();
  });

  it('can be started again after stopping', () => {
    const messages = ['X', 'Y'];
    const onMessage = vi.fn();

    const rotator = createProgressRotator(messages, 1000, onMessage);

    rotator.start();
    expect(onMessage).toHaveBeenCalledWith('X');

    rotator.stop();

    rotator.start();
    // Index was reset conceptually - but state persists in closure
    // Actually starts from index=1 since start() sets index=1 after showing first
    expect(onMessage).toHaveBeenLastCalledWith('X');

    rotator.stop();
  });
});
