import axios from "axios";
import { JiraIssue } from "./types";

const client = axios.create({
  baseURL: process.env.VITE_APP_JIRA_URL,
  headers: {
    "Content-Type": "application/json",
  },
  auth: {
    username: process.env.VITE_APP_JIRA_USER_EMAIL as string,
    password: process.env.VITE_APP_JIRA_PAT as string,
  },
});

type JiraIssueSearchParams = {
  userEmails: string[];
  startDate: string;
  endDate: string;
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

const sampleIssue: JiraIssue = {
  id: "316757",
  key: "CCP-8124",
  fields: {
    statusCategory: {
      key: "done",
      name: "Done",
    },
    resolution: {
      name: "Done",
    },
    lastViewed: null,
    customfield_10063: {
      value: "SEV 3",
    },
    labels: ["cmp_team_4"],
    aggregatetimeoriginalestimate: null,
    issuelinks: [],
    assignee: {
      emailAddress: "maid.dinar@optimizely.com",
    },
    subtasks: [],
    reporter: {
      emailAddress: "debasis.roy@optimizely.com",
    },
    issuetype: {
      name: "Story",
      subtask: false,
    },
    project: {
      key: "CCP",
      name: "Core CMP",
    },
    resolutiondate: "2024-07-02T08:26:45.700+0300",
    customfield_10020: [
      {
        name: "T4 - 24Q3 Sprint01",
        state: "closed",
        startDate: "2024-06-25T06:28:07.535Z",
        endDate: "2024-07-09T11:00:00.000Z",
        completeDate: "2024-07-09T04:35:29.137Z",
      },
    ],
    customfield_10026: "2024-06-27T20:19:19.963+0300",
    updated: "2024-07-02T08:26:45.703+0300",
    timeoriginalestimate: null,
    description:
      "It seems the ellipsis menu options are different in the folder quick preview and in the grid view card or list view row. We should make those two menu options consistent.",
    summary: "Make folder ellipsis menu options consistent",
    duedate: null,
    comment: {
      comments: [
        {
          self: "https://optimizely-ext.atlassian.net/rest/api/2/issue/316758/comment/532219",
          id: "532219",
          author: {
            emailAddress: "maid.dinar@optimizely.com",
          },
          body: "Issue ready for Peer Review on: 26 Jun 2024.",
          created: "2024-06-27T20:19:19.963+0300",
          updated: "2024-06-27T20:19:19.963+0300",
          jsdPublic: true,
        },
      ],
    },
    statuscategorychangedate: "2024-07-02T08:26:45.703+0300",
    status: {
      self: "https://optimizely-ext.atlassian.net/rest/api/2/status/10032",
      description: "(Migrated on 26 Sep 2025 20:11 UTC)",
      iconUrl:
        "https://optimizely-ext.atlassian.net/images/icons/statuses/generic.png",
      name: "Done",
      id: "10032",
      statusCategory: {
        self: "https://optimizely-ext.atlassian.net/rest/api/2/statuscategory/3",
        id: 3,
        key: "done",
        colorName: "green",
        name: "Done",
      },
    },
    aggregatetimeestimate: null,
    creator: {
      emailAddress: "debasis.roy@optimizely.com",
    },
    timespent: null,
    created: "2023-06-14T13:59:24.607+0300",
    attachment: [
      {
        self: "https://optimizely-ext.atlassian.net/rest/api/2/attachment/173431",
        id: "173431",
        filename: "Screenshot 2023-06-14 165956.png",
        author: {
          emailAddress: "debasis.roy@optimizely.com",
        },
        created: "2023-06-14T14:47:44.380+0300",
        size: 467003,
        mimeType: "image/png",
        content:
          "https://optimizely-ext.atlassian.net/rest/api/2/attachment/content/173431",
        thumbnail:
          "https://optimizely-ext.atlassian.net/rest/api/2/attachment/thumbnail/173431",
      },
    ],
  },
};

function buildJql(opts: JiraIssueSearchParams) {
  const { userEmails, startDate, endDate } = opts;
  const clauses: string[] = [];

  if (Array.isArray(userEmails) && userEmails.length) {
    const quoted = userEmails
      .filter((e) => typeof e === "string" && e.trim().length > 0)
      .map((e) => `"${e.replace(/"/g, '\\"')}"`);
    if (quoted.length) {
      clauses.push(`assignee in (${quoted.join(", ")})`);
    }
  }

  const jql = clauses.length ? clauses.join(" AND ") : "ORDER BY created DESC";

  const jqlParam = encodeURIComponent(jql);

  return { jql, jqlParam };
}

export async function searchJiraIssues(opts: JiraIssueSearchParams) {
  const { jqlParam } = buildJql({
    userEmails: opts.userEmails,
    startDate: opts.startDate,
    endDate: opts.endDate,
  });

  let nextPageToken: string | undefined = undefined;

  const results: JiraIssue[] = [];
  let url = `/rest/api/2/search/jql?jql=${jqlParam}`;
  const params = {
    maxResults: 1000,
    fields: "*all",
    fieldsByKeys: true,
    nextPageToken,
  };
  const response: {
    data: {
      issues: JiraIssue[];
      nextPageToken?: string;
    };
  } = await client.get(url, {
    params,
  });
  results.push(...response.data.issues);
  nextPageToken = response.data.nextPageToken;

  while (nextPageToken) {
    const resp: {
      data: {
        issues: JiraIssue[];
        nextPageToken?: string;
      };
    } = await client.get(url, {
      params: { ...params, nextPageToken },
    });
    results.push(...resp.data.issues);
    nextPageToken = resp.data.nextPageToken;
  }
  const mapped = results.map((issue) => transformIssueData(issue));
  return mapped;
}
