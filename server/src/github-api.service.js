const { Octokit } = require("octokit");

const client = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function getQueryQValueForIssuesSearch({
  organization,
  author,
  startDate,
  endDate,
  mode = "author",
}) {
  let str = `org:${organization} is:pr created:${startDate}..${endDate}`;

  if (mode === "author") {
    str = `${str} author:${author}`;
  } else if (mode === "reviewer") {
    str = `${str} reviewed-by:${author}`;
  }

  return str;
}

async function getAllIssues({
  organization,
  author,
  startDate,
  endDate,
  mode,
}) {
  const results = [];

  let totalCount;
  let page = 1;

  while (page <= 10) {
    console.log(`fetching page ${page} for ${author} (${mode})`);
    const res = await client.request("GET /search/issues", {
      q: getQueryQValueForIssuesSearch({
        organization,
        author,
        startDate,
        endDate,
        mode,
      }),
      per_page: 200,
      page,
      sort: "created",
      order: "asc",
    });

    await delay(2000);

    totalCount = res.data.total_count;

    if (results.length === totalCount) {
      break;
    }

    results.push(...res.data.items);

    page++;
  }

  return results;
}

async function getPrData({ owner, repo, pullNumber }) {
  const result = await client.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo,
      pull_number: pullNumber,
    }
  );

  return result.data;
}

async function getMembers(org) {
  return client
    .request("GET /orgs/{org}/members", {
      org,
    })
    .then((d) => d.data);
}

async function getMemberDetails(org, username) {
  return client
    .request("GET /orgs/{org}/members/{username}", {
      username,
      org,
    })
    .then((d) => d.data);
}

module.exports = {
  getAllIssues,
  getPrData,
  getMembers,
  getMemberDetails,
};
