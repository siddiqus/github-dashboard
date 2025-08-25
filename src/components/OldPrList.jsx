import DataTable from "react-data-table-component";

export default function OldPrList({ userDataList }) {
  const getRepoFromUrl = (url) => {
    const match = url.match(/repos\/[^/]+\/([^/]+)/);
    return match ? match[1] : "";
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

  const data = userDataList.flatMap((userData) =>
    userData.oldPrs.map((pr) => ({
      name: userData.name,
      username: userData.username,
      repo: getRepoFromUrl(pr.url),
      title: pr.title,
      url: pr.url,
      created_at: pr.created_at,
      daysElapsed: Math.floor(
        (new Date() - new Date(pr.created_at)) / (1000 * 60 * 60 * 24)
      ),
      draft: pr.draft,
    }))
  );

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
