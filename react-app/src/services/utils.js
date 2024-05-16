export function formatDate(theDate) {
  const date = new Date(theDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getMonthsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const months = [];

  let current = start;

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

export function daysDifference(dateFrom, dateTo) {
  // Convert dates to milliseconds
  const date1_ms = new Date(dateFrom).getTime();
  const date2_ms = new Date(dateTo).getTime();

  // Calculate the difference in milliseconds
  const difference_ms = Math.abs(date2_ms - date1_ms);

  // Convert the difference from milliseconds to days
  const difference_days = Math.ceil(difference_ms / (1000 * 60 * 60 * 24));

  return difference_days;
}

export function getMonthsStringFromIssueList(prList) {
  const sorted = [...prList].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  const first = sorted[0].created_at;
  const last = sorted[sorted.length - 1].created_at;

  return getMonthsBetween(first, last);
}
