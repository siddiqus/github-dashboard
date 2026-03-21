import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  PolarAreaController,
  RadialLinearScale,
  Title,
  Tooltip,
} from "chart.js";
import _ from "lodash";
import React, { useState, cloneElement } from "react";
import {
  Card,
  Col,
  Modal,
  OverlayTrigger,
  Popover,
  Row,
} from "react-bootstrap";
import { Line, Radar } from "react-chartjs-2";
import {
  daysDifference,
  formatDisplayName,
  getMonthsStringFromIssueList,
} from "../../services/utils";
import { getJiraMonthWiseIssueDataByUsername } from "../../services/jira";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PolarAreaController,
  ArcElement
);

const baseChartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: "top",
    },
    title: {
      display: true,
    },
  },
  options: {
    scales: {
      y: {
        beginAtZero: true,
      },
      x: {
        beginAtZero: true,
      },
    },
  },
};

const colorNames = [
  "red",
  "maroon",
  "cornflowerblue",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "brown",
  "cyan",
  "magenta",
  "lime",
  "teal",
  "indigo",
  "violet",
  "black",
  "white",
  "gray",
  "lightgray",
  "darkgray",
  "olive",
  "navy",
  "aquamarine",
  "beige",
  "bisque",
  "blanchedalmond",
  "burlywood",
  "chartreuse",
  "chocolate",
  "coral",
  "darkcyan",
  "darkgoldenrod",
  "darkgreen",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
];

function getPrCycleTimeChartOptions({ userDataList }) {
  const dates = userDataList
    .map((u) => u.prList.map((p) => new Date(p.created_at)))
    .flat()
    .sort((a, b) => a - b)
    .map((d) => d.toISOString().substr(0, 10));

  const usernames = Array.from(
    new Set(userDataList.map((u) => u.username))
  ).sort();

  const dataPerUser = _.keyBy(userDataList, "username");

  const data = {
    labels: dates,
    datasets: usernames.map((username, index) => {
      const userData = dataPerUser[username];
      const prs = userData.prList;
      const prPerDay = _.groupBy(prs, (pr) =>
        new Date(pr.created_at).toISOString().substring(0, 10)
      );
      return {
        label: formatDisplayName(userData.name, userData.username),
        borderColor: colorNames[index] || "red",
        data: dates.map((d) => {
          const prsForDate = prPerDay[d] || [];
          let avg = 0;
          if (prsForDate.length) {
            avg =
              prsForDate.reduce(
                (sum, pr) =>
                  sum +
                  (pr.closed_at
                    ? daysDifference(pr.created_at, pr.closed_at)
                    : 0),
                0
              ) / prsForDate.length;
          }

          return avg;
        }),
      };
    }),
  };

  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "PR Cycle Time (days)";

  return { chartOptions, data };
}

function getPrReviewChartOptions({ months, userDataList }) {
  const usernames = Array.from(
    new Set(userDataList.map((u) => u.username))
  ).sort();

  const dataPerUser = _.keyBy(userDataList, "username");

  const data = {
    labels: months,
    datasets: usernames.map((username, index) => {
      const userData = dataPerUser[username];
      const reviewsPerMonth = Object.values(userData.reviewCountsPerMonth);
      return {
        label: formatDisplayName(userData.name, userData.username),
        data: reviewsPerMonth,
        borderColor: colorNames[index] || "red",
      };
    }),
  };

  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "PRs Reviewed";

  return { chartOptions, data: data };
}

function getPrClosedChartData({ months, userDataList }) {
  const usernames = Array.from(
    new Set(userDataList.map((u) => u.username))
  ).sort();

  const dataPerUser = _.keyBy(userDataList, "username");

  const data = {
    labels: months,
    datasets: usernames.map((username, index) => {
      const userData = dataPerUser[username];
      const grouped = _.groupBy(
        (userData.prList || [])
          .filter((p) => !!p.closed_at)
          .sort((a, b) => a - b),
        (p) => {
          return new Date(p.closed_at).toISOString().substring(0, 7);
        }
      );

      const statList = [];
      for (const month of months) {
        const prsForMonth = (grouped[month] || []).length;
        statList.push(prsForMonth);
      }

      return {
        label: formatDisplayName(userData.name, userData.username),
        data: statList,
        borderColor: colorNames[index] || "red",
      };
    }),
  };

  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "PRs Closed";

  return { chartOptions, data };
}

