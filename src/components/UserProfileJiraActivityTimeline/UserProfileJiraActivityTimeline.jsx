import { useMemo, useState } from "react";
import { Badge, Card, Col, Dropdown, InputGroup, Row, Table } from "react-bootstrap";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const JIRA_ACTIVITY_TYPES = {
  ASSIGNED: "assigned",
  COMMENTED: "commented",
  STATUS_CHANGE: "status_change",
  CLOSED: "closed",
};

const JIRA_ACTIVITY_TYPE_CONFIG = {
  [JIRA_ACTIVITY_TYPES.ASSIGNED]: {
    label: "Assigned",
    icon: "👤",
    badgeColor: "info",
  },
  [JIRA_ACTIVITY_TYPES.COMMENTED]: {
    label: "Commented",
    icon: "💬",
    badgeColor: "warning",
    badgeClass: "badge-outline-orange",
  },
  [JIRA_ACTIVITY_TYPES.STATUS_CHANGE]: {
    label: "Status Change",
    icon: "🔄",
    badgeColor: "primary",
  },
  [JIRA_ACTIVITY_TYPES.CLOSED]: {
    label: "Closed",
    icon: "✅",
    badgeColor: "success",
  },
};

const CLOSED_STATUSES = ["done", "closed", "resolved"];

// --- Normalization functions ---

function normalizeAssignedActivities(issues, userEmail, jiraBaseUrl) {
  const activities = [];
  for (const issue of issues) {
    for (const history of issue.changelogHistories) {
      for (const item of history.items) {
        if (item.field === "assignee" && item.toString) {
          activities.push({
            id: `assigned-${issue.issueKey}-${history.id}`,
            type: JIRA_ACTIVITY_TYPES.ASSIGNED,
            date: history.created,
            title: `${issue.issueKey}: ${issue.summary}`,
            project: issue.project,
            url: `${jiraBaseUrl}/browse/${issue.issueKey}`,
            metadata: {
              issueKey: issue.issueKey,
              assignedTo: item.toString,
            },
          });
        }
      }
    }
  }
  return activities;
}

function normalizeCommentActivities(issues, userEmail, jiraBaseUrl) {
  const activities = [];
  for (const issue of issues) {
    for (const comment of issue.comments) {
      if (comment.authorEmail.toLowerCase() === userEmail.toLowerCase()) {
        activities.push({
          id: `comment-${issue.issueKey}-${comment.id}`,
          type: JIRA_ACTIVITY_TYPES.COMMENTED,
          date: comment.created,
          title: `${issue.issueKey}: ${issue.summary}`,
          project: issue.project,
          url: `${jiraBaseUrl}/browse/${issue.issueKey}`,
          metadata: {
            issueKey: issue.issueKey,
            commentSnippet: comment.body.substring(0, 100),
          },
        });
      }
    }
  }
  return activities;
}

function normalizeStatusChangeActivities(issues, userEmail, jiraBaseUrl) {
  const activities = [];
  for (const issue of issues) {
    for (const history of issue.changelogHistories) {
      if (history.authorEmail.toLowerCase() !== userEmail.toLowerCase())
        continue;
      for (const item of history.items) {
        if (item.field === "status") {
          const isClosed = CLOSED_STATUSES.includes(
            (item.toString || "").toLowerCase()
          );
          if (!isClosed) {
            activities.push({
              id: `status-${issue.issueKey}-${history.id}`,
              type: JIRA_ACTIVITY_TYPES.STATUS_CHANGE,
              date: history.created,
              title: `${issue.issueKey}: ${issue.summary}`,
              project: issue.project,
              url: `${jiraBaseUrl}/browse/${issue.issueKey}`,
              metadata: {
                issueKey: issue.issueKey,
                from: item.fromString,
                to: item.toString,
              },
            });
          }
        }
      }
    }
  }
  return activities;
}

function normalizeClosedActivities(issues, userEmail, jiraBaseUrl) {
  const activities = [];
  for (const issue of issues) {
    for (const history of issue.changelogHistories) {
      if (history.authorEmail.toLowerCase() !== userEmail.toLowerCase())
        continue;
      for (const item of history.items) {
        if (
          item.field === "status" &&
          CLOSED_STATUSES.includes((item.toString || "").toLowerCase())
        ) {
          activities.push({
            id: `closed-${issue.issueKey}-${history.id}`,
            type: JIRA_ACTIVITY_TYPES.CLOSED,
            date: history.created,
            title: `${issue.issueKey}: ${issue.summary}`,
            project: issue.project,
            url: `${jiraBaseUrl}/browse/${issue.issueKey}`,
            metadata: {
              issueKey: issue.issueKey,
              from: item.fromString,
              to: item.toString,
            },
          });
        }
      }
    }
  }
  return activities;
}

// --- Week grouping ---

