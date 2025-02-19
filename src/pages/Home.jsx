import { useState } from "react";
import { HomeUserTable } from "../components/HomeUserTable/HomeUserTable";
import Loading from "../components/Loading";
import UserPrChart from "../components/UserPRChart/UserPrChart";
import UserPicker from "../components/UserPicker/UserPicker";
import { userListByUsername } from "../services/github/utils";
import { getUserData } from "../services/index";
import { getJiraMonthWiseIssueDataByUsername } from "../services/jira";

const statusMap = {
  LOADING: "loading",
  NO_DATA: "no-data",
  LOADED: "loaded",
  ERROR: "error",
};

function Home() {
  const [dataStatus, setDataStatus] = useState(statusMap.NO_DATA);

  const [userDataList, setUserDataList] = useState([]);
  const [jiraChartData, setJiraChartData] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  const [jiraIsLoading, setJiraIsLoading] = useState(false);

  async function onSubmit({ startDate, endDate, usernames }) {
    try {
      setErrorMessage("");
      setDataStatus(statusMap.LOADING);

      const githubData = await Promise.all(
        usernames.map((u) =>
          getUserData({
            author: u,
            startDate,
            endDate,
          })
        )
      );

      setUserDataList(githubData);
      setDataStatus(statusMap.LOADED);

      setJiraIsLoading(true);
      getJiraMonthWiseIssueDataByUsername({
        userEmails: usernames.map((u) => userListByUsername[u].email),
        startDate: startDate,
        endDate: endDate,
      })
        .then((jiraData) => {
          setJiraChartData(jiraData);
          localStorage.setItem("opti-jira-data", JSON.stringify(jiraData));
          setJiraIsLoading(false);
        })
        .catch((er) => {
          setJiraIsLoading(false);
          console.error(er);
        });

      localStorage.setItem("opti-gh-data", JSON.stringify(githubData));
    } catch (error) {
      setErrorMessage(error.message);
      setDataStatus(statusMap.ERROR);
    }
  }

  const isLoaded = dataStatus === statusMap.LOADED;
  const isLoading = dataStatus === statusMap.LOADING;
  const isError = dataStatus === statusMap.ERROR;

  function onReset() {
    setUserDataList([]);
    setDataStatus(statusMap.NO_DATA);
  }

  return (
    <>
      <UserPicker onSubmit={onSubmit} onReset={onReset} />
      <hr />

      {isLoading ? <Loading></Loading> : <></>}
      {isError ? <h4 style={{ color: "red" }}> {errorMessage}</h4> : <></>}

      {isLoaded ? (
        <UserPrChart
          userDataList={userDataList}
          jiraChartData={jiraChartData}
          jiraIsLoading={jiraIsLoading}
        ></UserPrChart>
      ) : (
        <></>
      )}

      {isLoaded ? (
        <HomeUserTable
          userDataList={userDataList}
          jiraChartData={jiraChartData}
        ></HomeUserTable>
      ) : (
        <></>
      )}
      <br />
    </>
  );
}

export default Home;
