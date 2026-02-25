// ============================================================
// InstanceManager — Provider-Agnostic Orchestration Layer
// ============================================================
// Delegates all operations to the injected EmulatorProvider.
// Adds cross-cutting concerns: logging, metrics hooks.

import type { EmulatorProvider } from "./EmulatorProvider";
import type {
    EmulatorInstance,
    CreateInstanceConfig,
    RecipeInfo,
    StreamInfo,
    AdbConnectionInfo,
    SaveSnapshotConfig,
    SnapshotInfo,
    PaginatedResponse,
    ILogger,
} from "../types";

export class InstanceManager {
    private provider: EmulatorProvider;
    private logger?: ILogger;

    constructor(provider: EmulatorProvider, logger?: ILogger) {
        this.provider = provider;
        this.logger = logger;
    }

    /**
     * Swap the underlying emulator provider at runtime.
     * Useful for A/B testing or environment-specific routing.
     */
    setProvider(provider: EmulatorProvider): void {
        this.logger?.info("Emulator provider swapped");
        this.provider = provider;
    }

    // ── Instance Lifecycle ────────────────────────────────────

    async createInstance(
        config: CreateInstanceConfig,
    ): Promise<EmulatorInstance> {
        this.logger?.info(
            `[InstanceManager] Creating instance "${config.name}"`,
        );
        return this.provider.createInstance(config);
    }

    async startInstance(instanceId: string): Promise<EmulatorInstance> {
        this.logger?.info(`[InstanceManager] Starting instance ${instanceId}`);
        return this.provider.startInstance(instanceId);
    }

    async stopInstance(instanceId: string): Promise<EmulatorInstance> {
        this.logger?.info(`[InstanceManager] Stopping instance ${instanceId}`);
        return this.provider.stopInstance(instanceId);
    }

    async deleteInstance(instanceId: string): Promise<void> {
        this.logger?.info(`[InstanceManager] Deleting instance ${instanceId}`);
        return this.provider.deleteInstance(instanceId);
    }

    // ── Instance Status ───────────────────────────────────────

    async getInstanceStatus(instanceId: string): Promise<EmulatorInstance> {
        return this.provider.getInstanceStatus(instanceId);
    }

    async waitUntilReady(
        instanceId: string,
        timeoutMs?: number,
    ): Promise<EmulatorInstance> {
        this.logger?.info(
            `[InstanceManager] Waiting for instance ${instanceId} to be ready`,
        );
        return this.provider.waitUntilReady(instanceId, timeoutMs);
    }

    // ── Snapshots ─────────────────────────────────────────────

    async createSnapshot(
        instanceId: string,
        config: SaveSnapshotConfig,
    ): Promise<SnapshotInfo> {
        this.logger?.info(
            `[InstanceManager] Creating snapshot for ${instanceId}`,
        );
        return this.provider.createSnapshot(instanceId, config);
    }

    async restoreSnapshot(
        recipeUuid: string,
        instanceName: string,
    ): Promise<EmulatorInstance> {
        this.logger?.info(
            `[InstanceManager] Restoring snapshot from recipe ${recipeUuid}`,
        );
        return this.provider.restoreSnapshot(recipeUuid, instanceName);
    }

    // ── Connectivity ──────────────────────────────────────────

    async connectAdb(instanceId: string): Promise<AdbConnectionInfo> {
        this.logger?.info(`[InstanceManager] Connecting ADB for ${instanceId}`);
        return this.provider.connectAdb(instanceId);
    }

    async getStreamUrl(instanceId: string): Promise<StreamInfo> {
        this.logger?.info(
            `[InstanceManager] Getting stream URL for ${instanceId}`,
        );
        return this.provider.getStreamUrl(instanceId);
    }

    // ── Discovery ─────────────────────────────────────────────

    async listRecipes(): Promise<PaginatedResponse<RecipeInfo>> {
        return this.provider.listRecipes();
    }

    async listInstances(): Promise<PaginatedResponse<EmulatorInstance>> {
        return this.provider.listInstances();
    }

    // ── Convenience ───────────────────────────────────────────

    /**
     * Create an instance and wait until it's ready in one call.
     * Returns the ONLINE instance with stream credentials.
     */
    async createAndWait(
        config: CreateInstanceConfig,
        timeoutMs?: number,
    ): Promise<{ instance: EmulatorInstance; stream: StreamInfo }> {
        const instance = await this.createInstance(config);
        const ready = await this.waitUntilReady(instance.uuid, timeoutMs);
        const stream = await this.getStreamUrl(ready.uuid);
        return { instance: ready, stream };
    }
}