function formatShortDate(date) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function getISOWeekData(dateString) {
  const date = new Date(dateString);
  const thursday = new Date(date);
  thursday.setDate(date.getDate() - ((date.getDay() + 6) % 7) + 3);

  const year = thursday.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const weekNumber = Math.ceil(
    ((thursday - jan1) / 86400000 + jan1.getDay() + 1) / 7
  );

  const weekKey = `${year}-W${String(weekNumber).padStart(2, "0")}`;

  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekKey,
    mondayDate: monday,
    sundayDate: sunday,
    weekLabel: `${monday.getFullYear()} ${formatShortDate(monday)} - ${formatShortDate(sunday)}`,
  };
}

function groupActivitiesByWeek(activities) {
  const weekMap = {};

  for (const activity of activities) {
    const { weekKey, mondayDate, sundayDate, weekLabel } = getISOWeekData(
      activity.date
    );

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = {
        weekKey,
        weekLabel,
        mondayDate,
        sundayDate,
        activities: [],
      };
    }
    weekMap[weekKey].activities.push(activity);
  }

  for (const week of Object.values(weekMap)) {
    week.activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    week.counts = {};
    for (const type of Object.values(JIRA_ACTIVITY_TYPES)) {
      week.counts[type] = week.activities.filter((a) => a.type === type).length;
    }
  }

  return Object.values(weekMap).sort((a, b) => b.mondayDate - a.mondayDate);
}

// --- Sub-components ---

function ActivitySummaryBar({ activities }) {
  const counts = useMemo(() => {
    const c = {};
    for (const type of Object.values(JIRA_ACTIVITY_TYPES)) {
      c[type] = activities.filter((a) => a.type === type).length;
    }
    return c;
  }, [activities]);

  return (
    <Card className="mb-3">
      <Card.Body className="d-flex gap-3 flex-wrap align-items-center">
        {Object.entries(JIRA_ACTIVITY_TYPE_CONFIG).map(([type, config]) => (
          <div key={type} className="d-flex align-items-center gap-1">
            <Badge
              bg=""
              className={`border border-${config.badgeColor} text-${config.badgeColor} ${config.badgeClass || ""}`}
            >
              {config.label}
            </Badge>
            <span className="fw-bold">{counts[type] || 0}</span>
          </div>
        ))}
        <div className="ms-auto text-muted">
          Total: <span className="fw-bold">{activities.length}</span>
        </div>
      </Card.Body>
    </Card>
  );
}

