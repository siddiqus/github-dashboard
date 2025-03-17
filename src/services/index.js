import * as githubUtils from "./github/utils";
import { resetJiraCache } from "./jira";
import { getUsersFromStore } from "./utils";

export async function getUserData({
  author,
  startDate,
  endDate,
  organization = "newscred",
}) {
  return githubUtils.getUserData({ organization, author, startDate, endDate });
}

// data: Array<{ author, startDate, endDate }>
export async function resetUserDataCache(data, organization = "newscred") {
  const userList = await getUsersFromStore();

  for (const d of data) {
    const { author, startDate, endDate } = d;
    await githubUtils.removeUserDataCache({
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
  }
}

export async function getPr(prList) {
  const results = await Promise.all(
    prList.map((p) =>
      githubUtils.getPrDataCached({
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
    await githubUtils.removePrCache({
      owner,
      pullNumber,
      repo,
    });
  }
}
