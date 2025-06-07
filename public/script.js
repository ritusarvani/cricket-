import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  // 🔒 Auth Check on home page
  if (window.location.pathname.includes("home")) {
    auth.onAuthStateChanged(async (user) => {
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
        if (data && data.data) {
          matchDiv.innerHTML = data.data
            .map(
              (m) => `
              <div class="match-card">
                <strong>${m.name}</strong><br/>
                Status: ${m.status}<br/>
                ${m.date}
              </div>
            `
            )
            .join("");
        } else {
          matchDiv.innerHTML = "<p>No matches found.</p>";
        }
      } catch (err) {
        console.error(err);
        matchDiv.innerHTML = "<p>Error loading matches.</p>";
      }
    });

    logoutBtn?.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "/login.html";
    });
  }

  // ✍️ Register
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

  // 🔐 Login
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
