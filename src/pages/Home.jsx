import { useState } from "react";
import { HomeUserTable } from "../components/HomeUserTable/HomeUserTable";
import Loading from "../components/Loading";
import UserPrChart from "../components/UserPRChart/UserPrChart";
import UserPicker from "../components/UserPicker/UserPicker";
import { userListByUsername } from "../services/github/utils";
import db from "../services/idb";
import { getUserData } from "../services/index";
import { getJiraIssuesCached } from "../services/jira";

const statusMap = {
  LOADING: "loading",
  NO_DATA: "no-data",
  LOADED: "loaded",
  ERROR: "error",
};

function Home() {
  const [dataStatus, setDataStatus] = useState(statusMap.NO_DATA);

  const [userDataList, setUserDataList] = useState([]);
  const [jiraData, setJiraData] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  const [jiraIsLoading, setJiraIsLoading] = useState(false);

  async function onSubmit({ startDate, endDate, usernames }) {
    try {
      setErrorMessage("");
      setDataStatus(statusMap.LOADING);

      setJiraIsLoading(true);

      await Promise.all([
        Promise.all(
          usernames.map((u) =>
            getUserData({
              author: u,
              startDate,
              endDate,
            })
          )
        ).then((githubData) => {
          setUserDataList(githubData);
          setDataStatus(statusMap.LOADED);
          db.setData("opti-gh-data", githubData);
        }),

        getJiraIssuesCached({
          userEmails: usernames.map((u) => userListByUsername[u].email),
          startDate,
          endDate,
        })
          .then((jiraData) => {
            if (jiraData) {
              setJiraData(jiraData);
              db.setData("opti-jira-data", jiraData);
            }
            setJiraIsLoading(false);
          })
          .catch((er) => {
            console.error(er);
            setJiraIsLoading(false);
          }),
      ]);
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
          jiraData={jiraData}
          jiraIsLoading={jiraIsLoading}
        ></UserPrChart>
      ) : (
        <></>
      )}

      {isLoaded ? (
        <HomeUserTable
          userDataList={userDataList}
          jiraData={jiraData}
        ></HomeUserTable>
      ) : (
        <></>
      )}
      <br />
    </>
  );
}

export default Home;
