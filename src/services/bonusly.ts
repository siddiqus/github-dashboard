import axios from "axios";
import dbStore from "./idb";
import { getFromCache } from "./utils";

const backendBaseUrl = import.meta.env.VITE_APP_BACKEND_URL as string;
const backendPort = import.meta.env.VITE_APP_BACKEND_PORT;
const baseUrl = `${backendBaseUrl.replace(/\/+$/, "")}:${backendPort}`;

const client = axios.create({
  baseURL: `${baseUrl}/bonusly`,
  headers: {
    "Content-Type": "application/json",
  },
});

interface BonuslyData {
  email: string;
  created_at: string;
  amount: number;
  reason_decoded: string;
  reason_html: string;
  giver: {
    id: string;
    full_name: string;
    email: string;
  };
}

async function getBonusesByUserEmail(
  email: string,
  startDate: string,
  endDate: string
) {
  const response = await client.post("/by-email", {
    email,
    startDate,
    endDate,
  });
  return response.data.data as BonuslyData[];
}

export async function resetBonuslyCache({
  startDate,
  endDate,
  userEmails,
}: {
  startDate: string;
  endDate: string;
  userEmails: string[];
}) {
  for (const email of userEmails) {
    const cacheKey = `bonusly-data-${email.toLowerCase()}-${startDate}-${endDate}`;
    await dbStore.unsetData(cacheKey);
  }
}

export async function getBonuslyDataCached(
  emails: string[],
  startDate: string,
  endDate: string
): Promise<{
  [email: string]: BonuslyData[];
}> {
  const startDateStr =
    new Date(startDate).toISOString().split("T")[0] + "T00:00:00.000Z";
  const endDateStr =
    new Date(endDate).toISOString().split("T")[0] + "T23:59:59.999Z";

  const results: BonuslyData[][] = await Promise.all(
    emails.map((email) => {
      return getFromCache({
        getCacheKey: () =>
          `bonusly-data-${email.toLowerCase()}-${startDate}-${startDate}`,
        fn: () => getBonusesByUserEmail(email, startDateStr, endDateStr),
      });
    })
  );

  const resultMap: { [email: string]: BonuslyData[] } = {};
  results.forEach((data) => {
    const email = data[0]?.email;
    if (email) {
      resultMap[email.toLowerCase()] = data;
    }
  });

  return resultMap;
}
