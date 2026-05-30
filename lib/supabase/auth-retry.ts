export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  onRetry?: (attempt: number, delayMs: number, error: Error) => void;
}

export async function withAuthRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, initialDelayMs = 100, onRetry } = options;
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isRateLimitError =
        lastError.message.includes("request_rate_limit") ||
        lastError.message.includes("429") ||
        lastError.message.includes("Request rate limit");
      if (!isRateLimitError || attempt === maxAttempts) throw lastError;
      const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
      if (onRetry) onRetry(attempt, delayMs, lastError);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError || new Error("Auth retry failed");
}

export async function withAuthRetrySafe<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T | null> {
  try { return await withAuthRetry(fn, options); } catch { return null; }
}
