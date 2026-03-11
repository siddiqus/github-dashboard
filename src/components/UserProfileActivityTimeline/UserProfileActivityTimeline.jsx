import { useMemo, useState } from "react";
import {
  Badge,
  Card,
  Col,
  Dropdown,
  InputGroup,
  Row,
  Table,
} from "react-bootstrap";
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

const ACTIVITY_TYPES = {
  PR_OPENED: "pr_opened",
  PR_MERGED: "pr_merged",
  PR_REVIEW: "pr_review",
  PR_COMMENT: "pr_comment",
  COMMIT: "commit",
};

const ACTIVITY_TYPE_CONFIG = {
  [ACTIVITY_TYPES.PR_OPENED]: {
    label: "PR Opened",
    icon: "🟢",
    badgeColor: "success",
  },
  [ACTIVITY_TYPES.PR_MERGED]: {
    label: "PR Merged",
    icon: "🟣",
    badgeColor: "info",
  },
  [ACTIVITY_TYPES.PR_REVIEW]: {
    label: "PR Review",
    icon: "🔵",
    badgeColor: "primary",
  },
  [ACTIVITY_TYPES.PR_COMMENT]: {
    label: "PR Comment",
    icon: "💬",
    badgeColor: "warning",
  },
  [ACTIVITY_TYPES.COMMIT]: {
    label: "Commit",
    icon: "🔶",
    badgeColor: "secondary",
  },
};

// --- Normalization functions ---

function normalizePrOpenedActivities(prList) {
  return (prList || []).map((pr) => ({
    id: `pr-opened-${pr.number}-${pr.repository_url}`,
    type: ACTIVITY_TYPES.PR_OPENED,
    date: pr.created_at,
    title: pr.title,
    repo: pr.repository_url.split("/").pop(),
    url: pr.html_url,
    metadata: { number: pr.number },
  }));
}

function normalizePrMergedActivities(prList) {
  return (prList || [])
    .filter((pr) => !!pr.closed_at)
    .map((pr) => ({
      id: `pr-merged-${pr.number}-${pr.repository_url}`,
      type: ACTIVITY_TYPES.PR_MERGED,
      date: pr.closed_at,
      title: pr.title,
      repo: pr.repository_url.split("/").pop(),
      url: pr.html_url,
      metadata: { number: pr.number },
    }));
}

function normalizePrReviewActivities(reviewedPrList) {
  return (reviewedPrList || []).map((pr) => ({
    id: `pr-review-${pr.number}-${pr.repository_url}`,
    type: ACTIVITY_TYPES.PR_REVIEW,
    date: pr.created_at,
    title: pr.title,
    repo: pr.repository_url.split("/").pop(),
    url: pr.html_url,
    metadata: { number: pr.number },
  }));
}

function normalizePrCommentActivities(commentedPrList) {
  return (commentedPrList || []).map((pr) => ({
    id: `pr-comment-${pr.number}-${pr.repository_url}`,
    type: ACTIVITY_TYPES.PR_COMMENT,
    date: pr.updated_at,
    title: pr.title,
    repo: pr.repository_url.split("/").pop(),
    url: pr.html_url,
    metadata: { number: pr.number },
  }));
}

function normalizeCommitActivities(commitData) {
  return (commitData || []).map((commit) => ({
    id: `commit-${commit.sha}`,
    type: ACTIVITY_TYPES.COMMIT,
    date: commit.commit.author.date,
    title: commit.commit.message.split("\n")[0],
    repo: commit.repository.name,
    url: commit.html_url,
    metadata: { sha: commit.sha.substring(0, 7) },
  }));
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
    weekLabel: `${formatShortDate(monday)} - ${formatShortDate(sunday)}`,
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
    for (const type of Object.values(ACTIVITY_TYPES)) {
      week.counts[type] = week.activities.filter((a) => a.type === type).length;
    }
  }

  return Object.values(weekMap).sort((a, b) => b.mondayDate - a.mondayDate);
}

// --- Sub-components ---

