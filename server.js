// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");

const { initializeApp } = require("firebase/app");
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} = require("firebase/auth");

const {
  getFirestore,
  doc,
  setDoc,
  collection
} = require("firebase/firestore");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// User Registration
app.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;
    await setDoc(doc(firestore, "users", user.uid), { email: user.email, name });
    res.status(201).json({ message: "User registered", user: { uid: user.uid, email, name } });
  } catch (error) {
    res.status(400).json({
      error: error.code === "auth/email-already-in-use" ? "Email already in use" : "Registration failed"
    });
  }
});

// User Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const user = userCred.user;
    res.json({ message: "Login success", user: { uid: user.uid, email } });
  } catch {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Cricket Match Data
app.get("/cricket/matches", async (req, res) => {
  const apiKey = process.env.CRICKET_API_KEY || "YOUR_CRICKET_API_KEY";

  try {
    const current = await axios.get(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`);
    const upcoming = await axios.get(`https://api.cricapi.com/v1/matches?apikey=${apiKey}&offset=0`);

    const live = current.data.data.filter(m => m.matchType && ["T20", "ODI", "Test", "league"].includes(m.matchType))
      .map(m => ({
        id: m.id,
        name: m.name,
        date: m.date,
        status: m.status,
        score: m.score ? m.score.map(s => `${s.inning}: ${s.r}/${s.w} (${s.o} ov)`).join(" | ") : "Not started",
        teams: m.teams,
        venue: m.venue,
        type: m.status.includes("Live") ? "live" : "recent"
      }));

    const future = upcoming.data.data.filter(m => m.status === "Match not started")
      .map(m => ({
        id: m.id,
        name: m.name,
        date: m.date,
        status: m.status,
        teams: m.teams,
        venue: m.venue,
        type: "upcoming"
      }));

    const all = [...live, ...future];

    const batch = [];
    for (const match of all) {
      const docRef = doc(collection(firestore, "matches"));
      batch.push(setDoc(docRef, match));
    }
    await Promise.all(batch);

    res.json({ success: true, data: all });

  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// Player Info
app.get("/cricket/players", async (req, res) => {
  const apiKey = process.env.CRICKET_API_KEY || "YOUR_CRICKET_API_KEY";
  const { team } = req.query;

  try {
    const response = await axios.get(`https://api.cricapi.com/v1/players?apikey=${apiKey}&offset=0`);
    let players = response.data.data;

    if (team) {
      players = players.filter(p =>
        p.currentTeams && p.currentTeams.some(t => t.toLowerCase().includes(team.toLowerCase()))
      );
    }

    res.json({ success: true, data: players });
  } catch {
    res.json({ success: true, data: [] });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
