// ============================================================
// GenymotionProvider — Genymotion SaaS EmulatorProvider
// ============================================================

import type { EmulatorProvider } from "../core/EmulatorProvider";
import type { AuthManager } from "../auth/AuthManager";
import type { IHttpClient } from "../transport/HttpClient";
import { RetryPolicy } from "../utils/RetryPolicy";
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
    InstanceState,
    RetryConfig,
} from "../types";

const DEFAULT_BASE_URL = "https://api.geny.io/cloud";
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_WAIT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class GenymotionProvider implements EmulatorProvider {
    private httpClient: IHttpClient;
    private authManager: AuthManager;
    private baseUrl: string;
    private logger?: ILogger;
    private retry: RetryPolicy;

    constructor(options: {
        httpClient: IHttpClient;
        authManager: AuthManager;
        baseUrl?: string;
        logger?: ILogger;
        retryConfig?: RetryConfig;
    }) {
        this.httpClient = options.httpClient;
        this.authManager = options.authManager;
        this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
        this.logger = options.logger;
        this.retry = new RetryPolicy(options.retryConfig, options.logger);
    }

    // ── Instance Lifecycle ────────────────────────────────────

    async createInstance(
        config: CreateInstanceConfig,
    ): Promise<EmulatorInstance> {
        this.logger?.info(
            `Creating instance "${config.name}" from recipe ${config.recipeUuid}`,
        );

        const response = await this.authRequest<Record<string, unknown>>(
            "POST",
            `/v1/recipes/${config.recipeUuid}/start-disposable`,
            {
                instance_name: config.name,
                rename_on_conflict: config.allowRenameDuplicate ?? false,
                ...(config.timeouts ? { timeouts: config.timeouts } : {}),
            },
        );

        return this.mapInstance(response);
    }

    async startInstance(instanceId: string): Promise<EmulatorInstance> {
        // Genymotion SaaS disposable instances are created+started in one call.
        // For non-disposable use, re-start from the saved recipe.
        this.logger?.info(`Starting instance ${instanceId}`);
        return this.getInstanceStatus(instanceId);
    }

    async stopInstance(instanceId: string): Promise<EmulatorInstance> {
        this.logger?.info(`Stopping instance ${instanceId}`);

        const response = await this.authRequest<Record<string, unknown>>(
            "POST",
            `/v1/instances/${instanceId}/stop-disposable`,
        );

        return this.mapInstance(response);
    }

    async deleteInstance(instanceId: string): Promise<void> {
        // For disposable instances, stop === delete
        this.logger?.info(`Deleting instance ${instanceId}`);
        await this.stopInstance(instanceId);
    }

    // ── Instance Status ───────────────────────────────────────

    async getInstanceStatus(instanceId: string): Promise<EmulatorInstance> {
        const response = await this.authRequest<Record<string, unknown>>(
            "GET",
            `/v1/instances/${instanceId}`,
        );

        return this.mapInstance(response);
    }

    async waitUntilReady(
        instanceId: string,
        timeoutMs?: number,
    ): Promise<EmulatorInstance> {
        const timeout = timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
        const deadline = Date.now() + timeout;
        this.logger?.info(
            `Waiting for instance ${instanceId} to be ready (timeout: ${timeout}ms)`,
        );

        while (Date.now() < deadline) {
            const instance = await this.getInstanceStatus(instanceId);

            if (instance.state === "ONLINE") {
                this.logger?.info(`Instance ${instanceId} is ONLINE`);
                return instance;
            }

            if (
                instance.state === "ERROR" ||
                instance.state === "STOPPED" ||
                instance.state === "DELETING"
            ) {
                throw new Error(
                    `Instance ${instanceId} entered terminal state: ${instance.state}`,
                );
            }

            this.logger?.debug(
                `Instance ${instanceId} state: ${instance.state}, polling...`,
            );
            await this.sleep(DEFAULT_POLL_INTERVAL_MS);
        }

        throw new Error(
            `Instance ${instanceId} did not become ready within ${timeout}ms`,
        );
    }

    // ── Snapshots ─────────────────────────────────────────────

    async createSnapshot(
        instanceId: string,
        config: SaveSnapshotConfig,
    ): Promise<SnapshotInfo> {
        this.logger?.info(
            `Saving snapshot for instance ${instanceId} (action: ${config.action})`,
        );

        const response = await this.authRequest<Record<string, unknown>>(
            "POST",
            `/v1/instances/${instanceId}/save`,
            {
                action: config.action,
                ...(config.newRecipeName
                    ? { new_recipe_name: config.newRecipeName }
                    : {}),
                ...(config.newOsImageName
                    ? { new_os_image_name: config.newOsImageName }
                    : {}),
            },
        );

        return {
            uuid: String(response.uuid ?? ""),
            name: String(response.name ?? config.newRecipeName ?? ""),
            recipeUuid: String(response.recipe_uuid ?? ""),
            createdAt: String(response.created_at ?? ""),
        };
    }

    async restoreSnapshot(
        recipeUuid: string,
        instanceName: string,
    ): Promise<EmulatorInstance> {
        this.logger?.info(
            `Restoring snapshot from recipe ${recipeUuid} as "${instanceName}"`,
        );
        return this.createInstance({ recipeUuid, name: instanceName });
    }

    // ── Connectivity ──────────────────────────────────────────

    async connectAdb(instanceId: string): Promise<AdbConnectionInfo> {
        const instance = await this.getInstanceStatus(instanceId);

        if (instance.state !== "ONLINE") {
            throw new Error(
                `Cannot connect ADB — instance ${instanceId} is not ONLINE (current: ${instance.state})`,
            );
        }

        const raw = instance.raw ?? {};
        const adbSerial = String(raw.adb_serial ?? instance.adbSerial ?? "");
        const adbPort = Number(
            raw.adb_serial_port ?? instance.adbSerialPort ?? 0,
        );

        if (!adbSerial) {
            throw new Error(
                `No ADB serial available for instance ${instanceId}`,
            );
        }

        // Parse host:port from serial string (e.g., "127.0.0.1:5555")
        const [host, portStr] = adbSerial.includes(":")
            ? adbSerial.split(":")
            : [adbSerial, String(adbPort)];

        return {
            serial: adbSerial,
            host,
            port: parseInt(portStr, 10) || adbPort,
        };
    }

    async getStreamUrl(instanceId: string): Promise<StreamInfo> {
        this.logger?.info(
            `Fetching stream credentials for instance ${instanceId}`,
        );

        // 1. Get the WebRTC address from instance details
        const instance = await this.getInstanceStatus(instanceId);
        const raw = instance.raw ?? {};
        const webrtcUrl = String(
            raw.webrtc_url ?? raw.webrtc_address ?? instance.webrtcUrl ?? "",
        );

        if (!webrtcUrl) {
            throw new Error(
                `No WebRTC URL available for instance ${instanceId}`,
            );
        }

        // 2. Get an access token for the player
        const tokenResponse = await this.authRequest<Record<string, unknown>>(
            "POST",
            "/v1/instances/access-token",
            { instance_uuid: instanceId },
        );

        const token = String(
            tokenResponse.token ?? tokenResponse.access_token ?? "",
        );

        if (!token) {
            throw new Error(
                `Failed to obtain access token for instance ${instanceId}`,
            );
        }

        return {
            webrtcUrl,
            token,
            instanceUuid: instanceId,
        };
    }

    // ── Discovery ─────────────────────────────────────────────

    async listRecipes(): Promise<PaginatedResponse<RecipeInfo>> {
        const response = await this.authRequest<{
            results: Record<string, unknown>[];
            count?: number;
            next?: string | null;
            previous?: string | null;
        }>("GET", "/v3/recipes/");

        return {
            results: (response.results ?? []).map(this.mapRecipe),
            count: response.count,
            next: response.next,
            previous: response.previous,
        };
    }

    async listInstances(): Promise<PaginatedResponse<EmulatorInstance>> {
        const response = await this.authRequest<{
            results: Record<string, unknown>[];
            count?: number;
            next?: string | null;
            previous?: string | null;
        }>("GET", "/v2/instances");

        return {
            results: (response.results ?? []).map(this.mapInstance.bind(this)),
            count: response.count,
            next: response.next,
            previous: response.previous,
        };
    }

    // ── Private Helpers ───────────────────────────────────────

    private async authRequest<T>(
        method: "GET" | "POST" | "PUT" | "DELETE",
        path: string,
        data?: unknown,
    ): Promise<T> {
        return this.retry.execute(async () => {
            const authHeaders = await this.authManager.getAuthHeaders();

            const response = await this.httpClient.request<T>({
                url: `${this.baseUrl}${path}`,
                method,
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    ...authHeaders,
                },
                data,
            });

            return response.data;
        }, `${method} ${path}`);
    }

    private mapInstance(data: Record<string, unknown>): EmulatorInstance {
        return {
            uuid: String(data.uuid ?? ""),
            name: String(data.name ?? ""),
            state: String(data.state ?? "UNKNOWN") as InstanceState,
            recipeUuid: data.recipe_uuid ? String(data.recipe_uuid) : undefined,
            webrtcUrl: data.webrtc_url
                ? String(data.webrtc_url)
                : data.webrtc_address
                  ? String(data.webrtc_address)
                  : undefined,
            adbSerial: data.adb_serial ? String(data.adb_serial) : undefined,
            adbSerialPort: data.adb_serial_port
                ? Number(data.adb_serial_port)
                : undefined,
            createdAt: data.created_at ? String(data.created_at) : undefined,
            updatedAt: data.updated_at ? String(data.updated_at) : undefined,
            raw: data,
        };
    }

    private mapRecipe(data: Record<string, unknown>): RecipeInfo {
        return {
            uuid: String(data.uuid ?? ""),
            name: String(data.name ?? ""),
            androidVersion: data.android_version
                ? String(data.android_version)
                : undefined,
            apiLevel: data.api_level ? Number(data.api_level) : undefined,
            screenWidth: data.screen_width
                ? Number(data.screen_width)
                : undefined,
            screenHeight: data.screen_height
                ? Number(data.screen_height)
                : undefined,
            screenDensity: data.screen_density
                ? Number(data.screen_density)
                : undefined,
            arch: data.arch ? String(data.arch) : undefined,
            raw: data,
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