function ActivitySummaryBar({ activities }) {
  const counts = useMemo(() => {
    const c = {};
    for (const type of Object.values(ACTIVITY_TYPES)) {
      c[type] = activities.filter((a) => a.type === type).length;
    }
    return c;
  }, [activities]);

  return (
    <Card className="mb-3">
      <Card.Body className="d-flex gap-3 flex-wrap align-items-center">
        {Object.entries(ACTIVITY_TYPE_CONFIG).map(([type, config]) => (
          <div key={type} className="d-flex align-items-center gap-1">
            <Badge bg={config.badgeColor}>
              {config.icon} {config.label}
            </Badge>
            <span className="fw-bold">{counts[type] || 0}</span>
          </div>
        ))}
        <div className="ms-auto fw-bold">Total: {activities.length}</div>
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
      <div style={{ fontWeight: "600" }}>
        Showing {activeTypeFilters.size} of{" "}
        {Object.keys(ACTIVITY_TYPE_CONFIG).length} activity types
      </div>
      <InputGroup style={{ width: "auto" }}>
        <Dropdown autoClose="outside">
          <Dropdown.Toggle variant="light">
            Filter Activity Type
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {Object.entries(ACTIVITY_TYPE_CONFIG).map(([type, config]) => (
              <Dropdown.Item
                key={type}
                onClick={() => toggleFilter(type)}
                active={activeTypeFilters.has(type)}
              >
                {config.icon} {config.label}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </InputGroup>
    </div>
  );
}

function ActivityRow({ activity }) {
  const config = ACTIVITY_TYPE_CONFIG[activity.type];

  return (
    <tr>
      <td style={{ width: "130px", verticalAlign: "middle" }}>
        <Badge bg={config.badgeColor} style={{ fontSize: "11px" }}>
          {config.icon} {config.label}
        </Badge>
      </td>
      <td style={{ width: "90px", verticalAlign: "middle" }}>
        {new Date(activity.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </td>
      <td
        style={{ width: "120px", verticalAlign: "middle" }}
        className="text-muted"
      >
        {activity.repo}
      </td>
      <td style={{ verticalAlign: "middle" }}>
        <a href={activity.url} target="_blank" rel="noopener noreferrer">
          {activity.type === ACTIVITY_TYPES.COMMIT
            ? `${activity.metadata.sha} - ${activity.title}`
            : `#${activity.metadata.number} ${activity.title}`}
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
        style={{ cursor: "pointer" }}
        className="d-flex justify-content-between align-items-center"
      >
        <span className="fw-bold">{week.weekLabel}</span>
        <div className="d-flex gap-2">
          {Object.entries(ACTIVITY_TYPE_CONFIG).map(([type, config]) => {
            const count = week.counts[type] || 0;
            if (count === 0) return null;
            return (
              <Badge key={type} bg={config.badgeColor} pill>
                {config.icon} {count}
              </Badge>
            );
          })}
          <Badge bg="dark" pill>
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
          label: "PRs Opened",
          data: reversed.map((w) => w.counts[ACTIVITY_TYPES.PR_OPENED] || 0),
          borderColor: "rgb(25, 135, 84)",
          borderWidth: 1.5,
          tension: 0.3,
        },
        {
          label: "PRs Merged",
          data: reversed.map((w) => w.counts[ACTIVITY_TYPES.PR_MERGED] || 0),
          borderColor: "rgb(13, 202, 240)",
          borderWidth: 1.5,
          tension: 0.3,
        },
        {
          label: "Reviews",
          data: reversed.map((w) => w.counts[ACTIVITY_TYPES.PR_REVIEW] || 0),
          borderColor: "rgb(13, 110, 253)",
          borderWidth: 1.5,
          tension: 0.3,
        },
        {
          label: "Comments",
          data: reversed.map((w) => w.counts[ACTIVITY_TYPES.PR_COMMENT] || 0),
          borderColor: "rgb(255, 193, 7)",
          borderWidth: 1.5,
          tension: 0.3,
        },
        {
          label: "Commits",
          data: reversed.map((w) => w.counts[ACTIVITY_TYPES.COMMIT] || 0),
          borderColor: "rgb(108, 117, 125)",
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
        text: "Weekly Activity",
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

function UserProfileActivityTimeline({ userData }) {
  const [activeTypeFilters, setActiveTypeFilters] = useState(
    new Set(Object.values(ACTIVITY_TYPES))
  );

  const allActivities = useMemo(() => {
    const prsOpened = normalizePrOpenedActivities(userData.prList);
    const prsMerged = normalizePrMergedActivities(userData.prList);
    const reviews = normalizePrReviewActivities(userData.reviewedPrList);
    const comments = normalizePrCommentActivities(userData.commentedPrList);
    const commits = normalizeCommitActivities(userData.commitData);
    return [...prsOpened, ...prsMerged, ...reviews, ...comments, ...commits];
  }, [userData]);

  const filteredActivities = useMemo(() => {
    return allActivities.filter((a) => activeTypeFilters.has(a.type));
  }, [allActivities, activeTypeFilters]);

  const weekGroups = useMemo(() => {
    return groupActivitiesByWeek(filteredActivities);
  }, [filteredActivities]);

  if (!allActivities.length) {
    return <div className="p-3">No activity data available.</div>;
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

export default UserProfileActivityTimeline;
