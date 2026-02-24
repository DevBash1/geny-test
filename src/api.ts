import axios from "axios";

const BASE_URL = "https://api.geny.io/cloud";

export class GenyAPI {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    private get headers() {
        return {
            Accept: "application/json",
            "x-api-token": this.token,
        };
    }

    async getRecipes() {
        const res = await axios.get(`${BASE_URL}/v3/recipes/`, {
            headers: this.headers,
        });
        return res.data;
    }

    async getInstances() {
        const res = await axios.get(`${BASE_URL}/v2/instances`, {
            headers: this.headers,
        });
        return res.data;
    }

    async getInstance(instanceUuid: string) {
        const res = await axios.get(
            `${BASE_URL}/v1/instances/${instanceUuid}`,
            { headers: this.headers },
        );
        return res.data;
    }

    async createInstance(recipeUuid: string, instanceName: string) {
        const res = await axios.post(
            `${BASE_URL}/v1/recipes/${recipeUuid}/start-disposable`,
            { instance_name: instanceName },
            { headers: this.headers },
        );
        return res.data;
    }

    async stopInstance(instanceUuid: string) {
        const res = await axios.post(
            `${BASE_URL}/v1/instances/${instanceUuid}/stop-disposable`,
            {},
            { headers: this.headers },
        );
        return res.data;
    }

    async getInstanceToken(instanceUuid: string) {
        const res = await axios.post(
            `${BASE_URL}/v1/instances/access-token`,
            { instance_uuid: instanceUuid },
            { headers: this.headers },
        );
        console.log("Access token API response:", res.data);
        return res.data.token || res.data.access_token;
    }
}
