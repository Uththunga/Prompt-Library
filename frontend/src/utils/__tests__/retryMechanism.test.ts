import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  retryAsync, 
  defaultRetryCondition, 
  authRetryCondition,
  retryFirebaseFunction,
  retryFetch,
  CircuitBreaker,
  createDebouncedRetry,
  progressiveRetry
} from '../retryMechanism';

describe('retryMechanism', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('retryAsync', () => {
    it('succeeds on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retryAsync(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and eventually succeeds', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const resultPromise = retryAsync(operation, { maxAttempts: 3 });

      // Fast-forward through delays
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('fails after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      const resultPromise = retryAsync(operation, { maxAttempts: 2 });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Persistent failure');
      expect(result.attempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('respects retry condition', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Non-retryable'));
      const retryCondition = vi.fn().mockReturnValue(false);

      const result = await retryAsync(operation, { retryCondition });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
      expect(retryCondition).toHaveBeenCalledWith(expect.any(Error));
    });

    it('calls onRetry callback', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      const onRetry = vi.fn();

      const resultPromise = retryAsync(operation, { onRetry });

      await vi.runAllTimersAsync();

      await resultPromise;

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('uses exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');


      const resultPromise = retryAsync(operation, { 
        baseDelay: 100, 
        backoffFactor: 2 
      });

      // Fast-forward through delays
      await vi.runAllTimersAsync();

      await resultPromise;

      // Verify exponential backoff timing
      const calls = vi.mocked(setTimeout).mock.calls;
      expect(calls[0][1]).toBeCloseTo(100, -1); // ~100ms + jitter
      expect(calls[1][1]).toBeCloseTo(200, -1); // ~200ms + jitter
    });
  });

  describe('defaultRetryCondition', () => {
    it('retries on network errors', () => {
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';

      expect(defaultRetryCondition(networkError)).toBe(true);
    });

    it('retries on timeout errors', () => {
      const timeoutError = new Error('Timeout error');
      timeoutError.name = 'TimeoutError';

      expect(defaultRetryCondition(timeoutError)).toBe(true);
    });

    it('retries on 5xx status codes', () => {
      const serverError = { status: 500 };

      expect(defaultRetryCondition(serverError)).toBe(true);
      expect(defaultRetryCondition({ status: 502 })).toBe(true);
      expect(defaultRetryCondition({ status: 503 })).toBe(true);
    });

    it('retries on rate limit (429)', () => {
      const rateLimitError = { status: 429 };

      expect(defaultRetryCondition(rateLimitError)).toBe(true);
    });

    it('retries on Firebase errors', () => {
      const firebaseError = { code: 'unavailable' };

      expect(defaultRetryCondition(firebaseError)).toBe(true);
      expect(defaultRetryCondition({ code: 'deadline-exceeded' })).toBe(true);
    });

    it('does not retry on client errors', () => {
      expect(defaultRetryCondition({ status: 400 })).toBe(false);
      expect(defaultRetryCondition({ status: 401 })).toBe(false);
      expect(defaultRetryCondition({ status: 404 })).toBe(false);
    });
  });

  describe('authRetryCondition', () => {
    it('does not retry on auth errors', () => {
      expect(authRetryCondition({ status: 401 })).toBe(false);
      expect(authRetryCondition({ status: 403 })).toBe(false);
    });

    it('uses default condition for other errors', () => {
      expect(authRetryCondition({ status: 500 })).toBe(true);
    });
  });

  describe('retryFirebaseFunction', () => {
    it('retries Firebase function calls', async () => {
      const functionCall = vi.fn()
        .mockRejectedValueOnce({ code: 'unavailable' })
        .mockResolvedValue('success');

      const resultPromise = retryFirebaseFunction(functionCall);

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(functionCall).toHaveBeenCalledTimes(2);
    });

    it('throws error on final failure', async () => {
      const functionCall = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      const resultPromise = retryFirebaseFunction(functionCall);

      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow('Persistent failure');
    });
  });

  describe('retryFetch', () => {
    it('retries failed fetch requests', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ ok: true, status: 200 });

      global.fetch = mockFetch;

      const resultPromise = retryFetch('https://api.example.com');

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws error for non-ok responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ 
        ok: false, 
        status: 500, 
        statusText: 'Internal Server Error' 
      });

      global.fetch = mockFetch;

      const resultPromise = retryFetch('https://api.example.com');

      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('CircuitBreaker', () => {
    it('allows operations when circuit is closed', async () => {
      const circuitBreaker = new CircuitBreaker(3, 1000);
      const operation = vi.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('success');
      expect(circuitBreaker.getState().state).toBe('closed');
    });

    it('opens circuit after failure threshold', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000);
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));

      // First failure
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState().state).toBe('closed');

      // Second failure - should open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState().state).toBe('open');
    });

    it('rejects operations when circuit is open', async () => {
      const circuitBreaker = new CircuitBreaker(1, 1000);
      const operation = vi.fn().mockRejectedValue(new Error('Failure'));

      // Trigger circuit opening
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();

      // Circuit should be open now
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is open');
    });

    it('transitions to half-open after recovery timeout', async () => {
      const circuitBreaker = new CircuitBreaker(1, 1000);
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');

      // Open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();

      // Fast-forward past recovery timeout
      vi.advanceTimersByTime(1001);

      // Should allow operation and close circuit on success
      const result = await circuitBreaker.execute(operation);
      expect(result).toBe('success');
      expect(circuitBreaker.getState().state).toBe('closed');
    });
  });

  describe('createDebouncedRetry', () => {
    it('debounces multiple calls', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const debouncedRetry = createDebouncedRetry(operation, 100);

      // Make multiple calls
      const promise1 = debouncedRetry('arg1');
      const promise2 = debouncedRetry('arg2');
      const promise3 = debouncedRetry('arg3');

      // Fast-forward past debounce delay
      vi.advanceTimersByTime(100);

      await Promise.all([promise1, promise2, promise3]);

      // Only the last call should be executed
      expect(operation).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledWith('arg3');
    });
  });

  describe('progressiveRetry', () => {
    it('uses different retry configs based on importance', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');

      // Low importance - fewer retries
      const lowResult = progressiveRetry(operation, 'low');
      await vi.runAllTimersAsync();
      await lowResult;

      expect(operation).toHaveBeenCalledTimes(2); // 1 initial + 1 retry

      operation.mockClear();
      operation
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');

      // Critical importance - more retries
      const criticalResult = progressiveRetry(operation, 'critical');
      await vi.runAllTimersAsync();
      await criticalResult;

      expect(operation).toHaveBeenCalledTimes(2); // Would allow up to 10 attempts
    });
  });
});
