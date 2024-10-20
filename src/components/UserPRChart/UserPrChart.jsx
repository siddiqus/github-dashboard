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
import _ from "lodash";
import { Card, Col, Row } from "react-bootstrap";
import { Line } from "react-chartjs-2";
import {
  daysDifference,
  getMonthsStringFromIssueList,
} from "../../services/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const baseChartOptions = {
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

  const data = {
    labels: dates,
    datasets: userDataList.map((userData, index) => {
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
  const data = {
    labels: months,
    datasets: userDataList.map((userData, index) => {
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

function getPrCreatedChartData({ months, userDataList }) {
  const data = {
    labels: months,
    datasets: userDataList.map((userData, index) => {
      return {
        label: userData.username,
        data: userData.statList.map((s) => s.prCount),
        borderColor: colorNames[index] || "red",
      };
    }),
  };

  const chartOptions = JSON.parse(JSON.stringify(baseChartOptions));
  chartOptions.plugins.title.text = "PRs Raised";

  return { chartOptions, data };
}

function getPrClosedChartData({ months, userDataList }) {
  const data = {
    labels: months,
    datasets: userDataList.map((userData, index) => {
      const grouped = _.groupBy(
        userData.prList.filter((p) => !!p.closed_at).sort((a, b) => a - b),
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

function UserPrChart({ userDataList }) {
  const months = Array.from(
    new Set(
      userDataList.map((u) => getMonthsStringFromIssueList(u.prList)).flat()
    )
  );

  if (!months.length) {
    return <h5>NO DATA FOUND</h5>;
  }

  months.sort((a, b) => a.localeCompare(b));

  const prChartData = getPrCreatedChartData({
    months,
    userDataList,
  });

  const prReviewChartOptions = getPrReviewChartOptions({
    months,
    userDataList,
  });

  const prCycleTimeChartOptions = getPrCycleTimeChartOptions({
    userDataList,
  });

  const prClosedChartOptions = getPrClosedChartData({
    months,
    userDataList,
  });

  return (
    <div>
      <Row>
        <Col>
          <Card
            style={{ height: "400px", padding: "1em", marginBottom: "1em" }}
          >
            <Line options={prChartData.chartOptions} data={prChartData.data} />
          </Card>
        </Col>
        <Col>
          <Card
            style={{ height: "400px", padding: "1em", marginBottom: "1em" }}
          >
            <Line
              options={prClosedChartOptions.chartOptions}
              data={prClosedChartOptions.data}
            />
          </Card>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card
            style={{ height: "400px", padding: "1em", marginBottom: "1em" }}
          >
            <Line
              options={prReviewChartOptions.chartOptions}
              data={prReviewChartOptions.data}
            />
          </Card>
        </Col>
        <Col>
          <Card
            style={{ height: "400px", padding: "1em", marginBottom: "1em" }}
          >
            <Line
              options={prCycleTimeChartOptions.chartOptions}
              data={prCycleTimeChartOptions.data}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default UserPrChart;
