// https://jira.sso.episerver.net/browse/APP-43

import { useMemo, useState } from "react";
import {
  Button,
  Col,
  Dropdown,
  InputGroup,
  Modal,
  Row,
  Card,
  Table,
} from "react-bootstrap";
import DataTable from "react-data-table-component";

function JiraList({ jiraData }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  jiraData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const tableColumns = [
    {
      name: "Issue Key",
      selector: (row) => (
        <>
          <a
            target="_blank"
            href={`https://jira.sso.episerver.net/browse/${row.issueKey}`}
          >
            {row.issueKey}
          </a>
          &nbsp; ({row.issueType})
        </>
      ),
      width: "15%",
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
      width: "42%",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row) => row.status,
      width: "10%",
      sortable: true,
      filterable: true,
    },
    {
      name: "Created",
      selector: (row) => new Date(row.createdAt),
      format: (row) => new Date(row.createdAt).toDateString(),
      sortable: true,
      width: "12%",
    },
    {
      name: "Resolved",
      selector: (row) => (row.resolvedAt ? new Date(row.resolvedAt) : null),
      format: (row) =>
        row.resolvedAt ? new Date(row.resolvedAt).toDateString() : "-",
      sortable: true,
      width: "12%",
    },
    {
      name: "Points",
      selector: (row) => row.storyPoints,
      width: "8%",
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
  const [statusFilter, setStatusFilter] = useState("");
  const [filteredList, setFilteredList] = useState(jiraData);

  function setListFilterValue(filter) {
    setListFilter(filter);
    applyFilters(filter, statusFilter);
  }

  function setStatusFilterValue(filter) {
    setStatusFilter(filter);
    applyFilters(listFilter, filter);
  }

  function applyFilters(monthFilter, status) {
    let filtered = jiraData;

    if (monthFilter) {
      filtered = filtered.filter((d) =>
        new Date(d.createdAt).toISOString().includes(monthFilter)
      );
    }

    if (status) {
      filtered = filtered.filter((d) => d.status === status);
    }

    setFilteredList(filtered);
  }

  function SearchFilter() {
    return useMemo(() => {
      const months = Array.from(
        new Set(jiraData.map((d) => d.createdAt.substring(0, 7)))
      );
      const statuses = Array.from(new Set(jiraData.map((d) => d.status)));

      return (
        <InputGroup>
          <Dropdown>
            <Dropdown.Toggle variant="light" style={{ width: "150px" }}>
              {listFilter || "Select Month"}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              {months.map((month, index) => (
                <Dropdown.Item
                  key={index}
                  onClick={() => setListFilterValue(month)}
                >
                  {month}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          <Button
            disabled={!listFilter}
            variant="light"
            onClick={() => setListFilterValue("")}
          >
            {listFilter ? "x" : " "}
          </Button>

          <Dropdown style={{ marginLeft: "10px" }}>
            <Dropdown.Toggle variant="light" style={{ width: "150px" }}>
              {statusFilter || "Select Status"}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              {statuses.map((status, index) => (
                <Dropdown.Item
                  key={index}
                  onClick={() => setStatusFilterValue(status)}
                >
                  {status}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          <Button
            disabled={!statusFilter}
            variant="light"
            onClick={() => setStatusFilterValue("")}
          >
            {statusFilter ? "x" : " "}
          </Button>
        </InputGroup>
      );
    }, [jiraData, listFilter, statusFilter]);
  }

  function JiraStats() {
    const monthlyStats = useMemo(() => {
      // Group issues by month
      const monthlyData = jiraData.reduce((acc, issue) => {
        const month = issue.createdAt.substring(0, 7); // YYYY-MM format
        if (!acc[month]) {
          acc[month] = {
            issues: [],
            bugs: 0,
            tasks: 0,
            storyPoints: 0,
            resolved: 0,
            avgResolutionDays: 0,
          };
        }

        // Count by type
        if (issue.issueType === "Bug") {
          acc[month].bugs++;
        } else {
          acc[month].tasks++;
        }

        // Count story points for completed issues
        if (issue.status === "Done") {
          acc[month].storyPoints += issue.storyPoints || 0;
        }

        // Count resolved issues and calculate resolution time
        if (issue.resolvedAt) {
          acc[month].resolved++;
          const resolutionTime =
            (new Date(issue.resolvedAt) - new Date(issue.createdAt)) /
            (1000 * 60 * 60 * 24);
          acc[month].avgResolutionDays += resolutionTime;
        }

        acc[month].issues.push(issue);
        return acc;
      }, {});

      // Calculate averages and format data
      Object.keys(monthlyData).forEach((month) => {
        const monthData = monthlyData[month];
        if (monthData.resolved > 0) {
          monthData.avgResolutionDays = (
            monthData.avgResolutionDays / monthData.resolved
          ).toFixed(1);
        }
      });

      return monthlyData;
    }, [jiraData]);

    return (
      <>
        <Card className="mb-3">
          <Card.Header>Monthly Performance Metrics</Card.Header>
          <Card.Body>
            <Table bordered size="sm">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Total</th>
                  <th>Bugs</th>
                  <th>Tasks</th>
                  <th>Story Points</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(monthlyStats)
                  .sort((a, b) => a[0].localeCompare(b[0])) // Sort by month descending
                  .map(([month, stats]) => (
                    <tr key={month}>
                      <td>{month}</td>
                      <td>{stats.issues.length}</td>
                      <td>{stats.bugs}</td>
                      <td>{stats.tasks}</td>
                      <td>{stats.storyPoints}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>

        <Card className="mb-3">
          <Card.Header>Current Month Breakdown</Card.Header>
          <Card.Body>
            <Table bordered size="sm">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Total Issues</th>
                  <th>Bug Ratio</th>

                  <th>Story Points</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(monthlyStats)
                  .sort((a, b) => a[0].localeCompare(b[0])) // Sort by month descending
                  .map(([month, stats]) => (
                    <tr key={month}>
                      <td>{month}</td>
                      <td>{stats.issues.length}</td>
                      <td>
                        {stats.issues.length
                          ? ((stats.bugs / stats.issues.length) * 100).toFixed(
                              1
                            )
                          : 0}
                        %
                      </td>
                      <td>{stats.storyPoints}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </>
    );
  }

  return (
    <>
      <Row>
        <Col lg={8}>
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
        </Col>
        <Col lg={4}>
          <JiraStats />
        </Col>
      </Row>
    </>
  );
}
export default UserProfileJiraList;
