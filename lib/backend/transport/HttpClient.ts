// ============================================================
// HttpClient — Pluggable Transport Layer
// ============================================================

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { HttpRequestConfig, HttpResponse, ILogger } from "../types";

/** Abstract HTTP client interface — implement for custom transports */
export interface IHttpClient {
    request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>>;
}

/**
 * Default HTTP client backed by Axios.
 * Replaceable: implement `IHttpClient` and inject your own.
 */
export class AxiosHttpClient implements IHttpClient {
    private client: AxiosInstance;
    private logger?: ILogger;

    constructor(options?: {
        baseUrl?: string;
        timeout?: number;
        logger?: ILogger;
    }) {
        this.logger = options?.logger;
        this.client = axios.create({
            baseURL: options?.baseUrl,
            timeout: options?.timeout ?? 30000,
            headers: { Accept: "application/json" },
        });
    }

    async request<T = unknown>(
        config: HttpRequestConfig,
    ): Promise<HttpResponse<T>> {
        this.logger?.debug(`${config.method} ${config.url}`);

        const axiosConfig: AxiosRequestConfig = {
            url: config.url,
            method: config.method,
            headers: config.headers,
            data: config.data,
            params: config.params,
            timeout: config.timeout,
        };

        const response = await this.client.request<T>(axiosConfig);

        return {
            status: response.status,
            data: response.data,
            headers: response.headers as Record<string, string>,
        };
    }
}
