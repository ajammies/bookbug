/**
 * Progress Rotator
 *
 * Timer-based component that cycles through progress messages.
 * Decoupled from streaming - displays pre-generated messages on interval.
 */

export interface ProgressRotator {
  start: () => void;
  stop: () => void;
}

/**
 * Create a progress rotator that cycles through messages on a timer.
 *
 * @param messages - Array of progress messages to cycle through
 * @param intervalMs - Milliseconds between message changes (default: 3000)
 * @param onMessage - Callback invoked with each message
 */
export const createProgressRotator = (
  messages: string[],
  intervalMs: number,
  onMessage: (msg: string) => void
): ProgressRotator => {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let index = 0;

  const start = (): void => {
    if (intervalId !== null) return;
    if (messages.length === 0) return;

    // Show first message immediately
    const firstMsg = messages[0];
    if (firstMsg) onMessage(firstMsg);
    index = 1;

    intervalId = setInterval(() => {
      if (index >= messages.length) {
        index = 0; // Loop back to start
      }
      const msg = messages[index];
      if (msg) onMessage(msg);
      index++;
    }, intervalMs);
  };

  const stop = (): void => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return { start, stop };
};
