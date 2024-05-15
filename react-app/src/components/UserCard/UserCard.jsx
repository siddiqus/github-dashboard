import { Button, Card, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getMonthsStringFromIssueList } from "../../services/utils";

export function UserCard({ userData }) {
  const allRepos = userData.allRepos.sort(); // default asc

  const months = getMonthsStringFromIssueList(userData.prList);

  const navigate = useNavigate();

  function goToUser(username) {
    navigate(`/users/${username}`);
  }

  return (
    <Card style={{ padding: "1em", marginBottom: "1em" }}>
      <div style={{ position: "relative" }}>
        <h4 style={{ marginTop: "10px", float: "left" }}>
          {userData.name} ({userData.username})
        </h4>
        <Button
          style={{ float: "right" }}
          onClick={() => goToUser(userData.username)}
        >
          Go to profile
        </Button>
      </div>

      <hr />
      <Table bordered hover>
        <thead>
          <tr>
            <th></th>
            {months.map((month, index) => (
              <th key={index} index={`month-${index}`}>
                {month}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total PR Count ({userData.totalPrCounts})</td>
            {months.map((month, index) => {
              const monthData = userData.statList.find(
                (s) => s.month === month
              );

              return <td key={index}>{monthData?.prCount || 0}</td>;
            })}
          </tr>

          {allRepos.map((repo, index) => {
            const countForRepo = Object.keys(
              userData.prCountsPerRepoPerMonth
            ).reduce((sum, month) => {
              const counts = userData.prCountsPerRepoPerMonth[month][repo] || 0;
              return sum + counts;
            }, 0);
            return (
              <tr key={index}>
                <td>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{repo} (
                  {countForRepo})
                </td>
                {months.map((month, index) => {
                  const countPerRepo = userData.prCountsPerRepoPerMonth[month]
                    ? userData.prCountsPerRepoPerMonth[month][repo] || 0
                    : 0;
                  return <td key={index}>{countPerRepo}</td>;
                })}
              </tr>
            );
          })}

          <tr>
            <td>PR Reviews</td>
            {Object.keys(userData.reviewCountsPerMonth).map((month, index) => {
              return (
                <td key={index}>{userData.reviewCountsPerMonth[month]}</td>
              );
            })}
          </tr>

          <tr>
            <td>Avg. PR Cycle Time (days)</td>
            {Object.keys(userData.averagePrCycleTimePerMonth).map(
              (month, index) => {
                return (
                  <td key={index}>
                    {userData.averagePrCycleTimePerMonth[month]}
                  </td>
                );
              }
            )}
          </tr>
        </tbody>
      </Table>
    </Card>
  );
}
