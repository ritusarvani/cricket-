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

// Registration endpoint
app.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;
    await setDoc(doc(firestore, "users", user.uid), {
      email: user.email,
      name: name
    });
    res.status(201).json({ message: "User registered", user: { uid: user.uid, email, name } });
  } catch (error) {
    console.error("Registration error:", error.code);
    res.status(400).json({
      error: error.code === "auth/email-already-in-use" ? "Email already in use" : "Registration failed"
    });
  }
});

// Login endpoint
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

// Cricket matches endpoint
app.get("/cricket/matches", async (req, res) => {
  const apiKey = process.env.CRICKET_API_KEY || 'YOUR_CRICKET_API_KEY';

  try {
    // Fetch current matches (live and recent)
    const currentMatches = await axios.get(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`);
    
    // Fetch upcoming matches
    const upcomingMatches = await axios.get(`https://api.cricapi.com/v1/matches?apikey=${apiKey}&offset=0`);
    
    // Process current matches
    const liveMatches = currentMatches.data.data.filter(match => 
      match.matchType === "ODI" || match.matchType === "T20" || match.matchType === "Test" || 
      match.matchType === "league" || match.name.includes("IPL") || match.name.includes("Indian Premier League")
    ).map(match => ({
      id: match.id,
      name: match.name,
      status: match.status,
      date: match.date,
      venue: match.venue,
      score: match.score ? match.score.map(team => `${team.inning}: ${team.r}/${team.w} (${team.o} ov)`).join(' | ') : 'Not started',
      teams: match.teams,
      teamInfo: match.teamInfo,
      matchType: match.matchType,
      series_id: match.series_id,
      isLive: match.status.includes("Live") || match.status.includes("In Progress")
    }));

    // Process upcoming matches
    const upcoming = upcomingMatches.data.data.filter(match => 
      (match.matchType === "ODI" || match.matchType === "T20" || match.matchType === "Test" || 
      match.matchType === "league" || match.name.includes("IPL") || match.name.includes("Indian Premier League")) &&
      match.status === "Match not started"
    ).map(match => ({
      id: match.id,
      name: match.name,
      status: match.status,
      date: match.date,
      venue: match.venue,
      teams: match.teams,
      teamInfo: match.teamInfo,
      matchType: match.matchType,
      series_id: match.series_id
    }));

    // Combine and format the data
    const allMatches = [
      ...liveMatches.map(m => ({ ...m, type: m.isLive ? 'live' : 'recent' })),
      ...upcoming.map(m => ({ ...m, type: 'upcoming' }))
    ];

    // Save to Firestore
    const batch = [];
    for (const match of allMatches) {
      const docRef = doc(collection(firestore, "matches"));
      batch.push(setDoc(docRef, match));
    }
    await Promise.all(batch);

    res.json({ success: true, data: allMatches });

  } catch (err) {
    console.error("Cricket API Error:", err.message);
    
    // Fallback data if API fails
    const fallbackData = [
      {
        id: "ipl-1",
        name: "IPL 2023 - Mumbai Indians vs Chennai Super Kings",
        status: "Match starts in 2 hours",
        date: new Date().toISOString(),
        venue: "Wankhede Stadium, Mumbai",
        teams: ["Mumbai Indians", "Chennai Super Kings"],
        matchType: "T20",
        type: "upcoming"
      },
      {
        id: "ipl-2",
        name: "IPL 2023 - Royal Challengers Bangalore vs Kolkata Knight Riders",
        status: "RCB 189/5 (20) vs KKR 120/8 (15.2)",
        date: new Date(Date.now() - 86400000).toISOString(),
        venue: "M. Chinnaswamy Stadium, Bangalore",
        teams: ["Royal Challengers Bangalore", "Kolkata Knight Riders"],
        matchType: "T20",
        type: "recent"
      }
    ];
    
    res.json({ success: true, data: fallbackData });
  }
});

// Player details endpoint
app.get("/cricket/players", async (req, res) => {
  const apiKey = process.env.CRICKET_API_KEY || 'YOUR_CRICKET_API_KEY';
  const { team } = req.query;

  try {
    const response = await axios.get(`https://api.cricapi.com/v1/players?apikey=${apiKey}&offset=0`);
    let players = response.data.data;

    if (team) {
      players = players.filter(player => 
        player.currentTeams && 
        player.currentTeams.some(t => t.toLowerCase().includes(team.toLowerCase()))
      );
    }

    res.json({ success: true, data: players });
  } catch (err) {
    console.error("Players API Error:", err.message);
    
    // Fallback data
    const fallbackPlayers = [
      {
        id: "player-1",
        name: "Virat Kohli",
        country: "India",
        currentTeams: ["Royal Challengers Bangalore", "India"],
        role: "Batsman",
        battingStyle: "Right-handed",
        bowlingStyle: "Right-arm medium"
      },
      {
        id: "player-2",
        name: "MS Dhoni",
        country: "India",
        currentTeams: ["Chennai Super Kings"],
        role: "Wicketkeeper-Batsman",
        battingStyle: "Right-handed",
        bowlingStyle: "Right-arm medium"
      }
    ];
    
    res.json({ success: true, data: team ? 
      fallbackPlayers.filter(p => p.currentTeams.some(t => t.toLowerCase().includes(team.toLowerCase()))) : 
      fallbackPlayers 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
