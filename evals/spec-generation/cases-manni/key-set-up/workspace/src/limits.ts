export const MAX_FILES = 10_000;
export const FETCH_TIMEOUT_MS = 10_000;
export const RETRIES = 3;

export function limits() {
  return { MAX_FILES, FETCH_TIMEOUT_MS, RETRIES };
}
