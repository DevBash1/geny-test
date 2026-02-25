// ============================================================
// EmulatorProvider — Interface Contract
// ============================================================
// Any emulator backend (Genymotion, AWS Device Farm, BrowserStack, etc.)
// must implement this interface to be used with the InstanceManager.

import type {
    EmulatorInstance,
    CreateInstanceConfig,
    RecipeInfo,
    StreamInfo,
    AdbConnectionInfo,
    SaveSnapshotConfig,
    SnapshotInfo,
    PaginatedResponse,
} from "../types";

export interface EmulatorProvider {
    // ── Instance Lifecycle ──────────────────────────────────────
    /** Create and start a new disposable instance from a recipe */
    createInstance(config: CreateInstanceConfig): Promise<EmulatorInstance>;

    /** Start an existing instance (if provider supports non-disposable) */
    startInstance(instanceId: string): Promise<EmulatorInstance>;

    /** Stop an instance (disposable instances are destroyed) */
    stopInstance(instanceId: string): Promise<EmulatorInstance>;

    /** Delete / destroy an instance */
    deleteInstance(instanceId: string): Promise<void>;

    // ── Instance Status ─────────────────────────────────────────
    /** Get current status of an instance */
    getInstanceStatus(instanceId: string): Promise<EmulatorInstance>;

    /** Poll until instance reaches ONLINE state */
    waitUntilReady(
        instanceId: string,
        timeoutMs?: number,
    ): Promise<EmulatorInstance>;

    // ── Snapshots ───────────────────────────────────────────────
    /** Save the current state of a running instance */
    createSnapshot(
        instanceId: string,
        config: SaveSnapshotConfig,
    ): Promise<SnapshotInfo>;

    /** Restore a snapshot (start instance from saved recipe) */
    restoreSnapshot(
        recipeUuid: string,
        instanceName: string,
    ): Promise<EmulatorInstance>;

    // ── Connectivity ────────────────────────────────────────────
    /** Get ADB connection details for an instance */
    connectAdb(instanceId: string): Promise<AdbConnectionInfo>;

    /** Get WebRTC stream URL + access token for an instance */
    getStreamUrl(instanceId: string): Promise<StreamInfo>;

    // ── Discovery ───────────────────────────────────────────────
    /** List all available recipes/blueprints */
    listRecipes(): Promise<PaginatedResponse<RecipeInfo>>;

    /** List all instances for the authenticated user */
    listInstances(): Promise<PaginatedResponse<EmulatorInstance>>;
}
