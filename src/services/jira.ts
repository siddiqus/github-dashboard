import axios from "axios";

export async function searchJiraIssues(opts: {
  startDate: string;
  endDate: string;
  userEmails: string[];
}) {
  const response = await axios.post(
    "http://localhost:4089/jira/issue-search",
    opts
  );

  return response.data;
}
