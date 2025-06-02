import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Dropdown,
  InputGroup,
  Row,
  Table,
} from "react-bootstrap";
import DataTable from "react-data-table-component";
import {
  clearPrCache,
  getPrApiBody,
  getPrList,
} from "../../services/github/utils";
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
      width: "130px",
    },
    {
      name: "Title",
      selector: (row) => (
        <>
          {row.draft ? (
            <span
              style={{
                marginRight: "3px",
                background: "lightgray",
              }}
            >{`[Draft]`}</span>
          ) : (
            ""
          )}
          {row.title}{" "}
          <a href={row.html_url} target="_blank">
            (#{row.number})
          </a>
        </>
      ),
      width: "280px",
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
      fixedHeaderScrollHeight="600px"
      highlightOnHover
      columns={tableColumns}
      data={prList}
      fixedHeader
      customStyles={{
        cells: {
          style: {
            paddingTop: "15px",
            paddingBottom: "15px",
          },
        },
      }}
    />
  ) : (
    <>N/A</>
  );
}

const LOADING_STATUS = {
  loaded: "loaded",
  loading: "loading",
};

function calculateMonthlyStats(prList) {
  // Group PRs by month
  const monthlyData = prList.reduce((acc, pr) => {
    const month = pr.created_at.substring(0, 7); // YYYY-MM format
    if (!acc[month]) {
      acc[month] = {
        prs: [],
        totalAdditions: 0,
        totalDeletions: 0,
        totalCycleTime: 0,
      };
    }
    acc[month].prs.push(pr);
    acc[month].totalAdditions += pr.additions || 0;
    acc[month].totalDeletions += pr.deletions || 0;
    if (pr.closed_at) {
      acc[month].totalCycleTime += daysDifference(
        new Date(pr.created_at),
        new Date(pr.closed_at)
      );
    }
    return acc;
  }, {});

  // Calculate averages
  Object.keys(monthlyData).forEach((month) => {
    const data = monthlyData[month];
    const count = data.prs.length;
    data.avgCycleTime = (data.totalCycleTime / count).toFixed(1);
  });

  return monthlyData;
}

function MonthlyPrMetrics({ prList }) {
  const monthlyStats = useMemo(() => calculateMonthlyStats(prList), [prList]);

  return (
    <Card className="mb-3">
      <Card.Header>Monthly PR Stats</Card.Header>
      <Card.Body>
        <Table hover size="sm">
          <thead>
            <tr>
              <th>Month</th>
              <th>Total PRs</th>
              <th>Total Adds</th>
              <th>Total Dels</th>
              <th>Avg Cycle (days)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(monthlyStats)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([month, stats]) => (
                <tr key={month}>
                  <td>{month}</td>
                  <td>{stats.prs.length}</td>
                  <td>{stats.totalAdditions}</td>
                  <td>{stats.totalDeletions}</td>
                  <td>{stats.avgCycleTime}</td>
                </tr>
              ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

function PrListWithFilter({ prList, onRefreshCache }) {
  const [prListFilter, setPrListFilter] = useState("");
  const [filteredPrList, setFilteredPrList] = useState(prList);

  useEffect(() => {
    setFilteredPrList(prList);
  }, [prList]);

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
              {months.map((month, index) => (
                <Dropdown.Item
                  key={index}
                  onClick={() => setPrListFilterValue(month)}
                >
                  {month}
                </Dropdown.Item>
              ))}
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

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ padding: "15px", fontWeight: "600" }}>
          Items: {filteredPrList.length}
        </div>
        <div style={{ display: "inline-flex" }}>
          <div>
            <SearchFilter />
          </div>
          <div>
            <Button
              style={{ marginLeft: "20px" }}
              variant="light"
              onClick={onRefreshCache}
            >
              Refresh Cache
            </Button>
          </div>
        </div>
      </div>

      <PrList prList={filteredPrList} />
    </>
  );
}

function UserProfilePrList({ userData }) {
  const [loadingStatus, setLoadingStatus] = useState("");
  const [prList, setPrList] = useState([]);
  const [error, setError] = useState(null);

  async function getPrData() {
    try {
      setLoadingStatus(LOADING_STATUS.loading);
      const prList = getPrApiBody(userData.prList);
      prList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const userPrs = await getPrList(prList);
      setPrList(userPrs);
      setLoadingStatus(LOADING_STATUS.loaded);
    } catch (error) {
      setError(error);
      setLoadingStatus(LOADING_STATUS.loaded);
    }
  }

  useEffect(() => {
    getPrData();
  }, []);

  async function resetPrCacheData() {
    try {
      setError(null);
      await clearPrCache(getPrApiBody(userData.prList));
      await getPrData();
    } catch (error) {
      setError(error);
    }
  }

  return (
    <>
      {error && <h5>Error: {error.message}</h5>}
      {loadingStatus && loadingStatus === LOADING_STATUS.loading && <Loading />}

      {loadingStatus === LOADING_STATUS.loaded && prList && prList.length ? (
        <Row>
          <Col lg={7}>
            <PrListWithFilter
              prList={prList}
              onRefreshCache={resetPrCacheData}
            />
          </Col>
          <Col lg={5}>
            <MonthlyPrMetrics prList={prList} />
          </Col>
        </Row>
      ) : (
        <></>
      )}
    </>
  );
}
export default UserProfilePrList;
