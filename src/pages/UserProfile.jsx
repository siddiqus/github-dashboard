import { useEffect, useState } from "react";
import { Tab, Table, Tabs, Container } from "react-bootstrap";
import GitHubCalendar from "react-github-calendar";
import { useParams } from "react-router-dom";
import UserPrChart from "../components/UserPRChart/UserPrChart";
import UserProfilePrList from "../components/UserProfilePrList/UserProfilePrList";
import { getMonthsStringFromIssueList } from "../services/utils";
import db from "../services/idb";
import UserProfileJiraList from "../components/UserProfileJiraList";

function UserProfile() {
  const { username } = useParams();

  const [userData, setUserData] = useState(null);
  const [jiraData, setJiraData] = useState(null);

  useEffect(() => {
    async function setDefaults() {
      const userDataList = await db.getData("opti-gh-data");
      const jiraData = await db.getData("opti-jira-data");

      const userJiraData = (jiraData || []).filter(
        (j) => j.username === username
      );
      setJiraData(userJiraData);

      const userData = (userDataList || []).find(
        (u) => u.username === username
      );
      setUserData(userData);
    }

    setDefaults();
  }, []);

  const localStorageStartDate = localStorage.getItem("opti-gh-startDate");
  const localStorageEndDate = localStorage.getItem("opti-gh-endDate");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
        </tbody>
      </Table>
    );
  }

  function JiraList({ jiraData }) {
    return (
      <div className="table-responsive">
        <Table bordered hover responsive>
          <thead>
            <tr>
              <th>Issue Type</th>
              <th>Issue Key</th>
              <th>Description</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Resolved At</th>
              <th>Story Points</th>
            </tr>
          </thead>
          <tbody>
            {jiraData.map((jira, index) => {
              return (
                <tr key={index}>
                  <td>{jira.issueType}</td>
                  <td>{jira.issueKey}</td>
                  <td>{jira.description}</td>
                  <td>{jira.status}</td>
                  <td>{jira.createdAt}</td>
                  <td>{jira.resolvedAt || "-"}</td>
                  <td>{jira.storyPoints}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
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

      <Tabs
        defaultActiveKey="prStats"
        id="user-profile-stats-tabs"
        className="mb-3"
      >
        <Tab eventKey="prStats" title="PR Stats">
          <GitHubCalendar username={username} colorScheme="light" />
          <hr />
          <UserPrChart
            jiraData={jiraData}
            userDataList={userData ? [userData] : []}
          ></UserPrChart>
          <PrStats />
        </Tab>
        <Tab eventKey="prList" title="PR List">
          <UserProfilePrList userData={userData} />
        </Tab>
        <Tab eventKey="jiraList" title="JIRA Tickets">
          <UserProfileJiraList jiraData={jiraData || []} />
          {/* <div style={{ width: "100%", overflowX: "auto" }}>
            <JiraList jiraData={jiraData || []} />
          </div> */}
        </Tab>
      </Tabs>
      <br />
    </>
  );
}

export default UserProfile;
