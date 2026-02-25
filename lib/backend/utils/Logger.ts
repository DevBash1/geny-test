// ============================================================
// Logger — Logging Abstraction
// ============================================================

import type { ILogger, LogLevel } from "../types";

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
};

export class ConsoleLogger implements ILogger {
    private level: number;
    private prefix: string;

    constructor(level: LogLevel = "info", prefix = "[GenySDK]") {
        this.level = LOG_LEVELS[level];
        this.prefix = prefix;
    }

    debug(message: string, ...args: unknown[]): void {
        if (this.level <= LOG_LEVELS.debug) {
            console.debug(`${this.prefix} ${message}`, ...args);
        }
    }

    info(message: string, ...args: unknown[]): void {
        if (this.level <= LOG_LEVELS.info) {
            console.info(`${this.prefix} ${message}`, ...args);
        }
    }

    warn(message: string, ...args: unknown[]): void {
        if (this.level <= LOG_LEVELS.warn) {
            console.warn(`${this.prefix} ${message}`, ...args);
        }
    }

    error(message: string, ...args: unknown[]): void {
        if (this.level <= LOG_LEVELS.error) {
            console.error(`${this.prefix} ${message}`, ...args);
        }
    }
}

/** No-op logger that silences all output */
export class SilentLogger implements ILogger {
    debug(): void {}
    info(): void {}
    warn(): void {}
    error(): void {}
}
