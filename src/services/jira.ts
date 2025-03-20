import axios from "axios";
import { getFromCache, getUsersFromStore } from "./utils";
import { dbStore } from "./idb";

export type JiraIssue = {
  issueType: string;
  issueKey: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  storyPoints: number;
  userEmail: string;
  username: string;
};

type JiraIssueSearchParams = {
  userEmails: string[];
  startDate: string;
  endDate: string;
};

type JiraChartData = {
  months: string[];
  chartData: {
    username: string;
    monthDataList: number[];
  }[];
};

export async function searchJiraIssues(opts: JiraIssueSearchParams) {
  const url = `${(import.meta.env.VITA_APP_BACKEND_URL as string).replaceAll(/\/\//g, '/')}:${import.meta.env.VITA_APP_BACKEND_PORT}`
  const response = await axios.post(
    `${url}/jira/issue-search`,
    opts
  );

  const userList = await getUsersFromStore();
  const issues: JiraIssue[] = response.data.issues.map((issue) => {
    const username = getUserNameFromEmail(issue.userEmail, userList);
    return {
      ...issue,
      username,
    };
  });

  return {
    issues,
  };
}

function getUserNameFromEmail(email: string, userList: any[]): string | null {
  const user = userList.find((u) => u.email === email);
  return user ? user.username : null;
}

export async function getJiraIssuesCached(
  opts: JiraIssueSearchParams
): Promise<JiraIssue[]> {
  const emails = opts.userEmails;

  const results = await Promise.all(
    emails.map((email) => {
      return getFromCache({
        getCacheKey: () => `${email}-${opts.startDate}-${opts.endDate}`,
        fn: () => searchJiraIssues(opts),
      });
    })
  );

  return results.map((r) => r.issues).flat();
}

export async function resetJiraCache(opts: JiraIssueSearchParams) {
  for (const email of opts.userEmails) {
    const cacheKey = `${email}-${opts.startDate}-${opts.endDate}`;
    await dbStore.unsetData(cacheKey);
  }
}

export function getJiraMonthWiseIssueDataByUsername(
  usernames: string[],
  jiraData: JiraIssue[]
): JiraChartData {
  const issues = jiraData.filter((issue) => issue.status === "Done");

  const months = Array.from(
    new Set(issues.map((d) => d.resolvedAt!.substring(0, 7)))
  ) as string[];

  months.sort((a, b) => a.localeCompare(b));

  const groupedByUser: Record<string, Record<string, number>> = {};

  issues.forEach((issue) => {
    const month = issue.resolvedAt!.substring(0, 7);
    const username = issue.username;

    if (username && usernames.includes(username)) {
      groupedByUser[username] = groupedByUser[username] ?? {};
      groupedByUser[username][month] = groupedByUser[username][month] ?? 0;
      groupedByUser[username][month]++;
    }
  });

  const chartData: {
    username: string;
    monthDataList: number[];
  }[] = [];

  const sortedUsernames = [...usernames].sort();
  sortedUsernames.forEach((username) => {
    const monthWiseData = groupedByUser[username] || {};

    const monthDataList: number[] = [];

    for (const month of months) {
      const monthCount = monthWiseData[month] || 0;
      monthDataList.push(monthCount);
    }

    chartData.push({
      username,
      monthDataList: monthDataList,
    });
  });

  return {
    months,
    chartData,
  };
}
