import axios from "axios";

// ============================================
// Genymotion SaaS API usage test script
// Requires your SaaS API Token and Instance ID
// ============================================

const API_KEY = process.env.GENYMOTION_API_KEY || "YOUR_API_KEY";
const INSTANCE_ID = process.env.INSTANCE_ID || "YOUR_INSTANCE_ID";

const BASE_URL = "https://api.geny.io/cloud/v1";

async function getPlayerCredentials() {
    if (API_KEY === "YOUR_API_KEY" || INSTANCE_ID === "YOUR_INSTANCE_ID") {
        console.error(
            "⚠️ Please set GENYMOTION_API_KEY and INSTANCE_ID environment variables.",
        );
        return;
    }

    try {
        console.log(`fetching instance details for ${INSTANCE_ID}...`);
        // 1. Fetch the instance details to get the webrtc address
        // Endpoint: GET /instances/:instance_uuid
        const instanceRes = await axios.get(
            `${BASE_URL}/instances/${INSTANCE_ID}`,
            {
                headers: {
                    Accept: "application/json",
                    "x-api-token": API_KEY,
                },
            },
        );

        const instanceData = instanceRes.data;
        const webrtcAddress =
            instanceData.webrtc_url || instanceData.webrtc_address;
        console.log(`✅ WebRTC Address: ${webrtcAddress}`);

        // 2. Fetch the access token to authenticate the player connected to the instance
        console.log(`fetching access token...`);
        const tokenRes = await axios.post(
            `${BASE_URL}/instances/access-token`,
            { instance_uuid: INSTANCE_ID },
            {
                headers: {
                    Accept: "application/json",
                    "x-api-token": API_KEY,
                },
            },
        );

        const token = tokenRes.data.token;
        console.log(`✅ Token: ${token}`);

        console.log("\n=======================================");
        console.log("You can now connect the player using:");
        console.log(`WebRTC Address: ${webrtcAddress}`);
        console.log(`Token: ${token}`);
        console.log("=======================================");
    } catch (error: any) {
        if (error.response) {
            console.error("Request failed with status:", error.response.status);
            console.error(
                "Response data:",
                JSON.stringify(error.response.data, null, 2),
            );
        } else {
            console.error("Error fetching API:", error.message);
        }
    }
}

getPlayerCredentials();
