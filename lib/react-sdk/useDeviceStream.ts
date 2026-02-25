// ============================================================
// useDeviceStream — Resolve stream credentials from instanceId
// ============================================================

import { useState, useEffect, useCallback } from "react";
import type { ResolvedStreamConfig } from "./types";

/** Fetch stream URL + access token from the Genymotion SaaS API */
async function fetchStreamConfig(
    instanceId: string,
    apiKey: string,
): Promise<ResolvedStreamConfig> {
    const BASE_URL = "https://api.geny.io/cloud";
    const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-token": apiKey,
    };

    // 1. Get instance details for WebRTC address
    const instanceRes = await fetch(`${BASE_URL}/v1/instances/${instanceId}`, {
        headers,
    });
    if (!instanceRes.ok) {
        throw new Error(
            `Failed to fetch instance details (${instanceRes.status})`,
        );
    }
    const instanceData = await instanceRes.json();
    const webrtcUrl = instanceData.webrtc_url || instanceData.webrtc_address;

    if (!webrtcUrl) {
        throw new Error("Instance does not have a WebRTC URL — is it ONLINE?");
    }

    // 2. Get access token
    const tokenRes = await fetch(`${BASE_URL}/v1/instances/access-token`, {
        method: "POST",
        headers,
        body: JSON.stringify({ instance_uuid: instanceId }),
    });
    if (!tokenRes.ok) {
        throw new Error(`Failed to fetch access token (${tokenRes.status})`);
    }
    const tokenData = await tokenRes.json();
    const token = tokenData.token || tokenData.access_token;

    if (!token) {
        throw new Error("No access token returned from API");
    }

    return { webrtcUrl, token };
}

/**
 * Hook that resolves stream credentials from an `instanceId` + `apiKey`.
 * If `streamUrl` + `token` are provided directly, they are used as-is.
 */
export function useDeviceStream(options: {
    instanceId?: string;
    apiKey?: string;
    streamUrl?: string;
    token?: string;
}) {
    const { instanceId, apiKey, streamUrl, token } = options;

    const [config, setConfig] = useState<ResolvedStreamConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const resolve = useCallback(async () => {
        // Direct stream URL provided — skip API call
        if (streamUrl && token) {
            setConfig({ webrtcUrl: streamUrl, token });
            return;
        }

        // Resolve from instanceId
        if (!instanceId || !apiKey) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await fetchStreamConfig(instanceId, apiKey);
            setConfig(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [instanceId, apiKey, streamUrl, token]);

    useEffect(() => {
        resolve();
    }, [resolve]);

    return { config, loading, error, refetch: resolve };
}
