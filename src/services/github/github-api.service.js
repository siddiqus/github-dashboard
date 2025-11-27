import { Octokit } from "octokit";

const client = new Octokit({
  auth: import.meta.env.VITE_APP_GITHUB_TOKEN,
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
    str = `${str} reviewed-by:${author} -author:${author}`;
  }

  return str;
}

export async function getAllIssues({
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

    await delay(1000);

    totalCount = res.data.total_count;

    if (results.length === totalCount) {
      break;
    }

    results.push(...res.data.items);

    page++;
  }

  return results;
}

export async function getPrData({ owner, repo, pullNumber }) {
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

export async function getMembers(org) {
  return client
    .request("GET /orgs/{org}/members", {
      org,
    })
    .then((d) => d.data);
}

export async function getMemberDetails(org, username) {
  return client
    .request("GET /orgs/{org}/members/{username}", {
      username,
      org,
    })
    .then((d) => d.data);
}

export async function getAllCommits({
  organization,
  author,
  startDate,
  endDate,
}) {
  const results = [];
  let page = 1;

  while (page <= 10) {
    console.log(`fetching commits page ${page} for ${author}`);
    const res = await client.request("GET /search/commits", {
      q: `org:${organization} author:${author} author-date:${startDate}..${endDate}`,
      per_page: 100,
      page,
    });

    if (res.data.total_count === results.length) {
      break;
    }

    results.push(...res.data.items);
    page++;
  }

  return results;
}
