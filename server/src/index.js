require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { getUserData } = require("./utils");
const { getPrData } = require("./github-api.service");

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

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
