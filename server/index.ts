import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import { getBonusesByUserEmail } from "./bonusly";
import { fetchAllJiraIssues } from "./jira/jira-rest";

const app: any = express();

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  console.log(
    JSON.stringify({
      time: new Date().toISOString(),
      path: req.url,
      body: req.body,
      // query: req.query,
    })
  );
  next();
});

app.post("/jira/issue-search", async (req, res) => {
  const userEmails = req.body.userEmails;
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;

  if (!userEmails.length) {
    return res.status(400).json({
      message: "emails not provided",
    });
  }

  try {
    const issues = await fetchAllJiraIssues({
      userEmails,
      startDate,
      endDate,
    });

    return res.json({ issues });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error.message,
    });
  }
});

app.post("/bonusly/by-email", async (req, res) => {
  const email = req.body.email;
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;

  try {
    const data = await getBonusesByUserEmail(email, startDate, endDate);

    return res.json({ data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error.message,
    });
  }
});

const port = process.env.VITE_APP_BACKEND_PORT || 4089;
app.listen(port, () => {
  console.log(`backend is running on port ${port}`);
});
