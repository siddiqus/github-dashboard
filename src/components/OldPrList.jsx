import DataTable from "react-data-table-component";

export default function OldPrList({ data }) {
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
      <h5>Old Pull Requests</h5>
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
