import { useEffect, useState } from "react";
import { Tab, Table, Tabs, Container } from "react-bootstrap";
import GitHubCalendar from "react-github-calendar";
import { useParams } from "react-router-dom";
import UserPrChart from "../components/UserPRChart/UserPrChart";
import UserProfilePrList from "../components/UserProfilePrList/UserProfilePrList";
import { getMonthsStringFromIssueList } from "../services/utils";
import { dbStore } from "../services/idb";
import UserProfileJiraList from "../components/UserProfileJiraList";

function UserProfile() {
  const { username } = useParams();

  const [userData, setUserData] = useState(null);
  const [jiraData, setJiraData] = useState(null);

  useEffect(() => {
    async function setDefaults() {
      const userDataList = await dbStore.getData("opti-gh-data");
      const jiraData = await dbStore.getData("opti-jira-data");

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
        </Tab>
      </Tabs>
      <br />
    </>
  );
}

export default UserProfile;
