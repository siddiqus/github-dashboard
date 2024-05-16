import { Button } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { daysDifference } from "../../services/utils";

export function HomeUserTable({ userDataList }) {
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
      selector: (row) => row.username,
    },
    {
      name: "Total PRs in period",
      selector: (row) => row.totalPrCounts,
      sortable: true,
    },
    {
      name: "Average PR / month",
      selector: (row) => row.averagePrCountPerMonth,
      sortable: true,
    },
    {
      name: "Average PR Cycle (days)",
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
        return +average.toFixed(2);
      },
      sortable: true,
    },
    {
      name: "",
      selector: (row) => (
        <Button
          className="btn btn-light"
          onClick={() => goToUser(row.username)}
        >
          Go to profile
        </Button>
      ),
    },
  ];

  return (
    <DataTable highlightOnHover data={userDataList} columns={tableColumns} />
  );
}
