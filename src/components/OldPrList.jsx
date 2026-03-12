import { useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { Button, Form } from "react-bootstrap";

export default function OldPrList({ data }) {
  const [selectedUser, setSelectedUser] = useState("");

  const users = useMemo(() => {
    const userMap = new Map();
    (data || []).forEach((row) => {
      if (!userMap.has(row.username)) {
        userMap.set(row.username, row.name);
      }
    });
    return Array.from(userMap, ([username, name]) => ({ username, name })).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [data]);

  const filteredData = useMemo(() => {
    if (!selectedUser) return data;
    return (data || []).filter((row) => row.username === selectedUser);
  }, [data, selectedUser]);

  const copyLinks = () => {
    if (!filteredData || filteredData.length === 0) return;
    const links = filteredData
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
        <div className="d-flex gap-2 align-items-center">
          <Form.Select
            size="sm"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            style={{ width: "200px" }}
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.username} value={u.username}>
                {u.name}
              </option>
            ))}
          </Form.Select>
          <Button variant="outline-secondary" size="sm" onClick={copyLinks}>
            Copy Links
          </Button>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredData}
        responsive
        striped
        highlightOnHover
      />
    </div>
  );
}
