const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");

const app = express();

// Middleware
app.use(bodyParser.json());

// Serve static frontend from /public
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// Root route: send index.html from /public if it exists
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Dummy /unlock API (adjust later if needed)
app.post("/unlock", async (req, res) => {
  try {
    const { summary, full, to } = req.body;

    return res.json({
      success: true,
      echo: { summary, full, to },
    });
  } catch (err) {
    console.error("/unlock route error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Use Render's assigned PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Aurascope server running on port ${PORT}`);
});
