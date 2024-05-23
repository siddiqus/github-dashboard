require("dotenv").config();

const express = require("express");
const cors = require("cors");

const {
  getUserData,
  getPrData,
  removeUserDataCache,
  removePrCache,
} = require("./utils");

const app = express();

app.use(express.json());
app.use(cors());

const port = process.env.PORT || 9987;

// Define a route for a GET request
app.get("/", (req, res) => {
  res.json({
    health: "check",
  });
});

app.get("/data", async (req, res) => {
  try {
    const { author, startDate, endDate } = req.query;
    console.log(
      new Date(),
      "/data",
      JSON.stringify({ author, startDate, endDate })
    );
    const result = await getUserData({
      author,
      startDate,
      endDate,
      organization: "newscred",
    });
    res.json({
      data: result,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: null,
      error: error.message,
    });
  }
});

app.post("/get-prs", async (req, res) => {
  try {
    const prs = req.body.prs; // Array<{ repo: string; pullNumber: number; owner: string }>

    console.log(new Date(), "/get-prs", JSON.stringify({ prs: prs.length }));

    if (!prs || !prs.length) {
      return [];
    }

    const results = await Promise.all(
      prs.map((p) =>
        getPrData({
          owner: p.owner,
          pullNumber: p.pullNumber,
          repo: p.repo,
        })
      )
    );

    res.json({
      data: results,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: null,
      error: error.message,
    });
  }
});

app.post("/reset-user-data-cache", async (req, res) => {
  try {
    const data = req.body;
    console.log(new Date(), "/reset-user-data-cache", JSON.stringify(data));

    for (const d of data) {
      const { author, startDate, endDate } = d;
      removeUserDataCache({
        author,
        startDate,
        endDate,
        organization: "newscred",
      });
    }

    res.json({
      data: {
        success: "ok",
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: null,
      error: error.message,
    });
  }
});

app.post("/reset-pr-cache", async (req, res) => {
  try {
    const data = req.body.prs;
    console.log(new Date(), "/reset-pr-cache", JSON.stringify(data));

    for (const d of data) {
      const { owner, repo, pullNumber } = d;
      removePrCache({
        owner,
        pullNumber,
        repo,
      });
    }

    res.json({
      data: {
        success: "ok",
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: null,
      error: error.message,
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
