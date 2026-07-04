"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTimer } from "../context/TimerContext";
import { db } from "../lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export default function Timer() {
  const { user } = useAuth();
  const {
    isRunning,
    timeElapsed,
    subject,
    setSubject,
    interruptions,
    focusScore,
    handleStart,
    handlePause,
    resetTimer,
    setIsRunning,
  } = useTimer();

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const handleEndSession = () => {
    setIsRunning(false);

    if (!user) {
      setSaveMessage("⚠ Sign in to save sessions.");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    if (timeElapsed < 5) {
      setSaveMessage("Session too short to record.");
      setTimeout(() => { setSaveMessage(""); resetTimer(); }, 2000);
      return;
    }

    setSaving(true);
    setSaveMessage("");

    // Fire-and-forget: Firestore persistence saves locally INSTANTLY,
    // then syncs to the server in the background. No need to await.
    addDoc(collection(db, "sessions"), {
      userId: user.uid,
      subject: subject || "Uncategorized",
      durationMinutes: Math.max(1, Math.round(timeElapsed / 60)),
      interruptions,
      focusScore,
      createdAt: Timestamp.now(),
    }).catch(err => console.error("Background sync error:", err));

    setSaving(false);
    setSaveMessage("✓ Session saved!");
    setTimeout(() => {
      setSaveMessage("");
      resetTimer();
    }, 1200);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="zen-container glass-card" style={{ textAlign: "center", marginTop: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <input 
          type="text" 
          placeholder="What are you studying?" 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isRunning}
          className="glass-input"
          style={{ textAlign: "center", fontSize: "1.2rem", padding: "1rem" }}
        />
      </div>

      <div 
        className={isRunning ? "timer-active" : ""}
        style={{
          fontSize: "6.5rem",
          fontWeight: "800",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-3px",
          marginBottom: "1rem",
          transition: "all 0.3s ease",
          color: isRunning ? "transparent" : "var(--text-color)"
        }}>
        {formatTime(timeElapsed)}
      </div>

      <div style={{ marginBottom: "2.5rem", fontWeight: "600", fontSize: "1.1rem" }}>
        <span className="gradient-text">Focus Score: {focusScore}%</span> 
        <span style={{ color: "var(--text-muted)", margin: "0 0.5rem" }}>|</span> 
        <span style={{ color: "var(--text-muted)" }}>Interruptions: {interruptions}</span>
      </div>

      {/* Save status message */}
      {saveMessage && (
        <div style={{
          marginBottom: "1.5rem",
          padding: "0.8rem 1rem",
          borderRadius: "10px",
          fontSize: "0.95rem",
          fontWeight: "600",
          background: saveMessage.startsWith("✓") ? "rgba(16, 185, 129, 0.15)" : saveMessage.startsWith("✗") ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.05)",
          color: saveMessage.startsWith("✓") ? "#10b981" : saveMessage.startsWith("✗") ? "#ef4444" : "var(--text-muted)",
          border: `1px solid ${saveMessage.startsWith("✓") ? "rgba(16, 185, 129, 0.3)" : saveMessage.startsWith("✗") ? "rgba(239, 68, 68, 0.3)" : "var(--glass-border)"}`,
          transition: "all 0.3s ease",
        }}>
          {saveMessage}
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        {!isRunning ? (
          <button className="btn-primary" onClick={handleStart} style={{ padding: "1rem 2.5rem", fontSize: "1.2rem" }}>
            {timeElapsed > 0 ? "Resume" : "Start Focus"}
          </button>
        ) : (
          <button className="btn-secondary" onClick={handlePause} style={{ padding: "1rem 2.5rem", fontSize: "1.2rem", borderColor: "rgba(239, 68, 68, 0.5)", color: "#ef4444" }}>
            Pause
          </button>
        )}
        
        {timeElapsed > 0 && !isRunning && (
          <button 
            className="btn-secondary" 
            onClick={handleEndSession} 
            disabled={saving}
            style={{ padding: "1rem 2rem", opacity: saving ? 0.5 : 1 }}>
            {saving ? "Saving..." : "End & Save"}
          </button>
        )}
      </div>
    </div>
  );
}
