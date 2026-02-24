import axios from "axios";

// ============================================
// Genymotion SaaS API usage test script
// Creates a new disposable instance, waits for it, and gets the token
// Requires your SaaS API Token and a valid Recipe UUID
// ============================================

const API_KEY = process.env.GENYMOTION_API_KEY || "YOUR_API_KEY";
const RECIPE_ID = process.env.RECIPE_ID || "YOUR_RECIPE_ID";

const BASE_URL = "https://api.geny.io/cloud/v1";

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createAndGetInstance() {
    if (API_KEY === "YOUR_API_KEY" || RECIPE_ID === "YOUR_RECIPE_ID") {
        console.error(
            "⚠️ Please set GENYMOTION_API_KEY and RECIPE_ID environment variables.",
        );
        return;
    }

    const headers = {
        Accept: "application/json",
        "x-api-token": API_KEY,
    };

    try {
        console.log(
            `Starting a new disposable instance from recipe: ${RECIPE_ID}...`,
        );
        const instanceName = `demo-instance-${Date.now()}`;

        const createRes = await axios.post(
            `${BASE_URL}/recipes/${RECIPE_ID}/start-disposable`,
            { instance_name: instanceName },
            { headers },
        );

        const instanceId = createRes.data.uuid;
        console.log(`✅ Instance created with UUID: ${instanceId}`);
        console.log(`Waiting for instance to be ready...`);

        let webrtcAddress = "";
        let isReady = false;

        // Poll for instance state -> ONLINE
        while (!isReady) {
            await sleep(5000);
            process.stdout.write(".");
            const statusRes = await axios.get(
                `${BASE_URL}/instances/${instanceId}`,
                { headers },
            );
            const state = statusRes.data.state;

            if (state === "ONLINE") {
                isReady = true;
                webrtcAddress =
                    statusRes.data.webrtc_url || statusRes.data.webrtc_address;
                console.log(`\n✅ Instance is ONLINE!`);
            } else if (
                state === "ERROR" ||
                state === "STOPPED" ||
                state === "DELETING"
            ) {
                console.error(
                    `\n❌ Instance failed to start or stopped unexpected. State: ${state}`,
                );
                return;
            }
        }

        // Fetch the access token to authenticate the player connected to the instance
        console.log(`fetching access token...`);
        const tokenRes = await axios.post(
            `${BASE_URL}/instances/access-token`,
            { instance_uuid: instanceId },
            { headers },
        );

        const token = tokenRes.data.token;
        console.log(`✅ Token: ${token}`);

        console.log("\n=======================================");
        console.log("You can now connect the player using:");
        console.log(`WebRTC Address: ${webrtcAddress}`);
        console.log(`Token: ${token}`);
        console.log(`Instance UUID:  ${instanceId}`);
        console.log("=======================================");
    } catch (error: any) {
        if (error.response) {
            console.error(
                "\nRequest failed with status:",
                error.response.status,
            );
            console.error(
                "Response data:",
                JSON.stringify(error.response.data, null, 2),
            );
        } else {
            console.error("\nError calling API:", error.message);
        }
    }
}

createAndGetInstance();
