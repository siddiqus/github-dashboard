// Types inferred from the sample issue
export interface JiraUserRef {
  emailAddress: string;
}

export interface JiraStatusCategoryBasic {
  key: string;
  name: string;
}

export interface JiraResolution {
  name: string;
}

export interface JiraSprintLike {
  name: string;
  state: string;
  startDate: string;
  endDate: string;
  completeDate: string;
}

export interface JiraComment {
  self: string;
  id: string;
  author: JiraUserRef;
  body: string;
  created: string;
  updated: string;
  jsdPublic: boolean;
}

export interface JiraAttachment {
  self: string;
  id: string;
  filename: string;
  author: JiraUserRef;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail: string;
}

export interface JiraIssueType {
  name: string;
  subtask: boolean;
}

export interface JiraProjectRef {
  key: string;
  name: string;
}

export interface JiraStatus {
  self: string;
  description: string;
  iconUrl: string;
  name: string;
  id: string;
  statusCategory: {
    self: string;
    id: number;
    key: string;
    colorName: string;
    name: string;
  };
}

export interface JiraIssueFields {
  statusCategory: JiraStatusCategoryBasic;
  resolution: JiraResolution | null;
  lastViewed: string | null;
  customfield_10063?: { value: string };
  labels: string[];
  aggregatetimeoriginalestimate: number | null;
  issuelinks: any[];
  assignee: JiraUserRef | null;
  subtasks: any[];
  reporter: JiraUserRef;
  issuetype: JiraIssueType;
  project: JiraProjectRef;
  resolutiondate: string | null;
  customfield_10020?: JiraSprintLike[];
  customfield_10026?: string;
  updated: string;
  timeoriginalestimate: number | null;
  description: string | null;
  summary: string;
  duedate: string | null;
  comment: { comments: JiraComment[] };
  statuscategorychangedate: string;
  status: JiraStatus;
  aggregatetimeestimate: number | null;
  creator: JiraUserRef;
  timespent: number | null;
  created: string;
  attachment: JiraAttachment[];
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: JiraIssueFields;
}
