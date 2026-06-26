"use client";

import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export default function Auth() {
  const { user, loading } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "1rem", opacity: 0.5 }}>Loading...</div>;

  if (user) {
    return (
      <div style={{
        backgroundColor: "var(--card-bg)",
        padding: "1rem 1.5rem",
        borderRadius: "12px",
        border: "1px solid var(--border-color)",
        marginBottom: "2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt="Profile" 
              style={{ width: "48px", height: "48px", borderRadius: "50%", border: "2px solid var(--accent-color)" }}
            />
          ) : (
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--accent-color)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg-color)", fontWeight: "bold", fontSize: "1.2rem" }}>
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
            </div>
          )}
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: "600", color: "var(--text-color)", fontSize: "1.1rem" }}>{user.displayName}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-color)", opacity: 0.6 }}>{user.email}</div>
          </div>
        </div>
        
        <button 
          onClick={handleSignOut}
          style={{
            backgroundColor: "transparent",
            color: "var(--text-color)",
            opacity: 0.7,
            border: "1px solid var(--border-color)",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.9rem",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.borderColor = "var(--text-color)"; }}
          onMouseOut={(e) => { e.currentTarget.style.opacity = 0.7; e.currentTarget.style.borderColor = "var(--border-color)"; }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: "var(--card-bg)",
      padding: "2.5rem 2rem",
      borderRadius: "16px",
      border: "1px solid var(--border-color)",
      marginBottom: "2rem",
      textAlign: "center",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
    }}>
      <h2 style={{ fontSize: "1.8rem", fontWeight: "300", marginBottom: "0.5rem", color: "var(--text-color)" }}>
        Quantified Scholar
      </h2>
      <p style={{ color: "var(--text-color)", opacity: 0.7, marginBottom: "2rem", fontSize: "1rem" }}>
        Data-driven focus tracking to protect your momentum.
      </p>
      
      <button 
        onClick={handleSignIn}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          width: "100%",
          maxWidth: "300px",
          margin: "0 auto",
          padding: "0.8rem 1.5rem",
          backgroundColor: "#ffffff",
          color: "#000000",
          border: "none",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: "500",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          transition: "transform 0.1s ease, boxShadow 0.1s ease"
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
        onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
          </g>
        </svg>
        Sign In with Google
      </button>
    </div>
  );
}
