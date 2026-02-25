// ============================================================
// AuthManager — JWT + API Token Authentication
// ============================================================

import type { AuthCredentials, ILogger } from "../types";
import type { IHttpClient } from "../transport/HttpClient";

const DEFAULT_BASE_URL = "https://api.geny.io/cloud";

export class AuthManager {
    private credentials: AuthCredentials;
    private httpClient: IHttpClient;
    private baseUrl: string;
    private logger?: ILogger;

    // JWT state
    private jwt: string | null = null;
    private jwtExpiresAt: number = 0;

    constructor(options: {
        credentials: AuthCredentials;
        httpClient: IHttpClient;
        baseUrl?: string;
        logger?: ILogger;
    }) {
        this.credentials = options.credentials;
        this.httpClient = options.httpClient;
        this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
        this.logger = options.logger;
    }

    /**
     * Returns the auth headers needed for API requests.
     * Handles JWT auto-refresh transparently.
     */
    async getAuthHeaders(): Promise<Record<string, string>> {
        if (this.credentials.type === "api-token") {
            return {
                "x-api-token": this.credentials.apiToken,
            };
        }

        // JWT flow — fetch or refresh token
        if (!this.jwt || this.isTokenExpiringSoon()) {
            await this.refreshJwt();
        }

        return {
            Authorization: `Bearer ${this.jwt}`,
        };
    }

    /**
     * Authenticate via email/password and get a JWT.
     * JWT default validity is 48 hours.
     */
    private async refreshJwt(): Promise<void> {
        if (this.credentials.type !== "jwt") {
            throw new Error(
                "Cannot refresh JWT — credentials are not JWT type",
            );
        }

        this.logger?.info("Authenticating with Genymotion SaaS (JWT)...");

        const response = await this.httpClient.request<{ token: string }>({
            url: `${this.baseUrl}/v1/users/login`,
            method: "POST",
            data: {
                email: this.credentials.email,
                password: this.credentials.password,
            },
        });

        this.jwt = response.data.token;
        // Set expiry to 47 hours from now (1h buffer before 48h expiry)
        this.jwtExpiresAt = Date.now() + 47 * 60 * 60 * 1000;

        this.logger?.info("JWT authentication successful");
    }

    /** Check if the token will expire within the next hour */
    private isTokenExpiringSoon(): boolean {
        return Date.now() >= this.jwtExpiresAt;
    }

    /** Get the current credential type */
    get authType(): "api-token" | "jwt" {
        return this.credentials.type;
    }
}
