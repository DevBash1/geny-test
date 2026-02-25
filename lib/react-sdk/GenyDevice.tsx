// ============================================================
// GenyDevice — Stream-Only React Component
// ============================================================
// Renders ONLY the Android device display via WebRTC.
// No toolbars, no buttons, no control panels.
// Expose imperative API via ref: connect(), disconnect(), reload(), getStatus().

import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { useDeviceStream } from "./useDeviceStream";
import { useGenyConnection } from "./useGenyConnection";
import type { GenyDeviceProps, GenyDeviceRef } from "./types";

/**
 * Minimal device stream renderer.
 *
 * @example
 * ```tsx
 * // Via instanceId (auto-resolves stream credentials)
 * <GenyDevice
 *   instanceId="abc-123"
 *   apiKey="your-api-token"
 *   autoConnect
 *   style={{ width: 400, height: 800 }}
 * />
 *
 * // Via direct stream URL
 * <GenyDevice
 *   streamUrl="wss://..."
 *   token="access-token"
 *   autoConnect
 * />
 *
 * // With ref for imperative control
 * const ref = useRef<GenyDeviceRef>(null);
 * <GenyDevice ref={ref} instanceId="abc-123" apiKey="token" />
 * // ref.current.connect() / disconnect() / reload() / getStatus()
 * ```
 */
export const GenyDevice = forwardRef<GenyDeviceRef, GenyDeviceProps>(
    function GenyDevice(props, ref) {
        const {
            instanceId,
            apiKey,
            streamUrl,
            token,
            autoConnect = false,
            style,
            className,
            onStateChange,
            onError,
        } = props;

        const containerRef = useRef<HTMLDivElement>(null);

        // Resolve stream credentials
        const {
            config,
            loading,
            error: resolveError,
        } = useDeviceStream({
            instanceId,
            apiKey,
            streamUrl,
            token,
        });

        // Manage WebRTC connection lifecycle
        const { status, connect, disconnect, reload } = useGenyConnection({
            config,
            containerRef,
            autoConnect,
            onStateChange,
            onError,
        });

        // Report resolution errors
        React.useEffect(() => {
            if (resolveError) {
                onError?.(resolveError);
            }
        }, [resolveError, onError]);

        // Expose imperative API via ref
        useImperativeHandle(
            ref,
            () => ({
                connect,
                disconnect,
                reload,
                getStatus: () => status,
            }),
            [connect, disconnect, reload, status],
        );

        return (
            <div
                ref={containerRef}
                style={style}
                className={className}
                data-geny-device
                data-geny-status={status}
                data-geny-loading={loading}
            />
        );
    },
);
