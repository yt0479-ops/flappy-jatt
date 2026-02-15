require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const admin = require("firebase-admin");

const app = express();
const PORT = 3000;

/* ===============================
   FIREBASE ADMIN SETUP
================================= */

// Download serviceAccountKey.json from Firebase console
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/* ===============================
   DATABASE
================================= */

mongoose.connect("mongodb://127.0.0.1:27017/flappyLakshendraDB");

const scoreSchema = new mongoose.Schema({
  uid: String,
  name: String,
  score: Number,
  date: { type: Date, default: Date.now }
});

const Score = mongoose.model("Score", scoreSchema);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   VERIFY FIREBASE TOKEN
================================= */

async function authenticateFirebase(req, res, next) {
  const header = req.headers.authorization;

  if (!header) return res.sendStatus(401);

  const token = header.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.sendStatus(403);
  }
}

/* ===============================
   SAVE SCORE (PROTECTED)
================================= */

app.post("/save-score", authenticateFirebase, async (req, res) => {

  const newScore = await Score.create({
    uid: req.user.uid,
    name: req.user.name || req.user.email,
    score: req.body.score
  });

  res.json({ message: "Score saved" });
});

/* ===============================
   LEADERBOARD
================================= */

app.get("/leaderboard", async (req, res) => {

  const top = await Score.aggregate([
    {
      $group: {
        _id: "$uid",
        name: { $first: "$name" },
        maxScore: { $max: "$score" }
      }
    },
    { $sort: { maxScore: -1 } },
    { $limit: 10 }
  ]);

  res.json(top);
});

/* ===============================
   SERVER
================================= */

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