function getJiraClosedTicketData({ months, chartData, nameMap }) {
  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "JIRA Issues Closed";

  const usernames = Array.from(
    new Set(chartData.map((u) => u.username))
  ).sort();

  const dataPerUser = _.keyBy(chartData, "username");

  const data = {
    labels: months,
    datasets: usernames.map((username, index) => {
      const data = dataPerUser[username];
      return {
        label: formatDisplayName(nameMap[username], username),
        data: data.monthDataList,
        borderColor: colorNames[index] || "red",
      };
    }),
  };

  return { chartOptions, data };
}

function getCommitStatsOptions(months, userDataList) {
  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "Github Commits";

  const usernames = Array.from(
    new Set(userDataList.map((u) => u.username))
  ).sort();

  const dataPerUser = _.keyBy(userDataList, "username");

  const datasets = [];

  usernames.forEach((username, index) => {
    const data = dataPerUser[username] || {};

    const dataForUser = [];
    for (const month of months) {
      const commitCount = data.commitCountsPerMonth
        ? data.commitCountsPerMonth[month]
        : 0;
      dataForUser.push(commitCount);
    }

    datasets.push({
      label: formatDisplayName(data.name, data.username),
      data: dataForUser,
      borderColor: colorNames[index] || "red",
    });
  });

  const data = {
    labels: months,
    datasets,
  };

  return { chartOptions, data };
}

const getPrCreatedDistributionChartData = (inputList) => {
  if (!inputList) {
    return;
  }

  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "PRs Created";

  const allReposEver = Array.from(
    new Set([...inputList.map((i) => i.allRepos)].flat())
  );

  // Prepare the chart data structure
  const chartData = {
    labels: allReposEver, // Repositories as labels
    datasets: [],
  };

  const usernames = Array.from(
    new Set(inputList.map((u) => u.username))
  ).sort();

  const dataPerUser = _.keyBy(inputList, "username");

  usernames.forEach((username, index) => {
    const input = dataPerUser[username];
    const { prCountsPerRepoPerMonth, allRepos } = input;

    // Initialize an object to hold total counts for each repository
    const totalCounts = {};

    // Loop through each month's data
    for (const monthData of Object.values(prCountsPerRepoPerMonth)) {
      for (const repo of allRepos) {
        // Sum up the pull request counts for each repository
        totalCounts[repo] = (totalCounts[repo] || 0) + (monthData[repo] || 0);
      }
    }

    // Prepare the chart data structure
    const data = {
      label: formatDisplayName(input.name, input.username),
      data: allRepos.map((repo) => totalCounts[repo] || 0), // Total counts for each repo
      borderColor: colorNames[index],
      borderWidth: 2,
    };

    chartData.datasets.push(data);
  });

  return { chartOptions, data: chartData };
};

const getPrReviewedDistributionChartData = (inputList) => {
  if (!inputList) {
    return;
  }

  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "PRs Reviewed";

  const allReposEver = Array.from(
    new Set([...inputList.map((i) => i.allRepos)].flat())
  );

  // Prepare the chart data structure
  const chartData = {
    labels: allReposEver, // Repositories as labels
    datasets: [],
  };

  const usernames = Array.from(
    new Set(inputList.map((u) => u.username))
  ).sort();

  const dataPerUser = _.keyBy(inputList, "username");

  usernames.forEach((username, index) => {
    const input = dataPerUser[username];
    const { prReviewCountsPerRepoPerMonth, allRepos } = input;

    // Initialize an object to hold total counts for each repository
    const totalCounts = {};

    // Loop through each month's data
    for (const monthData of Object.values(prReviewCountsPerRepoPerMonth)) {
      for (const repo of allRepos) {
        // Sum up the pull request counts for each repository
        totalCounts[repo] = (totalCounts[repo] || 0) + (monthData[repo] || 0);
      }
    }

    // Prepare the chart data structure
    const data = {
      label: formatDisplayName(input.name, input.username),
      data: allRepos.map((repo) => totalCounts[repo] || 0), // Total counts for each repo
      borderColor: colorNames[index],
      borderWidth: 2,
    };

    chartData.datasets.push(data);
  });

  return { chartOptions, data: chartData };
};

