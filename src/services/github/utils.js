import _ from "lodash";
import { getAllCommits, getAllIssues, getPrData } from "./github-api.service";

import { dbStore } from "../idb";
import { getFromCache, getUsersFromStore } from "../utils";
import { resetJiraCache } from "../jira";
import { resetBonuslyCache } from "../bonusly";

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

// type CommitData = {
//   commit: {
//     author: {
//       date: string;
//       name: string;
//       email: string;
//     };
//     message: string;
//     comment_count: number;
//   };
//   author: {
//     login: string;
//   };
//   committer: {
//     login: string;
//   };
//   repository: {
//     name: string;
//     full_name: string;
//   };
// };

function getMonthlyCommitStats(commitData) {
  const commitsByMonth = _.groupBy(commitData, (commit) => {
    const created = commit.commit.author.date;
    const month = created.substring(0, 7);
    return month;
  });

  const commitCountsPerMonth = {};

  for (const month of Object.keys(commitsByMonth)) {
    const commits = commitsByMonth[month];

    commitCountsPerMonth[month] = commits.length;
  }

  return {
    commitCountsPerMonth,
  };
}

function getMonthlyPrStats(prCreatedData, userPrs) {
  const allRepos = [
    ...new Set(prCreatedData.map((pr) => pr.repository_url.split("/").pop())),
  ];

  const issuesByMonth = _.groupBy(prCreatedData, (pr) => {
    const created = pr.created_at;
    const month = created.substring(0, 7);
    return month;
  });

  const prDataByMonth = _.groupBy(userPrs, (pr) => {
    const month = pr.created_at.substring(0, 7); // YYYY-MM format
    return month;
  });

  const totalPrCounts = prCreatedData.length;

  const prAdditionsDeletionsByMonth = {};
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

    const prDataAddDelForMonth = prDataByMonth[month] || [];
    prAdditionsDeletionsByMonth[month] = {
      additions: prDataAddDelForMonth.reduce(
        (sum, pr) => sum + (pr.additions || 0),
        0
      ),
      deletions: prDataAddDelForMonth.reduce(
        (sum, pr) => sum + (pr.deletions || 0),
        0
      ),
    };
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
    prAdditionsDeletionsByMonth,
  };
}

function getMonthlyReviewStats(reviewedData) {
  const issuesByMonth = _.groupBy(reviewedData, (pr) => {
    const created = pr.created_at;
    const month = created.substring(0, 7);
    return month;
  });

  const allRepos = [
    ...new Set(reviewedData.map((pr) => pr.repository_url.split("/").pop())),
  ];

  const reviewCountsPerMonth = {};
  const prReviewCountsPerRepoPerMonth = {};

  for (const month of Object.keys(issuesByMonth)) {
    const issues = issuesByMonth[month];

    reviewCountsPerMonth[month] = issues.length;
    prReviewCountsPerRepoPerMonth[month] = {};

    const groupedPerRepo = _.groupBy(issues, (pr) => {
      const repository = pr.repository_url.split("/").pop();
      return repository;
    });

    for (const repo of allRepos) {
      const countForRepo = groupedPerRepo[repo] || [];
      prReviewCountsPerRepoPerMonth[month][repo] = countForRepo.length;
    }
  }

  return {
    reviewCountsPerMonth,
    prReviewCountsPerRepoPerMonth,
  };
}

function getDataCacheKey({ organization, author, startDate, endDate, mode }) {
  return `${organization}-${author}-${startDate}-${endDate}-${mode}`;
}

async function getAllIssuesCached({
  organization,
  author,
  startDate,
  endDate,
  mode,
}) {
  return getFromCache({
    getCacheKey: () =>
      getDataCacheKey({
        organization,
        author,
        startDate,
        endDate,
        mode,
      }),
    fn: () =>
      getAllIssues({
        organization,
        author,
        startDate,
        endDate,
        mode,
      }),
  });
}

async function getAllCommitsCached({
  organization,
  author,
  startDate,
  endDate,
}) {
  return getFromCache({
    getCacheKey: () =>
      getDataCacheKey({
        organization,
        author,
        startDate,
        endDate,
        mode: "commits",
      }),
    fn: () =>
      getAllCommits({
        organization,
        author,
        startDate,
        endDate,
        mode: "commits",
      }),
  });
}

function getPrCacheKey({ owner, repo, pullNumber }) {
  return `${owner}-${repo}-${pullNumber}`;
}

export async function getPrDataCached({ owner, repo, pullNumber }) {
  return getFromCache({
    getCacheKey: () => getPrCacheKey({ owner, repo, pullNumber }),
    fn: () => getPrData({ owner, repo, pullNumber }),
  });
}

