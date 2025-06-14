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
import { Card, Col, Row } from "react-bootstrap";
import { Line, Radar } from "react-chartjs-2";
import {
  daysDifference,
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
        label: userData.username,
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
        label: userData.username,
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
        label: userData.username,
        data: statList,
        borderColor: colorNames[index] || "red",
      };
    }),
  };

  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "PRs Closed";

  return { chartOptions, data };
}

function getJiraClosedTicketData({ months, chartData }) {
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
        label: data.username,
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
    const data = dataPerUser[username];

    const dataForUser = [];
    for (const month of months) {
      const commitCount = data.commitCountsPerMonth[month] || 0;
      dataForUser.push(commitCount);
    }

    datasets.push({
      label: data.username,
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
      label: input.username,
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
      label: input.username,
      data: allRepos.map((repo) => totalCounts[repo] || 0), // Total counts for each repo
      borderColor: colorNames[index],
      borderWidth: 2,
    };

    chartData.datasets.push(data);
  });

  return { chartOptions, data: chartData };
};

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
      label: data.username,
      data: addDataForUser,
      borderColor: colorNames[index] || "red",
    });
    deleteDataSets.push({
      label: data.username,
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
    <Card style={chartStyle}>
      <Line
        height={"200px"}
        options={prClosedChartOptions.chartOptions}
        data={prClosedChartOptions.data}
      />
    </Card>
  );

  const prReviewChartOptions = getPrReviewChartOptions({
    months,
    userDataList,
  });
  const prReviewedChart = (
    <Card style={chartStyle}>
      <Line
        height={"200px"}
        options={prReviewChartOptions.chartOptions}
        data={prReviewChartOptions.data}
      />
    </Card>
  );

  const prCycleTimeChartOptions = getPrCycleTimeChartOptions({
    userDataList,
  });
  const cycleTimeChart = (
    <Card style={chartStyle}>
      <Line
        height={"200px"}
        options={prCycleTimeChartOptions.chartOptions}
        data={prCycleTimeChartOptions.data}
      />
    </Card>
  );

  const jiraChartData = getJiraMonthWiseIssueDataByUsername(
    userDataList.map((u) => u.username),
    jiraData
  );
  const jiraClosedTicketOptions = getJiraClosedTicketData({
    months,
    chartData: padMonthDataForJira(months, jiraChartData) || [],
  });
  const jiraIssuesChart = (
    <Card style={chartStyle}>
      {jiraIsLoading ? (
        "JIRA Data Loading..."
      ) : (
        <Line
          height={"200px"}
          options={jiraClosedTicketOptions.chartOptions}
          data={jiraClosedTicketOptions.data}
        />
      )}
    </Card>
  );

  const prCreatedDistributionChartOptions =
    getPrCreatedDistributionChartData(userDataList);
  const prCreatedDistributionChart = (
    <Card style={chartStyle}>
      <Radar
        options={prCreatedDistributionChartOptions.chartOptions}
        data={prCreatedDistributionChartOptions.data}
      />
    </Card>
  );

  const prReviewDistributionChartOptions =
    getPrReviewedDistributionChartData(userDataList);
  const prReviewedDistributionChart = (
    <Card style={chartStyle}>
      <Radar
        options={prReviewDistributionChartOptions.chartOptions}
        data={prReviewDistributionChartOptions.data}
      />
    </Card>
  );

  const commitStatsChartOptions = getCommitStatsOptions(months, userDataList);
  const commitStatsChart = (
    <Card style={chartStyle}>
      <Line
        height={"200px"}
        options={commitStatsChartOptions.chartOptions}
        data={commitStatsChartOptions.data}
      />
    </Card>
  );

  const githubAddDeleteChartOptions = getGithubAddDeleteChartOptions(
    months,
    userDataList
  );
  const githubAdditionsChart = (
    <Card style={chartStyle}>
      <Line
        height={"200px"}
        options={githubAddDeleteChartOptions.addData.chartOptions}
        data={githubAddDeleteChartOptions.addData.data}
      />
    </Card>
  );
  // const githubDeletionsChart = (
  //   <Card style={chartStyle}>
  //     <Line
  //       height={"200px"}
  //       options={githubAddDeleteChartOptions.deleteData.chartOptions}
  //       data={githubAddDeleteChartOptions.deleteData.data}
  //     />
  //   </Card>
  // );

  return (
    <div>
      <Row>
        <Col lg={4}>
          {prClosedChart}
          {jiraIssuesChart}
        </Col>
        <Col lg={4}>
          {prReviewedChart}
          {commitStatsChart}
        </Col>
        <Col lg={4}>
          {githubAdditionsChart}
          {/* {githubDeletionsChart} */}
          {cycleTimeChart}
        </Col>
      </Row>
      <Row>
        <Col lg={6}>{prCreatedDistributionChart}</Col>
        <Col lg={6}>{prReviewedDistributionChart}</Col>
      </Row>
    </div>
  );
}

export default UserPrChart;
