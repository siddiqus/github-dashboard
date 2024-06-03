const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const {
  getAllIssues,
  getPrData,
  getMembers,
  getMemberDetails,
} = require("./github-api.service");

const userList = require("../../cmp-users.json");

const userListByUsername = _.keyBy(userList, "username");

function sortMonthsAscending(monthsArray) {
  return monthsArray.sort((a, b) => {
    const [aYear, aMonth] = a.month.split("-");
    const [bYear, bMonth] = b.month.split("-");

    // Compare years
    if (aYear !== bYear) {
      return parseInt(aYear) - parseInt(bYear);
    }

    // If years are the same, compare months
    return parseInt(aMonth) - parseInt(bMonth);
  });
}

function daysDifference(dateFrom, dateTo) {
  // Convert dates to milliseconds
  const date1_ms = new Date(dateFrom).getTime();
  const date2_ms = new Date(dateTo).getTime();

  // Calculate the difference in milliseconds
  const difference_ms = Math.abs(date2_ms - date1_ms);

  // Convert the difference from milliseconds to days
  const difference_days = Math.ceil(difference_ms / (1000 * 60 * 60 * 24));

  return difference_days;
}

function getAveragePrCycleTime(issues) {
  const closed = issues.filter((i) => Boolean(i.closed_at));
  const sum = closed.reduce((sum, pr) => {
    const days = daysDifference(pr.created_at, pr.closed_at);
    return sum + days;
  }, 0);

  return Math.floor(sum / closed.length);
}

function getMonthlyPrStats(prCreatedData) {
  const allRepos = [
    ...new Set(prCreatedData.map((pr) => pr.repository_url.split("/").pop())),
  ];

  const issuesByMonth = _.groupBy(prCreatedData, (pr) => {
    const created = pr.created_at;
    const month = created.substring(0, 7);
    return month;
  });

  const totalPrCounts = prCreatedData.length;

  const prCountsPerRepoPerMonth = {};

  const averagePrCycleTimePerMonth = {};

  for (const month of Object.keys(issuesByMonth)) {
    const issues = issuesByMonth[month];

    const averagePrCycleTime = getAveragePrCycleTime(issues);
    averagePrCycleTimePerMonth[month] = averagePrCycleTime;

    const groupedPerRepo = _.groupBy(issues, (pr) => {
      const repository = pr.repository_url.split("/").pop();
      return repository;
    });

    prCountsPerRepoPerMonth[month] = {};

    for (const repo of allRepos) {
      const countForRepo = groupedPerRepo[repo] || [];
      prCountsPerRepoPerMonth[month][repo] = countForRepo.length;
    }
  }

  const issueStatsByMonth = {};

  for (const month of Object.keys(issuesByMonth)) {
    const prs = issuesByMonth[month];

    const prCount = prs.length;

    issueStatsByMonth[month] = {
      month,
      prCount,
    };
  }

  let statList = Object.values(issueStatsByMonth);
  statList = sortMonthsAscending(statList);

  const averagePrCountPerMonth = Math.round(
    totalPrCounts / Object.keys(issuesByMonth).length
  );

  return {
    statList,
    averagePrCountPerMonth,
    totalPrCounts,
    prCountsPerRepoPerMonth,
    allRepos,
    averagePrCycleTimePerMonth,
  };
}

function getMonthlyReviewStats(reviewedData) {
  const issuesByMonth = _.groupBy(reviewedData, (pr) => {
    const created = pr.created_at;
    const month = created.substring(0, 7);
    return month;
  });

  const reviewCountsPerMonth = {};

  for (const month of Object.keys(issuesByMonth)) {
    const issues = issuesByMonth[month];

    reviewCountsPerMonth[month] = issues.length;
  }

  return {
    reviewCountsPerMonth,
  };
}

function getDataCacheKey({ organization, author, startDate, endDate, mode }) {
  return `${organization}-${author}-${startDate}-${endDate}-${mode}`;
}

function getDataCacheFilePath({
  organization,
  author,
  startDate,
  endDate,
  mode,
}) {
  const cacheKey = getDataCacheKey({
    organization,
    author,
    startDate,
    endDate,
    mode,
  });

  const tmpFolder = path.join(__dirname, "..", "tmp", "search");
  if (!fs.existsSync(tmpFolder)) {
    fs.mkdirSync(tmpFolder);
  }

  const theFile = path.join(tmpFolder, `${cacheKey}.json`);

  return theFile;
}

async function getAllIssuesCached({
  organization,
  author,
  startDate,
  endDate,
  mode,
}) {
  const theFile = getDataCacheFilePath({
    organization,
    author,
    startDate,
    endDate,
    mode,
  });

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

function getPrCacheFilePath({ owner, repo, pullNumber }) {
  const cacheKey = `${owner}-${repo}-${pullNumber}`;

  const tmpFolder = path.join(__dirname, "..", "./tmp", "pr");
  if (!fs.existsSync(tmpFolder)) {
    fs.mkdirSync(tmpFolder);
  }

  const theFile = path.join(tmpFolder, `${cacheKey}.json`);

  return theFile;
}

function isFileOlderThanOneDaySync(filePath) {
  try {
    const now = new Date();
    const stats = fs.statSync(filePath);
    const mtime = new Date(stats.mtime);
    const diff = now - mtime;
    const diffInDays = diff / (1000 * 60 * 60 * 24);

    // Check if the difference is more than 1 day
    return diffInDays > 1;
  } catch (err) {
    console.error(`Error getting stats for file: ${err.message}`);
    return false;
  }
}

async function getPrDataCached({ owner, repo, pullNumber }) {
  const theFile = getPrCacheFilePath({ owner, repo, pullNumber });

  if (fs.existsSync(theFile) && !isFileOlderThanOneDaySync(theFile)) {
    const content = require(theFile);
    return content;
  }

  const result = await getPrData({ owner, repo, pullNumber });

  fs.writeFileSync(theFile, JSON.stringify(result));
  return result;
}

async function getUserData({ organization, author, startDate, endDate }) {
  const [prCreatedData, reviewedData] = await Promise.all([
    getAllIssuesCached({
      organization,
      author,
      startDate,
      endDate,
      mode: "author",
    }),
    getAllIssuesCached({
      organization,
      author,
      startDate,
      endDate,
      mode: "reviewer",
    }),
  ]);

  const avatarUrl = prCreatedData.length
    ? prCreatedData[0].author_avatar_url
    : null;

  const monthlyPrStats = getMonthlyPrStats(prCreatedData);
  const monthlyReviewData = getMonthlyReviewStats(reviewedData);

  const user = userListByUsername[author];

  return {
    name: user ? user.name : author,
    username: author,
    avatarUrl,
    prList: prCreatedData,
    ...monthlyPrStats,
    ...monthlyReviewData,
  };
}

function removeUserDataCache({ organization, author, startDate, endDate }) {
  const authorCachePath = getDataCacheFilePath({
    organization,
    author,
    startDate,
    endDate,
    mode: "author",
  });
  const reviewerCachePath = getDataCacheFilePath({
    organization,
    author,
    startDate,
    endDate,
    mode: "reviewer",
  });

  [authorCachePath, reviewerCachePath].forEach((p) => {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  });
}

function removePrCache({ owner, repo, pullNumber }) {
  const cachePath = getPrCacheFilePath({ owner, repo, pullNumber });

  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
}

module.exports = {
  getUserData,
  removeUserDataCache,
  getPrData: getPrDataCached,
  removePrCache,
};