function getGithubActivityChartOptions(userDataList) {
  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "Github Activity";

  const usernames = Array.from(
    new Set(userDataList.map((u) => u.username))
  ).sort();

  const dataPerUser = _.keyBy(userDataList, "username");

  const datasets = [];

  usernames.forEach((username, index) => {
    const data = dataPerUser[username];

    // Collect all activity dates
    const activities = [];
    (data.prList || []).forEach((pr) => {
      activities.push({ date: pr.created_at });
      if (pr.closed_at) activities.push({ date: pr.closed_at });
    });
    (data.reviewedPrList || []).forEach((pr) => {
      activities.push({ date: pr.created_at });
    });
    (data.commentedPrList || []).forEach((pr) => {
      activities.push({ date: pr.updated_at });
    });
    (data.commitData || []).forEach((commit) => {
      activities.push({ date: commit.commit.author.date });
    });

    // Group by ISO week
    const weekMap = {};
    for (const a of activities) {
      const d = new Date(a.date);
      const thursday = new Date(d);
      thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
      const year = thursday.getFullYear();
      const jan1 = new Date(year, 0, 1);
      const weekNumber = Math.ceil(
        ((thursday - jan1) / 86400000 + jan1.getDay() + 1) / 7
      );
      const weekKey = `${year}-W${String(weekNumber).padStart(2, "0")}`;

      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);

      if (!weekMap[weekKey]) {
        weekMap[weekKey] = { weekKey, mondayDate: monday, count: 0 };
      }
      weekMap[weekKey].count++;
    }

    const weeks = Object.values(weekMap).sort(
      (a, b) => a.mondayDate - b.mondayDate
    );

    datasets.push({
      label: formatDisplayName(data.name, data.username),
      data: weeks.map((w) => w.count),
      borderColor: colorNames[index] || "red",
    });

    // Store week labels on first user (they share the same time range)
    if (index === 0) {
      chartOptions._weekLabels = weeks.map((w) => w.weekKey);
    }
  });

  const labels = chartOptions._weekLabels || [];
  delete chartOptions._weekLabels;

  // Hide x-axis labels to avoid clutter
  chartOptions.scales = {
    y: { beginAtZero: true },
    x: { display: false },
  };

  return { chartOptions, data: { labels, datasets } };
}

function getJiraActivityChartOptions(jiraData, userDataList) {
  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "JIRA Activity";

  const usernames = Array.from(
    new Set(userDataList.map((u) => u.username))
  ).sort();

  const datasets = [];

  const dataPerUser = _.keyBy(userDataList, "username");

  usernames.forEach((username, index) => {
    const userIssues = (jiraData || []).filter((j) => j.username === username);

    const activities = [];
    userIssues.forEach((issue) => {
      activities.push({ date: issue.createdAt });
      if (issue.resolvedAt) activities.push({ date: issue.resolvedAt });
    });

    const weekMap = {};
    for (const a of activities) {
      const d = new Date(a.date);
      const thursday = new Date(d);
      thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
      const year = thursday.getFullYear();
      const jan1 = new Date(year, 0, 1);
      const weekNumber = Math.ceil(
        ((thursday - jan1) / 86400000 + jan1.getDay() + 1) / 7
      );
      const weekKey = `${year}-W${String(weekNumber).padStart(2, "0")}`;

      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);

      if (!weekMap[weekKey]) {
        weekMap[weekKey] = { weekKey, mondayDate: monday, count: 0 };
      }
      weekMap[weekKey].count++;
    }

    const weeks = Object.values(weekMap).sort(
      (a, b) => a.mondayDate - b.mondayDate
    );

    const userData = dataPerUser[username];
    datasets.push({
      label: formatDisplayName(userData?.name, username),
      data: weeks.map((w) => w.count),
      borderColor: colorNames[index] || "red",
    });

    if (index === 0) {
      chartOptions._weekLabels = weeks.map((w) => w.weekKey);
    }
  });

  const labels = chartOptions._weekLabels || [];
  delete chartOptions._weekLabels;

  chartOptions.scales = {
    y: { beginAtZero: true },
    x: { display: false },
  };

  return { chartOptions, data: { labels, datasets } };
}

function padMonthDataForJira(months, data) {
  if (!data || !data.chartData) {
    return [];
  }
  const allMonths = [...months]; // Create a copy to avoid modifying the original array

  return data.chartData.map((item) => {
    const paddedMonthDataList = allMonths.map((month) => {
      // Check if the current month exists in the original monthDataList
      const monthIndex = data.months.indexOf(month);

      // If the month exists, use its value; otherwise, pad with 0
      return monthIndex !== -1 ? item.monthDataList[monthIndex] : 0;
    });

    return {
      ...item,
      monthDataList: paddedMonthDataList,
    };
  });
}

