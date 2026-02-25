// ============================================================
// Backend SDK — Barrel Exports
// ============================================================
// Individual modules are also importable directly from their paths.

// Core
export { InstanceManager } from "./core/InstanceManager";
export type { EmulatorProvider } from "./core/EmulatorProvider";

// Providers
export { GenymotionProvider } from "./providers/GenymotionProvider";

// Auth
export { AuthManager } from "./auth/AuthManager";

// Transport
export { AxiosHttpClient } from "./transport/HttpClient";
export type { IHttpClient } from "./transport/HttpClient";

// Utils
export { RetryPolicy } from "./utils/RetryPolicy";
export { ConsoleLogger, SilentLogger } from "./utils/Logger";

// Types
export type {
    EmulatorInstance,
    InstanceState,
    CreateInstanceConfig,
    RecipeInfo,
    SnapshotInfo,
    SnapshotAction,
    SaveSnapshotConfig,
    StreamInfo,
    AdbConnectionInfo,
    ApiTokenCredentials,
    JwtCredentials,
    AuthCredentials,
    SDKConfig,
    RetryConfig,
    LogLevel,
    HttpRequestConfig,
    HttpResponse,
    ILogger,
    PaginatedResponse,
} from "./types";

// ============================================================
// GenymotionSDK — Convenience Factory
// ============================================================
// Wires up all dependencies in one call.

import { AxiosHttpClient } from "./transport/HttpClient";
import { AuthManager } from "./auth/AuthManager";
import { GenymotionProvider } from "./providers/GenymotionProvider";
import { InstanceManager } from "./core/InstanceManager";
import { ConsoleLogger } from "./utils/Logger";
import type { SDKConfig } from "./types";

const DEFAULT_BASE_URL = "https://api.geny.io/cloud";

export class GenymotionSDK {
    public readonly instanceManager: InstanceManager;
    public readonly provider: GenymotionProvider;
    public readonly authManager: AuthManager;

    constructor(config: SDKConfig) {
        const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
        const logger = new ConsoleLogger(config.logLevel ?? "info");

        const httpClient = new AxiosHttpClient({
            baseUrl,
            timeout: config.requestTimeout,
            logger,
        });

        this.authManager = new AuthManager({
            credentials: config.auth,
            httpClient,
            baseUrl,
            logger,
        });

        this.provider = new GenymotionProvider({
            httpClient,
            authManager: this.authManager,
            baseUrl,
            logger,
            retryConfig: config.retry,
        });

        this.instanceManager = new InstanceManager(this.provider, logger);
    }
}