function ActivityFilterBar({ activeTypeFilters, onFilterChange }) {
  function toggleFilter(type) {
    const next = new Set(activeTypeFilters);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    onFilterChange(next);
  }

  return (
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div style={{ padding: "15px", fontWeight: "600" }}>
        Items: {activeTypeFilters.size} of{" "}
        {Object.keys(JIRA_ACTIVITY_TYPE_CONFIG).length} types
      </div>
      <InputGroup style={{ width: "auto" }}>
        <Dropdown autoClose="outside">
          <Dropdown.Toggle variant="light">
            Filter Activity Type
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {Object.entries(JIRA_ACTIVITY_TYPE_CONFIG).map(([type, config]) => (
              <Dropdown.Item
                key={type}
                onClick={() => toggleFilter(type)}
                active={activeTypeFilters.has(type)}
              >
                {config.label}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </InputGroup>
    </div>
  );
}

function ActivityRow({ activity }) {
  const config = JIRA_ACTIVITY_TYPE_CONFIG[activity.type];

  let detail = activity.title;
  if (
    activity.type === JIRA_ACTIVITY_TYPES.STATUS_CHANGE ||
    activity.type === JIRA_ACTIVITY_TYPES.CLOSED
  ) {
    detail += ` (${activity.metadata.from} → ${activity.metadata.to})`;
  }

  return (
    <tr>
      <td style={{ width: "130px", verticalAlign: "middle" }}>
        <Badge
          bg=""
          className={`border border-${config.badgeColor} text-${config.badgeColor} ${config.badgeClass || ""}`}
          style={{ fontSize: "11px" }}
        >
          {config.label}
        </Badge>
      </td>
      <td
        style={{ width: "90px", verticalAlign: "middle" }}
        className="text-muted"
      >
        {new Date(activity.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </td>
      <td
        style={{ width: "80px", verticalAlign: "middle" }}
        className="text-muted"
      >
        {activity.project}
      </td>
      <td style={{ verticalAlign: "middle" }}>
        <a href={activity.url} target="_blank" rel="noopener noreferrer">
          {detail}
        </a>
      </td>
    </tr>
  );
}

function WeekSection({ week, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card className="mb-2">
      <Card.Header
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer", backgroundColor: "white" }}
        className="d-flex justify-content-between align-items-center"
      >
        <span style={{ fontWeight: "500" }}>{week.weekLabel}</span>
        <div className="d-flex gap-2 align-items-center">
          {Object.entries(JIRA_ACTIVITY_TYPE_CONFIG).map(([type, config]) => {
            const count = week.counts[type] || 0;
            if (count === 0) return null;
            return (
              <Badge
                key={type}
                bg=""
                className={`border border-${config.badgeColor} text-${config.badgeColor} ${config.badgeClass || ""}`}
                style={{
                  fontSize: "11px",
                  fontWeight: "normal",
                }}
              >
                {config.label}: {count}
              </Badge>
            );
          })}
          <Badge
            bg=""
            className="border fw-bold"
            style={{
              fontSize: "11px",
              borderColor: "#adb5bd",
              color: "#495057",
            }}
          >
            {week.activities.length}
          </Badge>
        </div>
      </Card.Header>
      {expanded && (
        <Card.Body style={{ padding: 0 }}>
          <Table hover size="sm" className="mb-0">
            <tbody>
              {week.activities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </tbody>
          </Table>
        </Card.Body>
      )}
    </Card>
  );
}

function ActivityChart({ weekGroups }) {
  const chartData = useMemo(() => {
    const reversed = [...weekGroups].reverse();
    return {
      labels: reversed.map((w) => w.weekLabel),
      datasets: [
        {
          label: "Total",
          data: reversed.map((w) => w.activities.length),
          borderColor: "rgb(75, 75, 75)",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Assigned",
          data: reversed.map(
            (w) => w.counts[JIRA_ACTIVITY_TYPES.ASSIGNED] || 0
          ),
          borderColor: "rgb(13, 202, 240)",
          borderWidth: 1.5,
          tension: 0.3,
        },
        {
          label: "Commented",
          data: reversed.map(
            (w) => w.counts[JIRA_ACTIVITY_TYPES.COMMENTED] || 0
          ),
          borderColor: "rgb(255, 193, 7)",
          borderWidth: 1.5,
          tension: 0.3,
        },
        {
          label: "Status Change",
          data: reversed.map(
            (w) => w.counts[JIRA_ACTIVITY_TYPES.STATUS_CHANGE] || 0
          ),
          borderColor: "rgb(13, 110, 253)",
          borderWidth: 1.5,
          tension: 0.3,
        },
        {
          label: "Closed",
          data: reversed.map((w) => w.counts[JIRA_ACTIVITY_TYPES.CLOSED] || 0),
          borderColor: "rgb(25, 135, 84)",
          borderWidth: 1.5,
          tension: 0.3,
        },
      ],
    };
  }, [weekGroups]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Weekly JIRA Activity",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Activity Count",
        },
      },
      x: {
        display: false,
      },
    },
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <Line options={chartOptions} data={chartData} />
      </Card.Body>
    </Card>
  );
}

// --- Main component ---

function UserProfileJiraActivityTimeline({ jiraActivityData, userEmail }) {
  const jiraBaseUrl = (import.meta.env.VITE_APP_JIRA_URL || "").replace(
    /\/+$/,
    ""
  );

  const [activeTypeFilters, setActiveTypeFilters] = useState(
    new Set(Object.values(JIRA_ACTIVITY_TYPES))
  );

  const allActivities = useMemo(() => {
    const assigned = normalizeAssignedActivities(
      jiraActivityData,
      userEmail,
      jiraBaseUrl
    );
    const commented = normalizeCommentActivities(
      jiraActivityData,
      userEmail,
      jiraBaseUrl
    );
    const statusChanges = normalizeStatusChangeActivities(
      jiraActivityData,
      userEmail,
      jiraBaseUrl
    );
    const closed = normalizeClosedActivities(
      jiraActivityData,
      userEmail,
      jiraBaseUrl
    );
    return [...assigned, ...commented, ...statusChanges, ...closed];
  }, [jiraActivityData, userEmail]);

  const filteredActivities = useMemo(() => {
    return allActivities.filter((a) => activeTypeFilters.has(a.type));
  }, [allActivities, activeTypeFilters]);

  const weekGroups = useMemo(() => {
    return groupActivitiesByWeek(filteredActivities);
  }, [filteredActivities]);

  if (!allActivities.length) {
    return <div className="p-3">No JIRA activity data available.</div>;
  }

  return (
    <>
      <ActivitySummaryBar activities={allActivities} />
      <ActivityFilterBar
        activeTypeFilters={activeTypeFilters}
        onFilterChange={setActiveTypeFilters}
      />
      <Row>
        <Col lg={6}>
          {weekGroups.map((week, index) => (
            <WeekSection
              key={week.weekKey}
              week={week}
              defaultExpanded={index < 4}
            />
          ))}
        </Col>
        <Col lg={6}>
          <ActivityChart weekGroups={weekGroups} />
        </Col>
      </Row>
    </>
  );
}

export default UserProfileJiraActivityTimeline;
