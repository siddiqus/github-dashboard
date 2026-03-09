import DataTable from "react-data-table-component";
import { Button } from "react-bootstrap";

export default function OldPrList({ data }) {
  const copyLinks = () => {
    if (!data || data.length === 0) return;
    const links = data
      .map((row) => row.url.replace("//api.", "//www.").replace("/repos", ""))
      .join("\n");
    navigator.clipboard.writeText(links).then(
      () => alert("PR links copied to clipboard!"),
      (err) => {
        console.error("Failed to copy links: ", err);
        alert("Failed to copy to clipboard");
      }
    );
  };
  const columns = [
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
      grow: 1.5,
    },
    {
      name: "Username",
      selector: (row) => row.username,
      sortable: true,
      grow: 1,
    },
    {
      name: "Repo",
      selector: (row) => row.repo,
      sortable: true,
      grow: 1.5,
    },
    {
      name: "PR Title / Link",
      selector: (row) => (
        <div style={{ whiteSpace: "pre-wrap" }}>
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
          <a
            href={row.url.replace("//api.", "//www.").replace("/repos", "")}
            target="_blank"
            rel="noopener noreferrer"
          >
            {row.title}
          </a>
        </div>
      ),
      sortable: true,
      grow: 4,
    },
    {
      name: "Created At",
      selector: (row) => row.created_at,
      sortable: true,
      format: (row) => new Date(row.created_at).toISOString().split("T")[0],
      grow: 1,
    },
    {
      name: "Days Elapsed",
      selector: (row) => row.daysElapsed,
      sortable: true,
      grow: 1,
    },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Old Pull Requests</h5>
        <Button variant="outline-secondary" size="sm" onClick={copyLinks}>
          Copy Links
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        responsive
        striped
        highlightOnHover
      />
    </div>
  );
}
