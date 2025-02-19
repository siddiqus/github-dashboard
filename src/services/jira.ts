import axios from "axios";
import userList from "../../cmp-users.json";
import { getFromCache } from "./utils";

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

export async function searchJiraIssues(opts: JiraIssueSearchParams) {
  const response = await axios.post(
    "http://localhost:4089/jira/issue-search",
    opts
  );

  return response.data as {
    issues: JiraIssue[];
  };
}

function getUserNameFromEmail(email: string) {
  const user = userList.find((u) => u.email === email);
  return user ? user.username : null;
}

async function getJiraIssuesCached(opts: JiraIssueSearchParams) {
  return getFromCache({
    getCacheKey: () =>
      `${opts.userEmails.join(",")}-${opts.startDate}-${opts.endDate}`,
    fn: () => searchJiraIssues(opts),
  });
}

export async function getJiraMonthWiseIssueDataByUsername(
  opts: JiraIssueSearchParams
) {
  const { userEmails, startDate, endDate } = opts;
  const jiraData = await getJiraIssuesCached({
    userEmails,
    startDate,
    endDate,
  });

  const issues = jiraData.issues.filter((issue) => issue.status === "Done");

  const months = Array.from(
    new Set(issues.map((d) => d.resolvedAt!.substring(0, 7)))
  );

  months.sort((a, b) => a.localeCompare(b));

  const groupedByUser: Record<string, Record<string, number>> = {};

  issues.forEach((issue) => {
    const month = issue.resolvedAt!.substring(0, 7);
    const username = getUserNameFromEmail(issue.userEmail);
    if (username) {
      groupedByUser[username] = groupedByUser[username] ?? {};
      groupedByUser[username][month] = groupedByUser[username][month] ?? 0;
      groupedByUser[username][month]++;
    }
  });

  const chartData: Array<{
    username: string;
    monthDataList: number[];
  }> = [];

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
