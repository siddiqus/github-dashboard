import axios from "axios";

const client = axios.create({
  baseURL: "http://localhost:9987",
});

export async function getUserData({ author, startDate, endDate }) {
  return client
    .get("/data", {
      params: { author, startDate, endDate },
    })
    .then((d) => d.data.data);
}

// data: Array<{ author, startDate, endDate }>
export async function resetUserDataCache(data) {
  return client.post("/reset-user-data-cache", data).then((d) => d.data.data);
}

export async function getPr(prList) {
  // Array<owner, repo, pullNumber>
  return client
    .post("/get-prs", {
      prs: prList,
    })
    .then((d) => d.data.data);
}

export async function clearPrCache(prList) {
  // Array<owner, repo, pullNumber>
  return client
    .post("/reset-pr-cache", {
      prs: prList,
    })
    .then((d) => d.data.data);
}
