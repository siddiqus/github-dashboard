import { useState } from "react";
import { HomeUserTable } from "../components/HomeUserTable/HomeUserTable";
import Loading from "../components/Loading";
import UserPrChart from "../components/UserPRChart/UserPrChart";
import UserPicker from "../components/UserPicker/UserPicker";
import { dbStore } from "../services/idb";
import { getUserData } from "../services/github/utils";
import { getJiraIssuesCached } from "../services/jira";
import { getUsersFromStore } from "../services/utils";

const statusMap = {
  LOADING: "loading",
  NO_DATA: "no-data",
  LOADED: "loaded",
  ERROR: "error",
};

function Home() {
  const [dataStatus, setDataStatus] = useState(statusMap.NO_DATA);

  const [userDataList, setUserDataList] = useState([]);
  const [jiraData, setJiraData] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [jiraIsLoading, setJiraIsLoading] = useState(false);

  async function onSubmit({ startDate, endDate, usernames }) {
    try {
      setErrorMessage("");
      setDataStatus(statusMap.LOADING);

      setJiraIsLoading(true);

      const userList = await getUsersFromStore();

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
          dbStore.setData("opti-gh-data", githubData);
        }),

        getJiraIssuesCached({
          userEmails: usernames.map(
            (u) => userList.find((u2) => u2.username === u)?.email
          ),
          startDate,
          endDate,
        })
          .then((jiraData) => {
            if (jiraData) {
              setJiraData(jiraData);
              dbStore.setData("opti-jira-data", jiraData);
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
