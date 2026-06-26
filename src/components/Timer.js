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
    <div className="zen-container" style={{ textAlign: "center", marginTop: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <input 
          type="text" 
          placeholder="What are you studying?" 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isRunning}
          style={{
            padding: "0.8rem",
            fontSize: "1.2rem",
            width: "100%",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--card-bg)",
            color: "var(--text-color)",
            textAlign: "center"
          }}
        />
      </div>

      <div style={{
        fontSize: "6rem",
        fontWeight: "200",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-2px",
        marginBottom: "1rem"
      }}>
        {formatTime(timeElapsed)}
      </div>

      <div style={{ marginBottom: "2rem", color: "var(--accent-color)" }}>
        Focus Score: {focusScore}% | Interruptions: {interruptions}
      </div>

      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        {!isRunning ? (
          <button className="btn-primary" onClick={handleStart} style={{ padding: "1rem 2rem", fontSize: "1.2rem" }}>
            Start Focus
          </button>
        ) : (
          <button className="btn-secondary" onClick={handlePause} style={{ padding: "1rem 2rem", fontSize: "1.2rem", borderColor: "#e74c3c", color: "#e74c3c" }}>
            Pause
          </button>
        )}
        
        {timeElapsed > 0 && !isRunning && (
          <button className="btn-primary" onClick={handleEndSession} style={{ backgroundColor: "var(--text-color)" }}>
            End & Save
          </button>
        )}
      </div>
    </div>
  );
}
