/** Debug logging, compiled out of store builds. */
export function debug(...args: unknown[]): void {
  if (__DEV__) console.debug('[SpeedUp]', ...args);
}
