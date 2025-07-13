const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Storage for images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Ensure folders exist
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("data")) fs.mkdirSync("data");
if (!fs.existsSync("data/approved.json")) fs.writeFileSync("data/approved.json", "[]");
if (!fs.existsSync("data/pending.json")) fs.writeFileSync("data/pending.json", "[]");

// Get approved data
app.get("/api/approved", (req, res) => {
  const data = JSON.parse(fs.readFileSync("data/approved.json"));
  res.json(data);
});

// Submit new data (picture + text)
app.post("/api/submit", upload.single("image"), (req, res) => {
  const { text } = req.body;
  const imgUrl = "/uploads/" + req.file.filename;
  const pending = JSON.parse(fs.readFileSync("data/pending.json"));
  pending.push({ text, imgUrl, id: Date.now() });
  fs.writeFileSync("data/pending.json", JSON.stringify(pending, null, 2));
  res.json({ success: true });
});

// --- ADMIN: Approve a submission (move from pending to approved)
app.post("/api/admin/approve", express.json(), (req, res) => {
  const { id } = req.body;
  let pending = JSON.parse(fs.readFileSync("data/pending.json"));
  let approved = JSON.parse(fs.readFileSync("data/approved.json"));
  const idx = pending.findIndex((item) => item.id === id);
  if (idx !== -1) {
    approved.push(pending[idx]);
    pending.splice(idx, 1);
    fs.writeFileSync("data/pending.json", JSON.stringify(pending, null, 2));
    fs.writeFileSync("data/approved.json", JSON.stringify(approved, null, 2));
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Not found" });
  }
});

// --- ADMIN: List pending submissions
app.get("/api/admin/pending", (req, res) => {
  const data = JSON.parse(fs.readFileSync("data/pending.json"));
  res.json(data);
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));