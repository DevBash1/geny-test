// ============================================================
// useGenyConnection — WebRTC Connection Lifecycle Hook
// ============================================================

import { useState, useRef, useCallback, useEffect } from "react";
import type { ConnectionState, ResolvedStreamConfig } from "./types";

/** SSR safety check */
const isBrowser = typeof window !== "undefined";

export interface UseGenyConnectionOptions {
    /** Resolved stream config (webrtcUrl + token) */
    config: ResolvedStreamConfig | null;
    /** Container DOM element for the player */
    containerRef: React.RefObject<HTMLDivElement | null>;
    /** Auto-connect when config becomes available */
    autoConnect?: boolean;
    /** Callback on state change */
    onStateChange?: (state: ConnectionState) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
}

export function useGenyConnection(options: UseGenyConnectionOptions) {
    const { config, containerRef, autoConnect, onStateChange, onError } =
        options;

    const [status, setStatus] = useState<ConnectionState>("disconnected");
    const rendererRef = useRef<any>(null);
    const mountedRef = useRef(true);

    // Update state and notify
    const updateStatus = useCallback(
        (newState: ConnectionState) => {
            if (!mountedRef.current) return;
            setStatus(newState);
            onStateChange?.(newState);
        },
        [onStateChange],
    );

    // ── Connect ───────────────────────────────────────────────

    const connect = useCallback(async () => {
        if (!isBrowser || !config || !containerRef.current) return;

        // Prevent double-mount
        if (rendererRef.current) return;

        updateStatus("connecting");

        try {
            // Dynamically import to stay SSR-safe
            const { DeviceRendererFactory } =
                await import("@genymotion/device-web-player");
            if (!mountedRef.current || !containerRef.current) return;

            const factory = new DeviceRendererFactory();

            rendererRef.current = factory.setupRenderer(
                containerRef.current,
                config.webrtcUrl,
                {
                    token: config.token,
                    // ─── Stream-only: suppress ALL Genymotion UI controls ───
                    toolbarOrder: [],
                    floatingToolbar: false,
                    showPhoneBorder: false,
                },
            );

            updateStatus("connected");
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            updateStatus("error");
            onError?.(error);
        }
    }, [config, containerRef, updateStatus, onError]);

    // ── Disconnect ────────────────────────────────────────────

    const disconnect = useCallback(() => {
        if (!rendererRef.current) return;

        try {
            if (typeof rendererRef.current.disconnect === "function") {
                rendererRef.current.disconnect();
            } else if (
                rendererRef.current.VM_communication &&
                typeof rendererRef.current.VM_communication.disconnect ===
                    "function"
            ) {
                rendererRef.current.VM_communication.disconnect();
            }
        } catch (err) {
            console.error("[GenySDK] Error during disconnect:", err);
        }

        rendererRef.current = null;
        updateStatus("disconnected");
    }, [updateStatus]);

    // ── Reload ────────────────────────────────────────────────

    const reload = useCallback(() => {
        disconnect();
        // Small delay to ensure cleanup completes
        setTimeout(() => connect(), 100);
    }, [disconnect, connect]);

    // ── Auto-connect ──────────────────────────────────────────

    useEffect(() => {
        if (autoConnect && config && !rendererRef.current) {
            connect();
        }
    }, [autoConnect, config, connect]);

    // ── Cleanup on unmount ────────────────────────────────────

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            disconnect();
        };
    }, [disconnect]);

    return { status, connect, disconnect, reload };
}
