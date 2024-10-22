import axios from "axios";
import userList from "../../cmp-users.json";

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

export async function searchJiraIssues(opts: {
  startDate: string;
  endDate: string;
  userEmails: string[];
}) {
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

export async function getJiraMonthWiseIssueDataByUsername(opts: {
  startDate: string;
  endDate: string;
  userEmails: string[];
}) {
  const { userEmails, startDate, endDate } = opts;
  const jiraData = await searchJiraIssues({
    userEmails,
    startDate,
    endDate,
  });

  const issues = jiraData.issues.filter((issue) => !!issue.resolvedAt);

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

  Object.keys(groupedByUser).forEach((username) => {
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
