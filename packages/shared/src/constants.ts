export const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
export const MAX_RETRIES = 3;
export const MAX_CONCURRENCY = 5;

export const PRICING = {
  [DEFAULT_MODEL]: {
    input: 1.00 / 1000000,
    output: 5.00 / 1000000,
    cacheRead: 0.10 / 1000000,
    cacheWrite: 1.25 / 1000000,
  }
};
