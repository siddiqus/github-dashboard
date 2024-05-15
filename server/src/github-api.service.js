const { Octokit } = require("octokit");
const fs = require("fs");
const path = require("path");

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

async function getAllIssuesCached({
  organization,
  author,
  startDate,
  endDate,
  mode,
}) {
  const cacheKey = `${organization}-${author}-${startDate}-${endDate}-${mode}`;

  const tmpFolder = path.join(__dirname, "..", "tmp", "search");
  if (!fs.existsSync(tmpFolder)) {
    fs.mkdirSync(tmpFolder);
  }

  const theFile = path.join(tmpFolder, `${cacheKey}.json`);

  if (fs.existsSync(theFile)) {
    const content = require(theFile);
    return content;
  }

  const data = await getAllIssues({
    organization,
    author,
    startDate,
    endDate,
    mode,
  });

  fs.writeFileSync(theFile, JSON.stringify(data));

  return data;
}

// async function getCommentsForIssues(owner, repo, pullNumber) {
//   const res = await client.request(
//     `GET /repos/${owner}/${repo}/pulls/${pullNumber}/comments`
//   );

//   return res.data;
// }

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

async function getPrDataCached({ owner, repo, pullNumber }) {
  const cacheKey = `${owner}-${repo}-${pullNumber}`;

  const tmpFolder = path.join(__dirname, "..", "./tmp", "pr");
  if (!fs.existsSync(tmpFolder)) {
    fs.mkdirSync(tmpFolder);
  }

  const theFile = path.join(tmpFolder, `${cacheKey}.json`);

  if (fs.existsSync(theFile)) {
    const content = require(theFile);
    return content;
  }

  const result = await getPrData({ owner, repo, pullNumber });

  fs.writeFileSync(theFile, JSON.stringify(result));
  return result;
}

module.exports = {
  getAllIssues: getAllIssuesCached,
  getPrData: getPrDataCached,
};
