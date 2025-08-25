import dotenv from "dotenv";
dotenv.config();

import _ from "lodash";

const token = process.env.VITE_APP_BONUSLY_API_TOKEN;

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
    profile_pic_url: string;
  };
  receivers: Array<{
    email: string;
  }>;
}

export async function getBonusesByUserEmail(
  email: string,
  startDate: string,
  endDate: string
) {
  const response = await fetch(
    `https://bonus.ly/api/v1/bonuses?receiver_email=${email}&limit=50&start_date=${startDate}&end_date=${endDate}&access_token=${token}`
  );
  const data: {
    success: boolean;
    result: BonuslyData[];
    message?: string;
  } = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to fetch Bonusly data");
  }

  return data.result
    .filter((item) => {
      return !item.giver.email.toLowerCase().includes("bot+");
    })
    .map((item) => {
      const data = _.omit(item, ["receivers"]);
      return {
        ...data,
        email: item.receivers[0].email,
      };
    });
}
