require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static("."));

/* ── Health check ── */
app.get("/api/status", (req, res) => {
  res.json({ ok: true, configured: Boolean(API_KEY) });
});

/* ── Claude proxy ── */
app.post("/api/chat", async (req, res) => {
  if (!API_KEY) {
    return res.status(503).json({
      error: { message: "Server is not configured. Add ANTHROPIC_API_KEY to .env" }
    });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(req.body)
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: { message: `Proxy error: ${err.message}` } });
  }
});

app.listen(PORT, () => {
  console.log(`\nAFS Sales Intelligence`);
  console.log(`Running at http://localhost:${PORT}`);
  console.log(`Open sales-agent.html in your browser\n`);
});