export function getPrApiBody(prList) {
  const data = prList.map((p) => {
    const url = p.html_url;
    const [___, ownerRepoPullNumber] = url.split("github.com/");
    const [owner, repo] = ownerRepoPullNumber.split("/");
    return {
      pullNumber: p.number,
      owner,
      repo,
    };
  });

  return data;
}

export async function getUserPrCreatedStats({
  organization,
  author,
  startDate,
  endDate,
}) {
  const [prCreatedData, commitData] = await Promise.all([
    getAllIssuesCached({
      organization,
      author,
      startDate,
      endDate,
      mode: "author",
    }),
    getAllCommitsCached({
      organization,
      author,
      startDate,
      endDate,
    }),
  ]);

  const avatarUrl = prCreatedData.length
    ? prCreatedData[0].author_avatar_url
    : null;

  const commitCountByMonth = getMonthlyCommitStats(commitData);

  const prList = getPrApiBody(prCreatedData);
  prList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const userPrs = await getPrList(prList);
  const monthlyPrStats = getMonthlyPrStats(prCreatedData, userPrs);

  return {
    avatarUrl,
    monthlyPrStats,
    prList: prCreatedData,
    commitData,
    commitCountByMonth,
    userPrs,
  };
}

export async function getUserPrReviewStats({
  organization,
  author,
  startDate,
  endDate,
}) {
  const reviewedData = await getAllIssuesCached({
    organization,
    author,
    startDate,
    endDate,
    mode: "reviewer",
  });

  const monthlyReviewData = getMonthlyReviewStats(reviewedData);

  return {
    monthlyReviewData,
    reviewedPrList: reviewedData,
  };
}

// data: Array<{ author, startDate, endDate }>
export async function resetUserDataCache(
  data,
  organization = import.meta.env.VITE_APP_GITHUB_ORG
) {
  const userList = await getUsersFromStore();

  for (const d of data) {
    const { author, startDate, endDate } = d;
    await removeUserDataCache({
      organization,
      author,
      startDate,
      endDate,
    });

    await resetJiraCache({
      startDate,
      endDate,
      userEmails: [userList.find((u) => u.username === author).email],
    });

    await resetBonuslyCache({
      startDate,
      endDate,
      userEmails: [userList.find((u) => u.username === author).email],
    });
  }
}

export async function getPrList(prList) {
  const results = await Promise.all(
    prList.map((p) =>
      getPrDataCached({
        owner: p.owner,
        pullNumber: p.pullNumber,
        repo: p.repo,
      })
    )
  );

  return results;
}

export async function clearPrCache(prList) {
  for (const d of prList) {
    const { owner, repo, pullNumber } = d;
    await removePrCache({
      owner,
      pullNumber,
      repo,
    });
  }
}

function getOldPrs(prList, daysThreshold = 5) {
  const now = new Date();
  return prList.filter((pr) => {
    if (!pr.closed_at) {
      // only check open PRs
      const created = new Date(pr.created_at);
      const diffTime = Math.abs(now - created);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > daysThreshold;
    }
    return false;
  });
}

export async function getUserData({
  author,
  startDate,
  endDate,
  organization = import.meta.env.VITE_APP_GITHUB_ORG,
}) {
  const [prCreatedData, reviewedData] = await Promise.all([
    getUserPrCreatedStats({
      organization,
      author,
      startDate,
      endDate,
    }),
    getUserPrReviewStats({
      organization,
      author,
      startDate,
      endDate,
    }),
  ]);

  const userList = await getUsersFromStore();
  const user = userList.find((u) => u.username === author);
  const oldPrs = getOldPrs(prCreatedData.prList);

  return {
    name: user ? user.name : author,
    username: author,
    avatarUrl: prCreatedData.avatarUrl,
    prList: prCreatedData.prList,
    oldPrs,
    ...prCreatedData.monthlyPrStats,
    ...prCreatedData.commitCountByMonth,
    ...reviewedData.monthlyReviewData,
    reviewedPrList: reviewedData.reviewedPrList,
  };
}

export async function removeUserDataCache({
  organization,
  author,
  startDate,
  endDate,
}) {
  const authorCachePath = getDataCacheKey({
    organization,
    author,
    startDate,
    endDate,
    mode: "author",
  });
  const reviewerCachePath = getDataCacheKey({
    organization,
    author,
    startDate,
    endDate,
    mode: "reviewer",
  });

  await dbStore.unsetData(authorCachePath);
  await dbStore.unsetData(reviewerCachePath);
}

export async function removePrCache({ owner, repo, pullNumber }) {
  const cachePath = getPrCacheKey({ owner, repo, pullNumber });

  await dbStore.unsetData(cachePath);
}
