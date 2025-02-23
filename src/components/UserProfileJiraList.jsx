// https://jira.sso.episerver.net/browse/APP-43

import { useMemo, useState } from "react";
import { Button, Dropdown, InputGroup, Modal } from "react-bootstrap";
import DataTable from "react-data-table-component";

function JiraList({ jiraData }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  jiraData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const tableColumns = [
    {
      name: "Issue Key",
      selector: (row) => (
        <a
          target="_blank"
          href={`https://jira.sso.episerver.net/browse/${row.issueKey}`}
        >
          {row.issueKey}
        </a>
      ),
      width: "120px",
      sortable: true,
    },
    {
      name: "Type",
      selector: (row) => row.issueType,
      width: "100px",
      sortable: true,
    },
    {
      name: "Description",
      selector: (row) => {
        const truncatedDesc =
          row.description.length > 400
            ? row.description.substring(0, 400).split("\n").join("\n") + "..."
            : row.description.split("\n").join("\n");
        return (
          <span
            style={{ cursor: "pointer", whiteSpace: "pre-line" }}
            onClick={() => {
              setSelectedIssue(row);
              setShowModal(true);
            }}
          >
            {truncatedDesc}
          </span>
        );
      },
      width: "500px",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => row.status,
      width: "100px",
      sortable: true,
    },
    {
      name: "Created",
      selector: (row) => new Date(row.createdAt),
      format: (row) => new Date(row.createdAt).toDateString(),
      sortable: true,
      width: "150px",
    },
    {
      name: "Resolved",
      selector: (row) => (row.resolvedAt ? new Date(row.resolvedAt) : null),
      format: (row) =>
        row.resolvedAt ? new Date(row.resolvedAt).toDateString() : "-",
      sortable: true,
      width: "150px",
    },
    {
      name: "Points",
      selector: (row) => row.storyPoints,
      width: "100px",
      sortable: true,
    },
  ];

  tableColumns.forEach((t) => {
    t.wrap = true;
  });

  return (
    <>
      {jiraData.length ? (
        <>
          <DataTable
            fixedHeaderScrollHeight="600px"
            highlightOnHover
            columns={tableColumns}
            data={jiraData}
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
          <Modal show={showModal} onHide={() => setShowModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>{selectedIssue?.issueKey}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ whiteSpace: "pre-line" }}>
              {selectedIssue?.description}
            </Modal.Body>
          </Modal>
        </>
      ) : (
        <>N/A</>
      )}
    </>
  );
}

function UserProfileJiraList({ jiraData }) {
  if (!jiraData || !jiraData.length) {
    return null;
  }
  const [listFilter, setListFilter] = useState("");
  const [filteredList, setFilteredList] = useState(jiraData);

  function setListFilterValue(filter) {
    setListFilter(filter);

    if (!filter) {
      setFilteredList(jiraData);
    } else {
      setFilteredList(
        jiraData.filter((d) =>
          new Date(d.createdAt).toISOString().includes(filter)
        )
      );
    }
  }

  function SearchFilter() {
    return useMemo(() => {
      const months = Array.from(
        new Set(jiraData.map((d) => d.createdAt.substring(0, 7)))
      );
      return (
        <InputGroup>
          <Dropdown>
            <Dropdown.Toggle variant="light" style={{ width: "150px" }}>
              {listFilter || "Select Month"}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              {months.map((month, index) => {
                return (
                  <Dropdown.Item
                    key={index}
                    onClick={() => setListFilterValue(month)}
                  >
                    {month}
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Menu>
          </Dropdown>

          <Button
            disabled={!listFilter}
            variant="light"
            onClick={() => setListFilterValue("")}
          >
            {listFilter ? "x" : " "}
          </Button>
        </InputGroup>
      );
    }, [jiraData]);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ padding: "15px", fontWeight: "600" }}>
          Items: {filteredList.length}
        </div>
        <div style={{ display: "inline-flex" }}>
          <div>
            <SearchFilter></SearchFilter>
          </div>
        </div>
      </div>

      <JiraList jiraData={filteredList} />
    </>
  );
}
export default UserProfileJiraList;
