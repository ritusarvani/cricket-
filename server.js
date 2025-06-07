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
const { getDatabase, ref, set } = require("firebase/database");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;
    await set(ref(db, "users/" + user.uid), { email: user.email });
    res.status(201).json({ message: "User registered", user: { uid: user.uid, email } });
  } catch (error) {
    console.error("Registration error:", error.code);
    res.status(400).json({
      error: error.code === "auth/email-already-in-use" ? "Email already in use" : "Registration failed"
    });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const user = userCred.user;
    res.json({ message: "Login success", user: { uid: user.uid, email } });
  } catch (error) {
    console.error("Login error:", error.code);
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.get("/cricket/live", async (req, res) => {
  const apiKey = process.env.CRICKET_API_KEY;
  const url = `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`;
  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    console.error("Cricket API error:", err.message);
    res.status(500).json({ error: "Failed to fetch cricket data" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
