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

interface IssueSearchResponse {
  issueType: string;
  issueKey: string;
  summary: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string;
  userEmail: string;
  storyPoints?: number;
}

const backendBaseUrl = import.meta.env.VITE_APP_BACKEND_URL as string;
const backendPort = import.meta.env.VITE_APP_BACKEND_PORT;
const jiraUrl = `${backendBaseUrl.replace(/\/+$/, "")}:${backendPort}`;

const jiraAxiosClient = axios.create({
  baseURL: `${jiraUrl}/jira`,
  headers: {
    "Content-Type": "application/json",
  },
});

function transformIssueData(issue: any): IssueSearchResponse {
  return {
    issueType: issue.fields.issuetype.name,
    issueKey: issue.key,
    description: issue.fields.description || "",
    status: issue.fields.status.name,
    createdAt: issue.fields.created, // Assuming 'created' field exists and is in the correct format
    resolvedAt: issue.fields.resolutiondate || issue.fields.created || "", // Use an empty string if resolutiondate is null
    userEmail: issue.fields.assignee?.emailAddress || "Unassigned", //Handle unassigned issues
    storyPoints: issue.fields.customfield_12919, // Assuming this field holds story points
    summary: issue.fields.summary,
  };
}

export async function searchJiraIssues(opts: JiraIssueSearchParams) {
  const response = await jiraAxiosClient.post(`/issue-search`, opts);

  const userList = await getUsersFromStore();
  const issues: JiraIssue[] = response.data.issues.map((issue) => {
    const transformedIssue = transformIssueData(issue);
    const username = getUserNameFromEmail(transformedIssue.userEmail, userList);
    return {
      ...transformedIssue,
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
