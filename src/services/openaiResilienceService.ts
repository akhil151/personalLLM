
/**
 * OpenAI Resilience Service
 * 
 * Provides:
 * - Exponential backoff for 429 and 5xx errors
 * - Timeout protection
 * - Circuit breaker to prevent cascading failures
 * - Quota awareness
 */

export interface ResilienceOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
}

export class OpenAIResilienceService {
  private static instance: OpenAIResilienceService;
  private circuitOpen = false;
  private lastFailureTime: number = 0;
  private failureCount = 0;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_RESET_TIMEOUT = 30000; // 30 seconds

  private constructor() {}

  public static getInstance(): OpenAIResilienceService {
    if (!OpenAIResilienceService.instance) {
      OpenAIResilienceService.instance = new OpenAIResilienceService();
    }
    return OpenAIResilienceService.instance;
  }

  /**
   * Executes a call to OpenAI with resilience patterns.
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: ResilienceOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      timeout = 30000,
    } = options;

    if (this.isCircuitOpen()) {
      throw new Error('OpenAI Circuit Breaker is OPEN. Request blocked.');
    }

    let lastError: any;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.withTimeout(operation(), timeout);
        this.onSuccess();
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors (e.g., 401 Unauthorized, 400 Bad Request)
        if (this.isFatalError(error)) {
          this.onFailure();
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        console.warn(`OpenAI attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, maxDelay);
      }
    }

    this.onFailure();
    throw lastError;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI Request Timeout')), ms);
    });
    return Promise.race([promise, timeoutPromise]);
  }

  private isFatalError(error: any): boolean {
    const status = error.status || error.response?.status;
    if (status === 401 || status === 403 || status === 400) return true;
    return false;
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpen) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.CIRCUIT_RESET_TIMEOUT) {
        this.circuitOpen = false;
        this.failureCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  private onSuccess() {
    this.failureCount = 0;
    this.circuitOpen = false;
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      this.circuitOpen = true;
      console.error('OpenAI Circuit Breaker OPENED due to multiple failures.');
    }
  }
}

export const openaiResilience = OpenAIResilienceService.getInstance();
