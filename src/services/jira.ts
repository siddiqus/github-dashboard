import axios from "axios";
import userList from "../../cmp-users.json";
import { getFromCache } from "./utils";
import db from "./idb";

export type JiraIssue = {
  issueType: string;
  issueKey: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  storyPoints: number;
  userEmail: string;
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
  const response = await axios.post(
    "http://localhost:4089/jira/issue-search",
    opts
  );

  return response.data as {
    issues: JiraIssue[];
  };
}

function getUserNameFromEmail(email: string): string | null {
  const user = userList.find((u) => u.email === email);
  return user ? user.username : null;
}

async function getJiraIssuesCached(
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
    await db.unsetData(cacheKey);
  }
}

export async function getJiraMonthWiseIssueDataByUsername(
  opts: JiraIssueSearchParams
): Promise<JiraChartData> {
  const { userEmails, startDate, endDate } = opts;
  const jiraData = await getJiraIssuesCached({
    userEmails,
    startDate,
    endDate,
  });

  const issues = jiraData.filter((issue) => issue.status === "Done");

  const months = Array.from(
    new Set(issues.map((d) => d.resolvedAt!.substring(0, 7)))
  ) as string[];

  months.sort((a, b) => a.localeCompare(b));

  const groupedByUser: Record<string, Record<string, number>> = {};

  issues.forEach((issue) => {
    const month = issue.resolvedAt!.substring(0, 7);
    const username = getUserNameFromEmail(issue.userEmail);
    const isInData = opts.userEmails.includes(issue.userEmail);
    if (username && isInData) {
      groupedByUser[username] = groupedByUser[username] ?? {};
      groupedByUser[username][month] = groupedByUser[username][month] ?? 0;
      groupedByUser[username][month]++;
    }
  });

  const chartData: {
    username: string;
    monthDataList: number[];
  }[] = [];

  const usernames = Object.keys(groupedByUser).sort();
  usernames.forEach((username) => {
    const monthWiseData = groupedByUser[username];

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
