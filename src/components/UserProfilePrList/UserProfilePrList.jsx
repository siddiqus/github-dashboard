import { useEffect, useMemo, useState } from "react";
import { Button, Dropdown, InputGroup } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { getPr, clearPrCache } from "../../services/index";
import {
  daysDifference,
  getMonthsStringFromIssueList,
} from "../../services/utils";
import Loading from "../Loading";

function PrList({ prList }) {
  prList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const tableColumns = [
    {
      name: "Repo",
      selector: (row) => {
        const [_, repoUrl] = row.html_url.split("github.com/");
        const [__, repo] = repoUrl.split("/");
        return repo;
      },
      width: "150px",
    },
    {
      name: "Title",
      selector: (row) => (
        <>
          {row.title}{" "}
          <a href={row.html_url} target="_blank">
            (#{row.number})
          </a>
        </>
      ),
      width: "350px",
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
          return `${new Date(row.closed_at).toDateString()} (Merged)`;
        }

        if (row.closed_at) {
          return `${new Date(row.closed_at).toDateString()} (Closed)`;
        }

        return "Open";
      },
      width: "150px",
    },
    {
      name: `Cycle (in Days)`,
      selector: (row) =>
        daysDifference(row.created_at, row.closed_at || new Date()),
      width: "100px",
      sortable: true,
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

  return prList.length ? (
    <DataTable
      fixedHeaderScrollHeight="500px"
      highlightOnHover
      columns={tableColumns}
      data={prList}
      fixedHeader
    />
  ) : (
    <>N/A</>
  );
}

function getPrApiBody(prList) {
  const data = prList.map((p) => {
    const url = p.html_url;
    const [_, ownerRepoPullNumber] = url.split("github.com/");
    const [owner, repo] = ownerRepoPullNumber.split("/");
    return {
      pullNumber: p.number,
      owner,
      repo,
    };
  });

  return data;
}

const LOADING_STATUS = {
  loaded: "loaded",
  loading: "loading",
};

function UserProfilePrList({ userData }) {
  if (!userData || !userData.prList || !userData.prList.length) {
    return null;
  }
  const [prListFilter, setPrListFilter] = useState("");
  const [loadingStatus, setLoadingStatus] = useState("");

  const [prList, setPrList] = useState([]);
  const [filteredPrList, setFilteredPrList] = useState(prList);

  const [error, setError] = useState(null);

  async function getPrData() {
    try {
      setLoadingStatus(LOADING_STATUS.loading);
      const prList = getPrApiBody(userData.prList);
      prList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const userPrs = await getPr(prList);
      setPrList(userPrs);
      setFilteredPrList(userPrs);
      setLoadingStatus(LOADING_STATUS.loaded);
    } catch (error) {
      setError(error);
      setLoadingStatus(LOADING_STATUS.loaded);
    }
  }

  useEffect(() => {
    getPrData();
  }, []);

  function setPrListFilterValue(filter) {
    setPrListFilter(filter);

    if (!filter) {
      setFilteredPrList(prList);
    } else {
      setFilteredPrList(
        prList.filter((pr) =>
          new Date(pr.created_at).toISOString().includes(filter)
        )
      );
    }
  }

  function SearchFilter() {
    return useMemo(() => {
      const months = getMonthsStringFromIssueList(prList);
      return (
        <InputGroup>
          <Dropdown>
            <Dropdown.Toggle variant="light" style={{ width: "150px" }}>
              {prListFilter || "Select Month"}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              {months.map((month, index) => {
                return (
                  <Dropdown.Item
                    key={index}
                    onClick={() => setPrListFilterValue(month)}
                  >
                    {month}
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Menu>
          </Dropdown>

          <Button
            disabled={!prListFilter}
            variant="light"
            onClick={() => setPrListFilterValue("")}
          >
            {prListFilter ? "x" : " "}
          </Button>
        </InputGroup>
      );
    }, [prList]);
  }

  async function resetPrCacheData() {
    try {
      await clearPrCache(getPrApiBody(userData.prList));
      await getPrData();
    } catch (error) {
      setError(error);
    }
  }

  return (
    <>
      {error && <h5>Error: {error.message}</h5>}
      {loadingStatus && loadingStatus === LOADING_STATUS.loading && (
        // <h5>Loading...</h5>
        <Loading></Loading>
      )}

      {loadingStatus === LOADING_STATUS.loaded && prList && prList.length ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ padding: "15px", fontWeight: "600" }}>
              Items: {filteredPrList.length}
            </div>
            <div style={{ display: "inline-flex" }}>
              <div>
                <SearchFilter></SearchFilter>
              </div>
              <div>
                <Button
                  style={{ marginLeft: "20px" }}
                  variant="light"
                  onClick={resetPrCacheData}
                >
                  Refresh Cache
                </Button>
              </div>
            </div>
          </div>

          <PrList prList={filteredPrList} />
        </>
      ) : (
        <></>
      )}
    </>
  );
}
export default UserProfilePrList;