function getGithubAddDeleteChartOptions(months, userDataList) {
  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "Github Additions";

  const usernames = Array.from(
    new Set(userDataList.map((u) => u.username))
  ).sort();

  const dataPerUser = _.keyBy(userDataList, "username");

  const addDataSets = [];
  const deleteDataSets = [];

  usernames.forEach((username, index) => {
    const data = dataPerUser[username];

    const addDataForUser = [];
    const deleteDataForUser = [];
    for (const month of months) {
      const count = data.prAdditionsDeletionsByMonth[month] || 0;
      addDataForUser.push(count.additions);
      deleteDataForUser.push(count.deletions);
    }

    addDataSets.push({
      label: formatDisplayName(data.name, data.username),
      data: addDataForUser,
      borderColor: colorNames[index] || "red",
    });
    deleteDataSets.push({
      label: formatDisplayName(data.name, data.username),
      data: deleteDataForUser,
      borderColor: colorNames[index] || "red",
    });
  });

  const addData = {
    data: {
      labels: months,
      datasets: addDataSets,
    },
    chartOptions: {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        title: {
          ...chartOptions.plugins.title,
          text: "Github Additions",
        },
      },
    },
  };
  const deleteData = {
    data: {
      labels: months,
      datasets: deleteDataSets,
    },
    chartOptions: {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        title: {
          ...chartOptions.plugins.title,
          text: "Github Deletions",
        },
      },
    },
  };

  return { addData, deleteData };
}

// Reusable expandable chart card
function ExpandableChartCard({
  title,
  description,
  children,
  style,
  collapsedHeight = 200,
  modalBodyHeight = "80vh",
}) {
  const [open, setOpen] = useState(false);
  const child = React.Children.only(children);
  const collapsedChild = cloneElement(child, { height: collapsedHeight });
  const expandedChild = cloneElement(child, { height: undefined });

  const infoPopover = description ? (
    <Popover>
      <Popover.Body style={{ fontSize: "13px" }}>{description}</Popover.Body>
    </Popover>
  ) : null;

  return (
    <>
      <Card style={{ ...style, alignContent: "center", textAlign: "center" }}>
        {description && (
          <OverlayTrigger
            trigger={["hover", "focus"]}
            placement="right"
            overlay={infoPopover}
          >
            <div
              style={{
                cursor: "help",
                position: "absolute",
                left: "12px",
                top: "8px",
                zIndex: 1,
                fontSize: "14px",
                color: "#6c757d",
              }}
            >
              &#9432;
            </div>
          </OverlayTrigger>
        )}
        <div
          style={{
            cursor: "pointer",
            position: "absolute",
            right: "12px",
          }}
          onClick={() => setOpen(true)}
          title="Click to enlarge"
        >
          ⛶
        </div>
        {collapsedChild}
      </Card>
      <Modal show={open} onHide={() => setOpen(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ height: modalBodyHeight }}>
          {expandedChild}
        </Modal.Body>
      </Modal>
    </>
  );
}

