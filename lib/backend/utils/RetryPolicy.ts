// ============================================================
// RetryPolicy — Exponential Backoff with Jitter
// ============================================================

import type { RetryConfig, ILogger } from "../types";

const DEFAULT_CONFIG: Required<RetryConfig> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: true,
};

export class RetryPolicy {
    private config: Required<RetryConfig>;
    private logger?: ILogger;

    constructor(config?: RetryConfig, logger?: ILogger) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger = logger;
    }

    /**
     * Execute a function with automatic retries on failure.
     * Only retries on transient errors (5xx, network, rate-limit).
     */
    async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (err: unknown) {
                lastError = err instanceof Error ? err : new Error(String(err));

                if (
                    attempt >= this.config.maxRetries ||
                    !this.isRetryable(err)
                ) {
                    throw lastError;
                }

                const delay = this.calculateDelay(attempt);
                this.logger?.warn(
                    `${context ?? "Operation"} failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}), retrying in ${delay}ms: ${lastError.message}`,
                );

                await this.sleep(delay);
            }
        }

        throw lastError!;
    }

    private calculateDelay(attempt: number): number {
        const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt);
        const capped = Math.min(exponentialDelay, this.config.maxDelay);

        if (this.config.jitter) {
            // Full jitter: random value between 0 and capped
            return Math.floor(Math.random() * capped);
        }

        return capped;
    }

    private isRetryable(err: unknown): boolean {
        if (!err || typeof err !== "object") return false;

        const error = err as Record<string, unknown>;

        // Axios-style error with response
        if (error.response && typeof error.response === "object") {
            const status = (error.response as Record<string, unknown>).status;
            if (typeof status === "number") {
                // Retry on 429 (rate limit), 500, 502, 503, 504
                return status === 429 || (status >= 500 && status <= 504);
            }
        }

        // Network errors (no response received)
        if (
            error.code === "ECONNRESET" ||
            error.code === "ECONNREFUSED" ||
            error.code === "ETIMEDOUT"
        ) {
            return true;
        }

        // Axios network error
        if (
            error.message &&
            typeof error.message === "string" &&
            error.message.includes("Network Error")
        ) {
            return true;
        }

        return false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
