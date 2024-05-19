import axios from "axios";

export async function getUserData({ author, startDate, endDate }) {
  return axios
    .get("http://localhost:9987/data", {
      params: { author, startDate, endDate },
    })
    .then((d) => d.data.data);
}

// data: Array<{ author, startDate, endDate }>
export async function resetCache(data) {
  return axios
    .post("http://localhost:9987/reset-cache", data)
    .then((d) => d.data.data);
}

export async function getPr(prList) {
  // Array<owner, repo, pullNumber>
  return axios
    .post("http://localhost:9987/get-prs", {
      prs: prList,
    })
    .then((d) => d.data.data);
}
