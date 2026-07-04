"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const TimerContext = createContext();

export function TimerProvider({ children }) {
  const [isRunning, setIsRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [subject, setSubject] = useState("");
  const [interruptions, setInterruptions] = useState(0);
  const [focusScore, setFocusScore] = useState(100);

  // Use a start timestamp instead of setInterval increment
  // This way even if the interval drifts or the tab is backgrounded, time stays accurate
  const startTimeRef = useRef(null);
  const accumulatedRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        setTimeElapsed(accumulatedRef.current + elapsed);
      }, 250); // Update 4x per second for smoother display
    } else {
      clearInterval(timerRef.current);
      // Save accumulated time when pausing
      if (startTimeRef.current) {
        accumulatedRef.current = timeElapsed;
        startTimeRef.current = null;
      }
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  // Calculate focus score dynamically
  useEffect(() => {
    const penalty = interruptions * 5;
    const bonus = Math.floor(timeElapsed / 600);
    const score = Math.max(0, Math.min(100, 100 - penalty + bonus));
    setFocusScore(score);
  }, [timeElapsed, interruptions]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
  }, []);

  const handlePause = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      setInterruptions((prev) => prev + 1);
    }
  }, [isRunning]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    clearInterval(timerRef.current);
    setTimeElapsed(0);
    setInterruptions(0);
    setSubject("");
    setFocusScore(100);
    accumulatedRef.current = 0;
    startTimeRef.current = null;
  }, []);

  return (
    <TimerContext.Provider value={{
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
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}
