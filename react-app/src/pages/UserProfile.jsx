import { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import GitHubCalendar from "react-github-calendar";
import { useParams } from "react-router-dom";
import { getPr } from "../services/call-api";

function UserProfile() {
  const { username } = useParams();

  const [loadingStatus, setLoadingStatus] = useState("");

  const [userData, setUserData] = useState(null);
  const [prList, setPrList] = useState([]);

  const [error, setError] = useState(null);

  const localStorageStartDate = localStorage.getItem("opti-gh-startDate");
  const localStorageEndDate = localStorage.getItem("opti-gh-endDate");

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

  const tableColumns = [
    {
      name: "URL",
      selector: (row) => (
        <a href={row.html_url} target="_blank">
          {row.html_url}
        </a>
      ),
      width: "400px",
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
          return `${new Date(row.closed_at).toDateString()} (merged)`;
        }

        if (row.closed_at) {
          return `${new Date(row.closed_at).toDateString()} (closed)`;
        }

        return "N/A";
      },
      width: "150px",
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
      {prList.length ? (
        <>
          <h5>PR List</h5>
          <DataTable columns={tableColumns} data={prList} fixedHeader />
        </>
      ) : (
        <></>
      )}
      <br />
    </>
  );
}

export default UserProfile;
