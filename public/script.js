import { initializeApp } from "firebase/app";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBgCC0Odm5vHBDb3hESNd9v3nF3fBfORGw",
  authDomain: "cricket-auth-app.firebaseapp.com",
  projectId: "cricket-auth-app",
  storageBucket: "cricket-auth-app.appspot.com",
  messagingSenderId: "759240201993",
  appId: "1:759240201993:web:1c9727c9378d3b2116e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
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
      matchDiv.innerHTML = "Loading matches...";
      try {
        const res = await fetch("/cricket/matches");
        const data = await res.json();

        if (data.success && data.data.length > 0) {
          matchDiv.innerHTML = data.data.map(m => `
            <div class="match-card">
              <strong>${m.name}</strong><br/>
              <em>${m.date}</em><br/>
              <span>${m.status}</span><br/>
              ${m.score ? <p>${m.score}</p> : ""}
              <hr/>
            </div>
          `).join("");
        } else {
          matchDiv.innerHTML = "<p>No match data available.</p>";
        }
      } catch (err) {
        console.error("Error:", err);
        matchDiv.innerHTML = "<p>Error fetching match data.</p>";
      }
    });

    logoutBtn?.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "/login.html";
    });
  }

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

      const result = await res.json();
      if (res.ok) {
        alert("Registered successfully");
        window.location.href = "/login.html";
      } else {
        alert(result.error || "Registration failed");
      }
    } catch {
      alert("Registration failed due to server error");
    }
  });

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

      const result = await res.json();
      if (res.ok) {
        alert("Login successful");
        window.location.href = "/home.html";
      } else {
        alert(result.error || "Login failed");
      }
    } catch {
      alert("Login failed due to server error");
    }
  });
});
