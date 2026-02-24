import axios from 'axios';

async function test() {
    try {
        const uuid = "5ed93e5b-5b4f-4709-92f8-f2e45951324c";
        const res = await axios.get(`https://api.geny.io/cloud/v1/instances/${uuid}`);
        console.log(res.data);
    } catch (e) {
        if (e.response) {
            console.log(e.response.status, e.response.data);
        } else {
            console.log(e.message);
        }
    }
}
test();
