import { useState } from "react";
import { HomeUserTable } from "../components/HomeUserTable/HomeUserTable";
import Loading from "../components/Loading";
import OldPrList from "../components/OldPrList";
import UserPrChart from "../components/UserPRChart/UserPrChart";
import UserPicker from "../components/UserPicker/UserPicker";
import { getUserData } from "../services/github/utils";
import { dbStore } from "../services/idb";
import { getJiraIssuesCached } from "../services/jira";
import { getUsersFromStore } from "../services/utils";
import { Card } from "react-bootstrap";

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

      const userEmails = usernames.map(
        (u) => userList.find((u2) => u2.username === u)?.email
      );

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
          userEmails,
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

  const getRepoFromUrl = (url) => {
    const match = url.match(/repos\/[^/]+\/([^/]+)/);
    return match ? match[1] : "";
  };

  const oldPrData = userDataList.flatMap((userData) =>
    userData.oldPrs.map((pr) => ({
      name: userData.name,
      username: userData.username,
      repo: getRepoFromUrl(pr.url),
      title: pr.title,
      url: pr.url,
      created_at: pr.created_at,
      daysElapsed: Math.floor(
        (new Date() - new Date(pr.created_at)) / (1000 * 60 * 60 * 24)
      ),
      draft: pr.draft,
    }))
  );

  const HomeElements = () => (
    <>
      <Card className="p-3 mt-4 pt-4 shadow-sm">
        <h5>Member Data</h5>
        <HomeUserTable userDataList={userDataList} jiraData={jiraData} />
      </Card>

      {oldPrData.length > 0 ? (
        <Card className="p-3 mt-4 pt-4 shadow-sm">
          <OldPrList data={oldPrData} />
        </Card>
      ) : (
        <></>
      )}

      <Card className="p-3 mt-4 pt-4 shadow-sm">
        <h5>Member Stats</h5>
        <br />
        <UserPrChart
          userDataList={userDataList}
          jiraData={jiraData}
          jiraIsLoading={jiraIsLoading}
        ></UserPrChart>
      </Card>
    </>
  );

  return (
    <>
      <UserPicker onSubmit={onSubmit} onReset={onReset} />
      <hr className="m-0" />

      {isLoading ? <Loading></Loading> : <></>}
      {isError ? <h4 style={{ color: "red" }}> {errorMessage}</h4> : <></>}

      {isLoaded && <HomeElements />}
      <br />
    </>
  );
}

export default Home;
