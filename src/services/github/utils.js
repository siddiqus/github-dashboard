import _ from "lodash";
import { getAllIssues, getPrData } from "./github-api.service";

import { dbStore } from "../idb";
import { getFromCache, getUsersFromStore } from "../utils";

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

function getPrCacheKey({ owner, repo, pullNumber }) {
  return `${owner}-${repo}-${pullNumber}`;
}

export async function getPrDataCached({ owner, repo, pullNumber }) {
  return getFromCache({
    getCacheKey: () => getPrCacheKey({ owner, repo, pullNumber }),
    fn: () => getPrData({ owner, repo, pullNumber }),
  });
}

export async function getUserPrCreatedStats({
  organization,
  author,
  startDate,
  endDate,
}) {
  const prCreatedData = await getAllIssuesCached({
    organization,
    author,
    startDate,
    endDate,
    mode: "author",
  })

  const avatarUrl = prCreatedData.length
    ? prCreatedData[0].author_avatar_url
    : null;

  const monthlyPrStats = getMonthlyPrStats(prCreatedData);

  return {
    avatarUrl,
    monthlyPrStats,
    prList: prCreatedData
  }
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
  })

  const monthlyReviewData = getMonthlyReviewStats(reviewedData);

  return {
    monthlyReviewData
  }
}

export async function getUserData({
  organization,
  author,
  startDate,
  endDate,
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
    })
  ])

  const userList = await getUsersFromStore();
  const user = userList.find(u => u.username === author);

  return {
    name: user ? user.name : author,
    username: author,
    avatarUrl: prCreatedData.avatarUrl,
    prList: prCreatedData.prList,
    ...prCreatedData.monthlyPrStats,
    ...reviewedData.monthlyReviewData,
  };
}

// type AsyncReturnType<T extends (...args: any) => Promise<any>> =
//     T extends (...args: any) => Promise<infer R> ? R : any
// export type UserDataListType = AsyncReturnType<typeof getUserData>;

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
