declare module "@genymotion/device-web-player" {
    export class DeviceRendererFactory {
        constructor();
        setupRenderer(
            container: HTMLElement,
            webrtcAddress: string,
            options: any,
        ): any;
    }
}
