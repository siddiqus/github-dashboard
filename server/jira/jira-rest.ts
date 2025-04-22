import dotenv from "dotenv";
dotenv.config();

import { Version2Client } from "jira.js";

const client = new Version2Client({
  host: process.env.VITE_APP_JIRA_URL || "",
  authentication: {
    personalAccessToken: process.env.VITE_APP_JIRA_PAT || "",
  },
});

interface JiraIssueSearchProps {
  userEmails: string[];
  startDate: string;
  endDate: string;
  startIndex?: number;
}

async function searchJiraIssues(
  searchProps: JiraIssueSearchProps
): Promise<any> {
  const userEmails = searchProps.userEmails.map((e) => `"${e}"`).join(",");

  const jql = `assignee in (${userEmails}) AND createdDate >= "${searchProps.startDate}" AND createdDate <= "${searchProps.endDate}"`;

  try {
    return await client.issueSearch.searchForIssuesUsingJql({
      jql,
      startAt: searchProps.startIndex || 0,
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function fetchAllJiraIssues(searchProps: JiraIssueSearchProps) {
  const allIssues: any[] = [];
  let startIndex = searchProps.startIndex || 0;
  let totalIssues = 0;

  do {
    // Update the startIndex in the search properties
    const currentSearchProps = { ...searchProps, startIndex };

    // Fetch issues from Jira
    const result = await searchJiraIssues(currentSearchProps);

    // Add fetched issues to the allIssues array
    allIssues.push(...result.issues);

    // Update totalIssues and startIndex for the next iteration
    totalIssues = result.total;
    startIndex += result.maxResults;
  } while (startIndex < totalIssues);

  return allIssues;
}
