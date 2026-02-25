declare module "@genymotion/device-web-player" {
    export class DeviceRendererFactory {
        constructor();
        setupRenderer(
            container: HTMLElement,
            webrtcAddress: string,
            options: {
                token: string;
                toolbarOrder?: string[];
                floatingToolbar?: boolean;
                showPhoneBorder?: boolean;
                toolbarPosition?: string;
                [key: string]: unknown;
            },
        ): DeviceRenderer;
    }

    export interface DeviceRenderer {
        disconnect?: () => void;
        VM_communication?: {
            disconnect: () => void;
        };
    }
}
