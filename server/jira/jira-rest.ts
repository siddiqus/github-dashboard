import dotenv from "dotenv";
dotenv.config();

import { Version2Client } from "jira.js";

const client = new Version2Client({
  host: "https://jira.sso.episerver.net/",
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

interface IssueSearchResponse {
  issueType: string;
  issueKey: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string;
  userEmail: string;
  storyPoints?: number;
}

function transformIssueData(issue: any): IssueSearchResponse {
  return {
    issueType: issue.fields.issuetype.name,
    issueKey: issue.key,
    description: (issue.fields.description || "")
      .replaceAll(/\r\n/g, "\n")
      .replaceAll(/\n/g, "\n"), // Ensure a default value if description is null
    status: issue.fields.status.name,
    createdAt: issue.fields.created, // Assuming 'created' field exists and is in the correct format
    resolvedAt: issue.fields.resolutiondate || "", // Use an empty string if resolutiondate is null
    userEmail: issue.fields.assignee?.emailAddress || "Unassigned", //Handle unassigned issues
    storyPoints: issue.fields.customfield_12919, // Assuming this field holds story points
  };
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

export async function fetchAllJiraIssues(
  searchProps: JiraIssueSearchProps
): Promise<IssueSearchResponse[]> {
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

  return allIssues.map(transformIssueData);
}

// async function run() {
//   const obj = {
//     startDate: "2024-06-01",
//     endDate: "2025-02-17",
//     userEmails: [
//       "nabil.ashraf@optimizely.com",
//       "anjum.haz@optimizely.com",
//       "tajrian.jahid@optimizely.com",
//       "jannatul.ferdows@optimizely.com",
//     ],
//   };

//   const results = await fetchAllJiraIssues(obj);

//   console.log(results);
// }

// run()
//   .then(() => {
//     console.log("done");
//     process.exit(0);
//   })
//   .catch((err) => {
//     console.log("error", err);
//     process.exit(1);
//   });
