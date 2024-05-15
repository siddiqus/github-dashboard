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
    // t.width = "fit-content";
    t.wrap = true;
  });

  return (
    <>
      <div>
        <h4 style={{ float: "left" }}>
          {userData?.name} ({username})
        </h4>
        <div style={{ float: "right" }}>
          {localStorageStartDate &&
            localStorageEndDate &&
            `${localStorageStartDate}-${localStorageEndDate}`}
        </div>
      </div>

      <hr />
      <GitHubCalendar username={username} colorScheme="light" />
      <hr />
      {loadingStatus && loadingStatus === "loading" && <h5>Loading...</h5>}
      {error && <h5>Error: {error.message}</h5>}
      {prList.length ? (
        <>
          <h5>PR List</h5>
          <DataTable columns={tableColumns} data={prList} fixedHeader />
          {/* <Table hover bordered>
            <thead>
              <tr>
                <td>URL</td>
                <td>Created</td>
                <td>Closed</td>
                <td>Cycle Time (Days)</td>
                <td>Commits</td>
                <td>Comments</td>
                <td>Additions</td>
                <td>Deletions</td>
                <td>Changed Files</td>
              </tr>
            </thead>
            <tbody>
              {prList.map((pr, index) => {
                return (
                  <tr key={index}>
                    <td>
                      <a href={pr.html_url} target="_blank">
                        {pr.html_url}
                      </a>
                    </td>
                    <td>{new Date(pr.created_at).toDateString()}</td>
                    <td>{new Date(pr.closed_at).toDateString()}</td>
                    <td>
                      {pr.closed_at
                        ? daysDifference(pr.created_at, pr.closed_at)
                        : "N/A"}
                    </td>
                    <td>{pr.commits}</td>
                    <td>{pr.comments}</td>
                    <td>{pr.additions}</td>
                    <td>{pr.deletions}</td>
                    <td>{pr.changed_files}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table> */}
        </>
      ) : (
        <></>
      )}
      <br />
    </>
  );
}

export default UserProfile;
