import { useState } from "react";
import { HomeUserTable } from "../components/HomeUserTable/HomeUserTable";
import Loading from "../components/Loading";
import UserPrChart from "../components/UserPRChart/UserPrChart";
import UserPicker from "../components/UserPicker/UserPicker";
import { userListByUsername } from "../services/github/utils";
import { getUserData } from "../services/index";
import { searchJiraIssues } from "../services/jira";

const statusMap = {
  LOADING: "loading",
  NO_DATA: "no-data",
  LOADED: "loaded",
  ERROR: "error",
};

function Home() {
  const [dataStatus, setDataStatus] = useState(statusMap.NO_DATA);

  const [userDataList, setUserDataList] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit({ startDate, endDate, usernames }) {
    try {
      setErrorMessage("");
      setDataStatus(statusMap.LOADING);

      // const jiraData = await searchJiraIssues({
      //   userEmails: usernames.map((u) => userListByUsername[u].email),
      //   startDate: startDate,
      //   endDate: endDate,
      // });
      // console.log(jiraData);

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
        <UserPrChart userDataList={userDataList}></UserPrChart>
      ) : (
        <></>
      )}

      {isLoaded ? (
        <HomeUserTable userDataList={userDataList}></HomeUserTable>
      ) : (
        <></>
      )}
      <br />
    </>
  );
}

export default Home;
