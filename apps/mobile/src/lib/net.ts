/**
 * Network helpers with hard deadlines.
 *
 * React Native's `fetch` has NO default timeout. On Android a socket that was
 * opened before the device slept (or before a Wi-Fi → mobile handover) can stay
 * half-open: the request is never answered and never rejected. Any `await` on
 * such a call hangs the calling code forever. When that call sits on the path
 * that flips the app out of its loading state, the user sees a permanent
 * spinner and the only way out is Force stop → reopen.
 *
 * Every network call in the app should go through these helpers so a dead
 * socket degrades into an error we can recover from instead of a hang.
 */

/** Default deadline for ordinary API calls. */
export const DEFAULT_TIMEOUT_MS = 12000;

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Network request timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * `fetch` that always settles. Aborts the request once `timeoutMs` elapses and
 * rejects with a TimeoutError, so callers can retry or fall back.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new TimeoutError(timeoutMs);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Wrap any promise with a deadline. Used for SDK calls we cannot pass an
 * AbortSignal into — notably `firebaseUser.getIdToken()`, which silently
 * performs a network refresh once the cached token is older than an hour.
 *
 * NOTE: the underlying work is not cancelled, we only stop waiting on it.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  label = 'operation'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new TimeoutError(timeoutMs)),
      timeoutMs
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  }).catch((err) => {
    if (err instanceof TimeoutError) {
      throw new TimeoutError(timeoutMs);
    }
    throw err;
  }) as Promise<T>;
}

/** Same as withTimeout but resolves to `fallback` instead of throwing. */
export async function withTimeoutOr<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  try {
    return await withTimeout(promise, timeoutMs);
  } catch {
    return fallback;
  }
}
