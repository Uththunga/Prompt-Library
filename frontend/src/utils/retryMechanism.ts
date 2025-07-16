/**
 * Retry Mechanism Utilities
 * Provides robust retry logic for API calls and async operations
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = defaultRetryCondition,
    onRetry
  } = options;

  const startTime = Date.now();
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === maxAttempts || !retryCondition(error)) {
        break;
      }

      // Call retry callback
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      await sleep(jitteredDelay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    totalTime: Date.now() - startTime
  };
}

/**
 * Default retry condition - retry on network errors and 5xx status codes
 */
export function defaultRetryCondition(error: any): boolean {
  // Network errors
  if (error.name === 'NetworkError' || error.message?.includes('network')) {
    return true;
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return true;
  }

  // HTTP 5xx errors (server errors)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // HTTP 429 (rate limit)
  if (error.status === 429) {
    return true;
  }

  // Firebase specific errors
  if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
    return true;
  }

  return false;
}

/**
 * Retry condition for authentication errors
 */
export function authRetryCondition(error: any): boolean {
  // Don't retry auth errors (401, 403)
  if (error.status === 401 || error.status === 403) {
    return false;
  }

  return defaultRetryCondition(error);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for Firebase Functions calls
 */
export async function retryFirebaseFunction<T>(
  functionCall: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const result = await retryAsync(functionCall, {
    maxAttempts: 3,
    baseDelay: 1000,
    retryCondition: (error) => {
      // Retry on Firebase-specific errors
      if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
        return true;
      }
      return defaultRetryCondition(error);
    },
    ...options
  });

  if (result.success) {
    return result.data!;
  } else {
    throw result.error;
  }
}

/**
 * Retry wrapper for API calls with fetch
 */
export async function retryFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const result = await retryAsync(
    async () => {
      const response = await fetch(url, options);
      
      // Throw error for non-ok responses to trigger retry logic
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }
      
      return response;
    },
    {
      maxAttempts: 3,
      baseDelay: 1000,
      ...retryOptions
    }
  );

  if (result.success) {
    return result.data!;
  } else {
    throw result.error;
  }
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset() {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}

/**
 * Debounced retry - useful for user input scenarios
 */
export function createDebouncedRetry<T extends any[]>(
  operation: (...args: T) => Promise<any>,
  delay = 300,
  retryOptions: RetryOptions = {}
) {
  let timeoutId: NodeJS.Timeout;

  return (...args: T) => {
    clearTimeout(timeoutId);
    
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await retryAsync(() => operation(...args), retryOptions);
          if (result.success) {
            resolve(result.data);
          } else {
            reject(result.error);
          }
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

/**
 * Batch retry - retry multiple operations with shared configuration
 */
export async function retryBatch<T>(
  operations: (() => Promise<T>)[],
  options: RetryOptions = {}
): Promise<RetryResult<T>[]> {
  const promises = operations.map(op => retryAsync(op, options));
  return Promise.all(promises);
}

/**
 * Progressive retry - increase retry attempts for more important operations
 */
export async function progressiveRetry<T>(
  operation: () => Promise<T>,
  importance: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<T> {
  const configs = {
    low: { maxAttempts: 2, baseDelay: 500 },
    medium: { maxAttempts: 3, baseDelay: 1000 },
    high: { maxAttempts: 5, baseDelay: 1000 },
    critical: { maxAttempts: 10, baseDelay: 500, maxDelay: 5000 }
  };

  const result = await retryAsync(operation, configs[importance]);
  
  if (result.success) {
    return result.data!;
  } else {
    throw result.error;
  }
}
