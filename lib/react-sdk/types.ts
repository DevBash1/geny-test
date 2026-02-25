// ============================================================
// React SDK — Type Definitions
// ============================================================

/** Connection state of the device stream */
export type ConnectionState =
    | "disconnected"
    | "connecting"
    | "connected"
    | "error";

/** Props accepted by @see GenyDevice */
export interface GenyDeviceProps {
    /**
     * Instance ID — if provided, the component will resolve the
     * stream URL and token automatically via the backend SDK.
     * Requires `apiKey` to be set.
     */
    instanceId?: string;

    /** API token for authenticating with Genymotion SaaS (used with instanceId) */
    apiKey?: string;

    /**
     * Direct WebRTC stream URL — use this when you already
     * have the stream endpoint (bypasses backend SDK).
     */
    streamUrl?: string;

    /** Direct access token (used with streamUrl) */
    token?: string;

    /** Automatically connect on mount (default: false) */
    autoConnect?: boolean;

    /** Container inline styles */
    style?: React.CSSProperties;

    /** Container CSS class name */
    className?: string;

    /** Callback when connection state changes */
    onStateChange?: (state: ConnectionState) => void;

    /** Callback on connection error */
    onError?: (error: Error) => void;
}

/** Imperative methods exposed via ref */
export interface GenyDeviceRef {
    /** Establish the WebRTC connection */
    connect(): void;
    /** Disconnect the stream */
    disconnect(): void;
    /** Reconnect (disconnect + connect) */
    reload(): void;
    /** Get current connection state */
    getStatus(): ConnectionState;
}

/** Configuration resolved for the stream renderer */
export interface ResolvedStreamConfig {
    webrtcUrl: string;
    token: string;
}
