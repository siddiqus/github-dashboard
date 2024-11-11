import { parse } from "node-html-parser";
import { getPaginatedApiData } from "./api.util";
import chromeCookies from "chrome-cookies-secure";

interface JiraSearchResponse {
  issueTable: {
    table: string;
    total: number;
  };
}

interface JiraIssueSearchProps {
  userEmails: string[];
  startDate: string;
  endDate: string;
  startIndex?: number;
}

async function callSearchApi(body: string) {
  const cookie = await chromeCookies.getCookiesPromised(
    "https://jira.sso.episerver.net",
    "header"
  );

  if (!cookie) {
    return {
      issueTable: {
        table: "",
        total: 0,
      },
    } as JiraSearchResponse;
  }

  const result = await fetch(
    "https://jira.sso.episerver.net/rest/issueNav/1/issueTable",
    {
      headers: {
        __amdmodulename: "jira/issue/utils/xsrf-token-header",
        accept: "*/*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua":
          '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-atlassian-token": "no-check",
        "x-requested-with": "XMLHttpRequest",
        cookie,
      },
      // referrer: "https://jira.sso.episerver.net/issues/?jql=",
      // referrerPolicy: "strict-origin-when-cross-origin",
      body,
      method: "POST",
      mode: "no-cors",
      credentials: "include",
    }
  );

  const json = await result.json();
  return json;
}

async function searchJiraIssues(
  searchProps: JiraIssueSearchProps
): Promise<JiraSearchResponse> {
  const userEmails = searchProps.userEmails.map((e) => `"${e}"`).join(",");

  const body = {
    startIndex: searchProps.startIndex || 0,
    layoutKey: "list-view",
    jql: `assignee in (${userEmails}) AND createdDate >= "${searchProps.startDate}" AND createdDate <= "${searchProps.endDate}"`,
  };

  const bodyUri = new URLSearchParams(body as any).toString();

  return callSearchApi(bodyUri);
}

function validateDateString(dateStr: string) {
  // Regular expression to match YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  // Test the input string against the regex
  return dateRegex.test(dateStr) ? dateStr : null;
}

function responseToJsonMapper(response: JiraSearchResponse) {
  const htmlWrapper = `<div>${response.issueTable.table}<div>`
    .replace(/\n/gm, "")
    .replace(/\s+/gm, " ")
    .trim();

  const parsedHtml = parse(htmlWrapper);
  const issueRows = [...parsedHtml.querySelectorAll(".issuerow")];
  const mappedIssues = issueRows.map((issueRow) => {
    const issueType = (
      issueRow.querySelector(".issuetype .issue-link img") as any
    ).attributes.alt;
    const issueKey = issueRow.querySelector(".issuekey")!.innerText.trim();

    const description = issueRow.querySelector(".summary")!.innerText.trim();

    const status = issueRow.querySelector(".status")!.innerText.trim();
    const createdAt = issueRow.querySelector(".created")!.innerText.trim();
    const resolvedAt = issueRow
      .querySelector(".resolutiondate")!
      .innerText.trim();

    const storyPointsHtml = issueRow.querySelector(".customfield_10002");
    const storyPoints = storyPointsHtml ? storyPointsHtml.innerText.trim() : 0;

    const userEmail = issueRow
      .querySelector(".assignee .user-hover")
      ?.id?.split("assignee_")
      ?.pop();

    return {
      issueType,
      issueKey,
      description,
      status,
      createdAt,
      resolvedAt: validateDateString(resolvedAt),
      storyPoints: storyPoints ? +storyPoints : 0,
      userEmail,
    };
  });
  return mappedIssues;
}

export async function fetchAllJiraIssues(props: JiraIssueSearchProps) {
  const limit = 50;
  const results = await getPaginatedApiData({
    limit,
    getPagination: (response: JiraSearchResponse) => {
      return {
        total: response.issueTable.total,
      };
    },
    getObjectsFromResponseData: (response: JiraSearchResponse) => {
      return responseToJsonMapper(response);
    },
    callApi: (page: number) => {
      return searchJiraIssues({
        ...props,
        startIndex: (page - 1) * limit,
      });
    },
  });

  return results;
}
