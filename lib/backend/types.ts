// ============================================================
// Genymotion Backend SDK — Shared Type Definitions
// ============================================================

/** Possible states of an emulator instance */
export type InstanceState =
    | "CREATING"
    | "BOOTING"
    | "ONLINE"
    | "SAVING"
    | "STOPPING"
    | "STOPPED"
    | "DELETING"
    | "ERROR"
    | "UNKNOWN";

/** A running or stopped emulator instance */
export interface EmulatorInstance {
    uuid: string;
    name: string;
    state: InstanceState;
    recipeUuid?: string;
    webrtcUrl?: string;
    adbSerial?: string;
    adbSerialPort?: number;
    createdAt?: string;
    updatedAt?: string;
    /** Provider-specific raw data */
    raw?: Record<string, unknown>;
}

/** Configuration for creating a new instance */
export interface CreateInstanceConfig {
    recipeUuid: string;
    name: string;
    /** Allow platform to auto-rename on conflict */
    allowRenameDuplicate?: boolean;
    /** Timeouts in seconds */
    timeouts?: {
        inactivity?: number;
    };
}

/** A recipe / device blueprint */
export interface RecipeInfo {
    uuid: string;
    name: string;
    androidVersion?: string;
    apiLevel?: number;
    screenWidth?: number;
    screenHeight?: number;
    screenDensity?: number;
    arch?: string;
    /** Provider-specific raw data */
    raw?: Record<string, unknown>;
}

/** Snapshot / saved state information */
export interface SnapshotInfo {
    uuid: string;
    name: string;
    recipeUuid?: string;
    createdAt?: string;
}

/** Snapshot save mode */
export type SnapshotAction = "SAVE" | "SAVE_AS";

/** Configuration for saving a snapshot */
export interface SaveSnapshotConfig {
    action: SnapshotAction;
    newRecipeName?: string;
    newOsImageName?: string;
}

/** Stream connection information */
export interface StreamInfo {
    webrtcUrl: string;
    token: string;
    instanceUuid: string;
}

/** ADB connection information */
export interface AdbConnectionInfo {
    serial: string;
    host: string;
    port: number;
}

// ============================================================
// Authentication
// ============================================================

export interface ApiTokenCredentials {
    type: "api-token";
    apiToken: string;
}

export interface JwtCredentials {
    type: "jwt";
    email: string;
    password: string;
}

export type AuthCredentials = ApiTokenCredentials | JwtCredentials;

// ============================================================
// SDK Configuration
// ============================================================

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface SDKConfig {
    /** Genymotion SaaS API base URL */
    baseUrl?: string;
    /** Authentication credentials */
    auth: AuthCredentials;
    /** Log level (default: 'info') */
    logLevel?: LogLevel;
    /** Request timeout in ms (default: 30000) */
    requestTimeout?: number;
    /** Retry configuration */
    retry?: RetryConfig;
}

export interface RetryConfig {
    /** Max number of retries (default: 3) */
    maxRetries?: number;
    /** Base delay in ms (default: 1000) */
    baseDelay?: number;
    /** Max delay in ms (default: 30000) */
    maxDelay?: number;
    /** Enable jitter (default: true) */
    jitter?: boolean;
}

// ============================================================
// HTTP Transport Abstraction
// ============================================================

export interface HttpRequestConfig {
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    data?: unknown;
    params?: Record<string, string | number | boolean>;
    timeout?: number;
}

export interface HttpResponse<T = unknown> {
    status: number;
    data: T;
    headers: Record<string, string>;
}

// ============================================================
// Logger Abstraction
// ============================================================

export interface ILogger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}

// ============================================================
// Paginated Response
// ============================================================

export interface PaginatedResponse<T> {
    results: T[];
    count?: number;
    next?: string | null;
    previous?: string | null;
}
