"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function Timer() {
  const { user } = useAuth();
  
  const [isRunning, setIsRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // in seconds
  const [subject, setSubject] = useState("");
  const [interruptions, setInterruptions] = useState(0);
  
  const [focusScore, setFocusScore] = useState(100);
  
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  // Calculate focus score dynamically
  useEffect(() => {
    // Basic algorithm: Start at 100.
    // Every interruption costs 5 points.
    // Every 10 minutes of pure focus adds 1 point (up to max 100).
    const penalty = interruptions * 5;
    const bonus = Math.floor(timeElapsed / 600); 
    const score = Math.max(0, Math.min(100, 100 - penalty + bonus));
    setFocusScore(score);
  }, [timeElapsed, interruptions]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    if (isRunning) {
      setIsRunning(false);
      setInterruptions((prev) => prev + 1);
    }
  };

  const handleEndSession = async () => {
    setIsRunning(false);
    clearInterval(timerRef.current);
    
    if (timeElapsed < 60) {
      alert("Session too short to record.");
      resetTimer();
      return;
    }

    if (!user) {
      alert("You must be signed in to save sessions.");
      return;
    }

    try {
      await addDoc(collection(db, "sessions"), {
        userId: user.uid,
        subject: subject || "Uncategorized",
        durationMinutes: Math.round(timeElapsed / 60),
        interruptions,
        focusScore,
        createdAt: new Date(),
      });
      alert("Session saved!");
      resetTimer();
    } catch (error) {
      console.error("Error saving session", error);
      alert("Failed to save session. Make sure your Firebase is configured.");
    }
  };

  const resetTimer = () => {
    setTimeElapsed(0);
    setInterruptions(0);
    setSubject("");
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

      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        {!isRunning ? (
          <button className="btn-primary" onClick={handleStart} style={{ padding: "1rem 2.5rem", fontSize: "1.2rem" }}>
            Start Focus
          </button>
        ) : (
          <button className="btn-secondary" onClick={handlePause} style={{ padding: "1rem 2.5rem", fontSize: "1.2rem", borderColor: "rgba(239, 68, 68, 0.5)", color: "#ef4444" }}>
            Pause
          </button>
        )}
        
        {timeElapsed > 0 && !isRunning && (
          <button className="btn-secondary" onClick={handleEndSession} style={{ padding: "1rem 2rem" }}>
            End & Save
          </button>
        )}
      </div>
    </div>
  );
}