function UserPrChart({ userDataList, jiraData, jiraIsLoading }) {
  const months = Array.from(
    new Set(
      userDataList.map((u) => getMonthsStringFromIssueList(u.prList)).flat()
    )
  );

  if (!months.length) {
    return <h5>NO DATA FOUND</h5>;
  }

  months.sort((a, b) => a.localeCompare(b));

  const chartStyle = { padding: "10px 15px", marginBottom: "1em" };

  const prClosedChartOptions = getPrClosedChartData({
    months,
    userDataList,
  });
  const prClosedChart = (
    <ExpandableChartCard
      title="PRs Closed"
      description="Number of pull requests closed or merged per month, grouped by user."
      style={chartStyle}
    >
      <Line
        options={prClosedChartOptions.chartOptions}
        data={prClosedChartOptions.data}
      />
    </ExpandableChartCard>
  );

  const prCycleTimeChartOptions = getPrCycleTimeChartOptions({
    userDataList,
  });
  const cycleTimeChart = (
    <ExpandableChartCard
      title="PR Cycle Time (days)"
      description="Average number of days from PR creation to close, plotted per PR creation date. Lower values indicate faster review and merge cycles."
      style={chartStyle}
    >
      <Line
        options={prCycleTimeChartOptions.chartOptions}
        data={prCycleTimeChartOptions.data}
      />
    </ExpandableChartCard>
  );

  const jiraChartData = getJiraMonthWiseIssueDataByUsername(
    userDataList.map((u) => u.username),
    jiraData
  );
  const nameMap = Object.fromEntries(
    userDataList.map((u) => [u.username, u.name])
  );
  const jiraClosedTicketOptions = getJiraClosedTicketData({
    months,
    chartData: padMonthDataForJira(months, jiraChartData) || [],
    nameMap,
  });
  const jiraIssuesChart = jiraIsLoading ? (
    <Card style={chartStyle}>JIRA Data Loading...</Card>
  ) : (
    <ExpandableChartCard
      title="JIRA Issues Closed"
      description="Number of JIRA issues resolved per month, grouped by user."
      style={chartStyle}
    >
      <Line
        options={jiraClosedTicketOptions.chartOptions}
        data={jiraClosedTicketOptions.data}
      />
    </ExpandableChartCard>
  );

  const prCreatedDistributionChartOptions =
    getPrCreatedDistributionChartData(userDataList);
  const prCreatedDistributionChart = (
    <ExpandableChartCard
      title="PRs Created Distribution"
      description="Distribution of PRs created across repositories. Shows which repos each user contributes to most."
      style={chartStyle}
    >
      <Radar
        options={prCreatedDistributionChartOptions.chartOptions}
        data={prCreatedDistributionChartOptions.data}
      />
    </ExpandableChartCard>
  );

  const prReviewDistributionChartOptions =
    getPrReviewedDistributionChartData(userDataList);
  const prReviewedDistributionChart = (
    <ExpandableChartCard
      title="PRs Reviewed Distribution"
      description="Distribution of PR reviews across repositories. Shows which repos each user reviews most."
      style={chartStyle}
    >
      <Radar
        options={prReviewDistributionChartOptions.chartOptions}
        data={prReviewDistributionChartOptions.data}
      />
    </ExpandableChartCard>
  );

  const commitStatsChartOptions = getCommitStatsOptions(months, userDataList);
  const commitStatsChart = (
    <ExpandableChartCard
      title="Github Commits"
      description="Total number of commits per month across all repositories in the organization."
      style={chartStyle}
    >
      <Line
        options={commitStatsChartOptions.chartOptions}
        data={commitStatsChartOptions.data}
      />
    </ExpandableChartCard>
  );

  const githubAddDeleteChartOptions = getGithubAddDeleteChartOptions(
    months,
    userDataList
  );
  const githubAdditionsChart = (
    <ExpandableChartCard
      title="Github Additions"
      description="Total lines of code added per month across all PRs."
      style={chartStyle}
    >
      <Line
        options={githubAddDeleteChartOptions.addData.chartOptions}
        data={githubAddDeleteChartOptions.addData.data}
      />
    </ExpandableChartCard>
  );

  const githubDeletionsChart = (
    <ExpandableChartCard
      title="Github Deletions"
      description="Total lines of code deleted per month across all PRs."
      style={chartStyle}
    >
      <Line
        options={githubAddDeleteChartOptions.deleteData.chartOptions}
        data={githubAddDeleteChartOptions.deleteData.data}
      />
    </ExpandableChartCard>
  );

  const jiraActivityChartOptions = getJiraActivityChartOptions(
    jiraData,
    userDataList
  );
  const jiraActivityChart = jiraIsLoading ? (
    <Card style={chartStyle}>JIRA Data Loading...</Card>
  ) : (
    <ExpandableChartCard
      title="JIRA Activity"
      description="Weekly JIRA activity including issue creation and resolution events."
      style={chartStyle}
    >
      <Line
        options={jiraActivityChartOptions.chartOptions}
        data={jiraActivityChartOptions.data}
      />
    </ExpandableChartCard>
  );

  const githubActivityChartOptions =
    getGithubActivityChartOptions(userDataList);
  const githubActivityChart = (
    <ExpandableChartCard
      title="Github Activity"
      description="Total weekly GitHub activity including PRs opened, merged, reviewed, commented on, and commits."
      style={chartStyle}
    >
      <Line
        options={githubActivityChartOptions.chartOptions}
        data={githubActivityChartOptions.data}
      />
    </ExpandableChartCard>
  );

  return (
    <div>
      <Row>
        <Col lg={6}>
          {githubActivityChart}
          {prClosedChart}
          {jiraIssuesChart}
          {cycleTimeChart}
          {prCreatedDistributionChart}
        </Col>
        <Col lg={6}>
          {jiraActivityChart}
          {commitStatsChart}
          {githubAdditionsChart}
          {githubDeletionsChart}
          {prReviewedDistributionChart}
        </Col>
      </Row>
    </div>
  );
}

export default UserPrChart;
