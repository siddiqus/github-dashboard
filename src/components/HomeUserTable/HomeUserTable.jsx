import { Button } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";

export function HomeUserTable({ userDataList }) {
  if (!userDataList || !userDataList.every((e) => !!e.prList.length)) {
    return null;
  }
  const navigate = useNavigate();

  function goToUser(username) {
    navigate(`/users/${username}`);
  }

  const tableColumns = [
    {
      name: "Name",
      selector: (row) => row.name,
    },
    {
      name: "Username",
      selector: (row) => (
        <a
          href={"https://github.com/" + row.username}
          target="_blank"
          rel="noopener noreferrer"
        >
          {row.username}
        </a>
      ),
    },
    {
      name: "Total PRs",
      selector: (row) => row.totalPrCounts,
      sortable: true,
    },
    {
      name: "Avg Adds/m",
      selector: (row) => row.averageAdditionsPerMonth,
      sortable: true,
    },
    {
      name: "Avg PR/m",
      selector: (row) => row.averagePrCountPerMonth,
      sortable: true,
    },
    {
      name: "Avg Adds/PR",
      selector: (row) => row.averageAddsPerPr,
      sortable: true,
    },
    {
      name: "Avg PR Cycle",
      selector: (row) => {
        const prList = row.prList;
        let average = row.prList.reduce((sum, pr) => {
          if (!pr.closed_at) {
            return sum;
          }

          const differenceInMs =
            new Date(pr.closed_at).getTime() - new Date(pr.created_at);
          const differenceInHours = differenceInMs / (1000 * 60 * 60);
          return sum + differenceInHours / 24;
        }, 0);
        average = average / prList.filter((pr) => !!pr.closed_at).length;
        return `${+average.toFixed(2)} days`;
      },
      sortable: true,
    },
    {
      name: "",
      selector: (row) => (
        <Button
          variant="outline-primary"
          className="btn btn-light"
          onClick={() => goToUser(row.username)}
        >
          Profile
        </Button>
      ),
    },
  ];

  return (
    <DataTable highlightOnHover data={userDataList} columns={tableColumns} />
  );
}
