import { dbStore } from "./idb";

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

  const months: string[] = [];

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
  const difference_days = difference_ms / (1000 * 60 * 60 * 24);

  return +difference_days.toFixed(2);
}

export function getMonthsStringFromIssueList(prList) {
  if (!prList || !prList.length) {
    return [];
  }
  const sorted = [...prList].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const first = sorted[0].created_at;
  const last = sorted[sorted.length - 1].created_at;

  return getMonthsBetween(first, last);
}

export async function getFromCache<D>(params: {
  getCacheKey: () => string;
  fn: () => Promise<D>;
}): Promise<D> {
  const cacheKey = params.getCacheKey();

  const cachedData = await dbStore.getData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const data = await params.fn();

  await dbStore.setData(cacheKey, data);

  return data;
}

export async function getUsersFromStore() {
  const results = await dbStore.getData('gh-stats-user-list');
  return JSON.parse(results) || []
}

export async function getTeamsFromStore() {
  const results = await dbStore.getData('gh-stats-teams-list');
  return JSON.parse(results) || []
}

export async function addUserToStore(user) {
  const users = await getUsersFromStore();
  if (!users) {
    await dbStore.setData('gh-stats-user-list', JSON.stringify([user]));
  } else {
    await dbStore.setData('gh-stats-user-list', JSON.stringify([...users, user]));
  }
}

export async function deleteUserFromStore(email: string) {
  const users = await getUsersFromStore();
  const updatedUsers = users.filter(user => user.email !== email);
  await dbStore.setData('gh-stats-user-list', JSON.stringify(updatedUsers));
}

export async function updateUserInStore(user) {
  const users = await getUsersFromStore();
  const userIndex = users.findIndex(u => u.email === user.email);
  users[userIndex] = user
  await dbStore.setData('gh-stats-user-list', JSON.stringify(users));
}

export async function setTeamsInStore(teams) {
  await dbStore.setData('gh-stats-teams-list', JSON.stringify(teams));
}

export async function setUsersInStore(users) {
  await dbStore.setData('gh-stats-user-list', JSON.stringify(users));
}

export async function addTeamToStore(team) {
  const teams = await getTeamsFromStore();
  if (!teams) {
    await dbStore.setData('gh-stats-teams-list', JSON.stringify([team]));
  } else {
    await dbStore.setData('gh-stats-teams-list', JSON.stringify([...teams, team]));
  }
}

export async function updateTeamInStore(team) {
  const teams = await getTeamsFromStore();
  const teamIndex = teams.findIndex(t => t.id === team.id);
  teams[teamIndex] = team;
  await dbStore.setData('gh-stats-teams-list', JSON.stringify(teams));
}

export async function deleteTeamFromStore(teamId: string) {
  const teams = await getTeamsFromStore();
  const updatedTeams = teams.filter(team => team.id !== teamId);
  await dbStore.setData('gh-stats-teams-list', JSON.stringify(updatedTeams));
}