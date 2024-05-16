import { useState } from "react";
import { HomeUserTable } from "../components/HomeUserTable/HomeUserTable";
import UserPrChart from "../components/UserPRChart/UserPrChart";
import UserPicker from "../components/UserPicker/UserPicker";
import { getUserData } from "../services/call-api";
import DataTable from "react-data-table-component";

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

      const data = await Promise.all(
        usernames.map((u) =>
          getUserData({
            author: u,
            startDate,
            endDate,
          })
        )
      );
      setUserDataList(data);
      setDataStatus(statusMap.LOADED);

      localStorage.setItem("opti-gh-data", JSON.stringify(data));
    } catch (error) {
      setErrorMessage(error.message);
      setDataStatus(statusMap.ERROR);
    }
  }

  const isLoaded = dataStatus === statusMap.LOADED;
  const isLoading = dataStatus === statusMap.LOADING;
  const isError = dataStatus === statusMap.ERROR;

  return (
    <>
      <UserPicker onSubmit={onSubmit} />
      <hr />

      {isLoading ? <h4>Loading...</h4> : <></>}
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
