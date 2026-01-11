import { useEffect, useState } from "react";
import { Card, Tab, Table, Tabs } from "react-bootstrap";
import GitHubCalendar from "react-github-calendar";
import { useParams } from "react-router-dom";
import UserPrChart from "../components/UserPRChart/UserPrChart";
import UserProfileJiraList from "../components/UserProfileJiraList";
import UserProfilePrList from "../components/UserProfilePrList/UserProfilePrList";
import { dbStore } from "../services/idb";
import {
  getMonthsStringFromIssueList,
  getUsersFromStore,
} from "../services/utils";
import { getBonuslyDataCached } from "../services/bonusly";

function UserProfile() {
  const { username } = useParams();

  const [userData, setUserData] = useState(null);
  const [jiraData, setJiraData] = useState(null);
  const [bonuslyData, setBonuslyData] = useState([]);

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

    async function getBonuslyData() {
      const startDateFromStorage = localStorage.getItem("opti-gh-startDate");
      const endDateFromStorage = localStorage.getItem("opti-gh-endDate");

      const userList = await getUsersFromStore();

      const userEmail = userList.find((u2) => u2.username === username)?.email;

      console.log('fetching bonusly data')
      const bonuslyDataMap = await getBonuslyDataCached(
        [userEmail],
        startDateFromStorage,
        endDateFromStorage
      );
      const bonuslyData = bonuslyDataMap[userEmail?.toLowerCase()] || [];
      setBonuslyData(bonuslyData);
    }
    setDefaults();
    getBonuslyData();
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
              <th key={`month-${index}`}>{month}</th>
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

  const Bonusly = () => {
    if (!bonuslyData || !bonuslyData.length) {
      return null;
    }

    const bonuslyCards = bonuslyData.map((bonusly, index) => (
      <Card className="p-3 mt-3" key={index}>
        <div className="d-flex">
          <div className="me-3">
            <img
              src={bonusly.giver.profile_pic_url}
              alt={bonusly.giver.full_name}
              className="rounded-circle"
              style={{ width: "50px", height: "50px", objectFit: "cover" }}
            />
          </div>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div className="fw-bold">{bonusly.giver.full_name}</div>
                <div className="text-muted small">{bonusly.giver.email}</div>
              </div>
              <div className="text-muted small">
                {new Date(bonusly.created_at).toDateString()}
              </div>
            </div>
            <div
              dangerouslySetInnerHTML={{ __html: bonusly.reason_html }}
            ></div>
          </div>
        </div>
      </Card>
    ));

    const totalPoints = bonuslyData.reduce((sum, b) => sum + b.amount, 0);
    return (
      <>
        <h5>Total Bonusly Points in time period: {totalPoints}</h5>
        {bonuslyCards}
      </>
    );
  };

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
          />
          {/* <PrStats /> */}
        </Tab>
        <Tab eventKey="prList" title="PR List">
          {!userData || !userData.prList || !userData.prList.length ? (
            "No PRs found"
          ) : (
            <UserProfilePrList userData={userData} />
          )}
        </Tab>
        <Tab eventKey="prReviewList" title="PR Review List">
          {!userData || !userData.prList || !userData.prList.length ? (
            "No PRs found"
          ) : (
            <UserProfilePrList
              userData={{
                ...userData,
                prList: userData.reviewedPrList,
              }}
            />
          )}
        </Tab>
        <Tab eventKey="jiraList" title="JIRA Tickets">
          <UserProfileJiraList jiraData={jiraData || []} />
        </Tab>

        <Tab eventKey="bonusly" title="Bonusly">
          <Bonusly />
        </Tab>
      </Tabs>
      <br />
    </>
  );
}

export default UserProfile;
