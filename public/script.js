import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc } from "firebase/firestore";

// Firebase config (Use values from your .env or hardcode here if not using a bundler like Vite/Webpack)
const firebaseConfig = {
  apiKey: "AIzaSyBgCC0Odm5vHBDb3hESNd9v3nF3fBfORGw",
  authDomain: "cricket-auth-app.firebaseapp.com",
  projectId: "cricket-auth-app",
  storageBucket: "cricket-auth-app.appspot.com",
  messagingSenderId: "759240201993",
  appId: "1:759240201993:web:1c9727c9378d3b2116e"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  // Home Page Auth Check
  if (window.location.pathname.includes("home")) {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "/login.html";
      }
    });

    const matchBtn = document.getElementById("getMatchesBtn");
    const matchDiv = document.getElementById("matchData");
    const logoutBtn = document.getElementById("logoutBtn");

    matchBtn?.addEventListener("click", async () => {
      try {
        const res = await fetch("/cricket/live");
        const data = await res.json();

        if (data && data.data && data.data.length > 0) {
          matchDiv.innerHTML = data.data
            .map((m) => `
              <div class="match-card">
                <strong>${m.name}</strong><br/>
                Status: ${m.status}<br/>
                ${m.date}
              </div>
            `).join("");

          // OPTIONAL: Save to Firestore
          for (let match of data.data) {
            await addDoc(collection(db, "matches"), {
              name: match.name,
              status: match.status,
              date: match.date
            });
          }

        } else {
          matchDiv.innerHTML = "<p>No matches found.</p>";
        }
      } catch (err) {
        console.error("Fetch error:", err);
        matchDiv.innerHTML = "<p>Error loading matches.</p>";
      }
    });

    logoutBtn?.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "/login.html";
    });
  }

  // Register Page
  const registerForm = document.getElementById("registerForm");
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = registerForm.registerEmail.value;
    const password = registerForm.registerPassword.value;

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        alert("Registered successfully");
        window.location.href = "/login.html";
      } else {
        const data = await res.json();
        alert(data.error || "Registration failed");
      }
    } catch {
      alert("Something went wrong");
    }
  });

  // Login Page
  const loginForm = document.getElementById("loginForm");
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.loginEmail.value;
    const password = loginForm.loginPassword.value;

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        alert("Logged in!");
        window.location.href = "/home.html";
      } else {
        const data = await res.json();
        alert(data.error || "Login failed");
      }
    } catch {
      alert("Something went wrong");
    }
  });
});
