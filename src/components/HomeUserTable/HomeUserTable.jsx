import { Button } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";

export function HomeUserTable({ userDataList }) {
  const navigate = useNavigate();

  function goToUser(username) {
    navigate(`/users/${username}`);
  }

  function copyAsTSV() {
    if (!userDataList || userDataList.length === 0) return;

    // Create TSV header
    const headers = [
      "Name",
      "Username",
      "Avg Adds/m",
      "Avg Adds/PR",
      "Avg PR/m",
      "Avg Rev/m",
      "Avg PR Cycle",
      "# PRs",
      "# Revs",
    ];
    const tsvHeader = headers.join("\t");

    // Create TSV rows
    const tsvRows = userDataList.map((row) => {
      return [
        row.name,
        row.username,
        row.averageAdditionsPerMonth,
        row.averageAddsPerPr,
        row.averagePrCountPerMonth,
        row.averageReviewsPerMonth,
        `${(+row.averagePrCycleInDays).toFixed(2)} days`,
        row.totalPrCounts,
        row.totalReviewsInPeriod,
      ].join("\t");
    });

    // Combine header and rows
    const tsvContent = [tsvHeader, ...tsvRows].join("\n");

    // Copy to clipboard
    navigator.clipboard.writeText(tsvContent).then(
      () => {
        alert("Table data copied as TSV!");
      },
      (err) => {
        console.error("Failed to copy TSV: ", err);
        alert("Failed to copy to clipboard");
      }
    );
  }

  if (!userDataList || !userDataList.every((e) => !!e.prList.length)) {
    return null;
  }

  const tableColumns = [
    {
      name: "Name",
      selector: (row) => (
        <span>
          {row.name} (
          <a
            href={"https://github.com/" + row.username}
            target="_blank"
            rel="noopener noreferrer"
          >
            {row.username}
          </a>
          )
        </span>
      ),
      width: "300px",
    },
    {
      name: "Avg Adds/m",
      selector: (row) => row.averageAdditionsPerMonth,
      sortable: true,
      width: "130px",
    },
    {
      name: "Avg Adds/PR",
      selector: (row) => row.averageAddsPerPr,
      sortable: true,
      width: "140px",
    },
    {
      name: "Avg PR/m",
      selector: (row) => row.averagePrCountPerMonth,
      sortable: true,
      width: "120px",
    },
    {
      name: "Avg Rev/m",
      selector: (row) => row.averageReviewsPerMonth,
      sortable: true,
      width: "120px",
    },
    {
      name: "Avg PR Cycle",
      selector: (row) => {
        return `${(+row.averagePrCycleInDays).toFixed(2)} days`;
      },
      sortable: true,
      width: "140px",
    },
    {
      name: "# PRs",
      selector: (row) => row.totalPrCounts,
      sortable: true,
    },
    {
      name: "# Revs",
      selector: (row) => row.totalReviewsInPeriod,
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
    <div>
      <div style={{ marginBottom: "10px", textAlign: "right" }}>
        <Button variant="outline-secondary" onClick={copyAsTSV}>
          Copy as TSV
        </Button>
      </div>
      <DataTable highlightOnHover data={userDataList} columns={tableColumns} />
    </div>
  );
}
