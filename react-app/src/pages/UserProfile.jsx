import { useEffect, useState } from "react";
import { Tab, Table, Tabs } from "react-bootstrap";
import DataTable from "react-data-table-component";
import GitHubCalendar from "react-github-calendar";
import { useParams } from "react-router-dom";
import { getPr } from "../services/call-api";
import {
  daysDifference,
  getMonthsStringFromIssueList,
} from "../services/utils";
import UserPrChart from "../components/UserPRChart/UserPrChart";

function UserProfile() {
  const { username } = useParams();

  const [loadingStatus, setLoadingStatus] = useState("");

  const [userData, setUserData] = useState(null);
  const [prList, setPrList] = useState([]);

  const [error, setError] = useState(null);

  const localStorageStartDate = localStorage.getItem("opti-gh-startDate");
  const localStorageEndDate = localStorage.getItem("opti-gh-endDate");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    async function getData() {
      try {
        setLoadingStatus("loading");
        const userDataList = JSON.parse(localStorage.getItem("opti-gh-data"));
        const userData = (userDataList || []).find(
          (u) => u.username === username
        );

        setUserData(userData);

        const prList = userData.prList.map((p) => {
          const url = p.html_url;
          const [_, ownerRepoPullNumber] = url.split("github.com/");
          const [owner, repo] = ownerRepoPullNumber.split("/");
          return {
            pullNumber: p.number,
            owner,
            repo,
          };
        });
        prList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const userPrs = await getPr(prList);
        setPrList(userPrs);
        setLoadingStatus("loaded");
      } catch (error) {
        setError(error);
        setLoadingStatus("loaded");
      }
    }

    getData();
  }, []);

  function PrList({ prList }) {
    prList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const tableColumns = [
      {
        name: "URL",
        selector: (row) => (
          <a href={row.html_url} target="_blank">
            {row.html_url}
          </a>
        ),
        width: "350px",
      },
      {
        name: "Created",
        selector: (row) => new Date(row.created_at),
        format: (row) => new Date(row.created_at).toDateString(),
        sortable: true,
        width: "150px",
      },
      {
        name: "Merged / Closed",
        selector: (row) => {
          if (row.closed_at) {
            return `${new Date(row.closed_at).toDateString()} (Merged)`;
          }

          if (row.closed_at) {
            return `${new Date(row.closed_at).toDateString()} (Closed)`;
          }

          return "Open";
        },
        width: "150px",
      },
      {
        name: `Cycle (in Days)`,
        selector: (row) =>
          daysDifference(row.created_at, row.closed_at || new Date()),
        width: "100px",
        sortable: true,
      },
      {
        name: "Commits",
        selector: (row) => row.commits,
        sortable: true,
      },
      {
        name: "Comments",
        selector: (row) => row.comments,
        sortable: true,
      },
      {
        name: "Additions",
        selector: (row) => row.additions,
        sortable: true,
      },
      {
        name: "Deletions",
        selector: (row) => row.deletions,
        sortable: true,
      },
      {
        name: "Changed Files",
        selector: (row) => row.changed_files,
        sortable: true,
      },
    ];

    tableColumns.forEach((t) => {
      t.wrap = true;
    });

    return prList.length ? (
      <DataTable
        fixedHeaderScrollHeight="500px"
        highlightOnHover
        columns={tableColumns}
        data={prList}
        fixedHeader
      />
    ) : (
      <>N/A</>
    );
  }

  function PrStats() {
    if (!userData) {
      return null;
    }

    const allRepos = userData.allRepos.sort(); // default asc

    const months = getMonthsStringFromIssueList(userData.prList);

    return (
      <Table bordered hover>
        <thead>
          <tr>
            <th></th>
            {months.map((month, index) => (
              <th key={index} index={`month-${index}`}>
                {month}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total PR Count ({userData.totalPrCounts})</td>
            {months.map((month, index) => {
              const monthData = userData.statList.find(
                (s) => s.month === month
              );

              return <td key={index}>{monthData?.prCount || 0}</td>;
            })}
          </tr>

          {allRepos.map((repo, index) => {
            const countForRepo = Object.keys(
              userData.prCountsPerRepoPerMonth
            ).reduce((sum, month) => {
              const counts = userData.prCountsPerRepoPerMonth[month][repo] || 0;
              return sum + counts;
            }, 0);
            return (
              <tr key={index}>
                <td>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{repo} (
                  {countForRepo})
                </td>
                {months.map((month, index) => {
                  const countPerRepo = userData.prCountsPerRepoPerMonth[month]
                    ? userData.prCountsPerRepoPerMonth[month][repo] || 0
                    : 0;
                  return <td key={index}>{countPerRepo}</td>;
                })}
              </tr>
            );
          })}

          <tr>
            <td>PR Reviews</td>
            {Object.keys(userData.reviewCountsPerMonth).map((month, index) => {
              return (
                <td key={index}>{userData.reviewCountsPerMonth[month]}</td>
              );
            })}
          </tr>

          <tr>
            <td>Avg. PR Cycle Time (days)</td>
            {Object.keys(userData.averagePrCycleTimePerMonth).map(
              (month, index) => {
                return (
                  <td key={index}>
                    {userData.averagePrCycleTimePerMonth[month]}
                  </td>
                );
              }
            )}
          </tr>
        </tbody>
      </Table>
    );
  }

  return (
    <>
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <h4>
          {userData?.name} ({username})
        </h4>
        <div>
          {localStorageStartDate &&
            localStorageEndDate &&
            `${new Date(localStorageStartDate).toDateString()} to ${new Date(
              localStorageEndDate
            ).toDateString()}`}
        </div>
      </div>

      <div>
        <GitHubCalendar username={username} colorScheme="light" />
      </div>

      <hr />
      {loadingStatus && loadingStatus === "loading" && <h5>Loading...</h5>}
      {error && <h5>Error: {error.message}</h5>}

      <Tabs
        defaultActiveKey="prStats"
        id="user-profile-stats-tabs"
        className="mb-3"
      >
        <Tab eventKey="prStats" title="PR Stats">
          <UserPrChart userDataList={userData ? [userData] : []}></UserPrChart>
          <PrStats />
        </Tab>
        <Tab eventKey="prList" title="PR List">
          <PrList prList={prList} />
        </Tab>
      </Tabs>
      <br />
    </>
  );
}

export default UserProfile;
