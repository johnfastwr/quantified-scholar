"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, addDoc, Timestamp } from "firebase/firestore";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#8cb369', '#f4e285', '#f4a261', '#e76f51', '#2a9d8f', '#264653', '#e9c46a'];

// In-memory cache — survives tab switches, clears on full page reload
let globalCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(globalCache ? globalCache.data : []);
  const [subjectData, setSubjectData] = useState(globalCache ? globalCache.subjectData : []);
  const [loading, setLoading] = useState(globalCache ? false : true);
  const [todayPerformance, setTodayPerformance] = useState(globalCache ? globalCache.todayPerformance : { minutes: 0, status: "", diffPercentage: 0 });
  const [burnoutWarning, setBurnoutWarning] = useState(globalCache ? globalCache.burnoutWarning : false);
  const [chronotype, setChronotype] = useState(globalCache ? globalCache.chronotype : null);

  useEffect(() => {
    async function fetchSessions() {
      if (!user) return;
      
      // Use cache if still fresh — makes tab switching instant
      if (globalCache && (Date.now() - lastFetchTime < CACHE_TTL)) {
        setLoading(false);
        return;
      }
      
      try {
        // OPTIMIZATION 1: Only fetch last 90 days, not ALL sessions ever
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        ninetyDaysAgo.setHours(0, 0, 0, 0);

        const q = query(
          collection(db, "sessions"),
          where("userId", "==", user.uid),
          where("createdAt", ">=", Timestamp.fromDate(ninetyDaysAgo)),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        
        // OPTIMIZATION 2: Use a Map for O(1) date lookups instead of O(n) findIndex
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dayMap = new Map();
        const last90Days = [];

        for (let i = 89; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split("T")[0];
          const entry = {
            dateObj: d,
            key,
            name: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
            duration: 0, 
            focusScoreTotal: 0,
            sessionCount: 0
          };
          last90Days.push(entry);
          dayMap.set(key, entry);
        }

        const subjectTally = {};
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Chronotype Buckets
        const timeBlocks = {
          Morning: { scoreSum: 0, count: 0, icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f4a261" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg> },
          Afternoon: { scoreSum: 0, count: 0, icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e9c46a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg> },
          Evening: { scoreSum: 0, count: 0, icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e76f51" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 5-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg> },
          Night: { scoreSum: 0, count: 0, icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2a9d8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg> }
        };

        // Single-pass aggregation with O(1) Map lookups
        snapshot.forEach((doc) => {
          const d = doc.data();
          const sessionDate = d.createdAt.toDate();
          const sessionHour = sessionDate.getHours();
          
          // O(1) Map lookup instead of O(n) findIndex
          const dateKey = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()).toISOString().split("T")[0];
          const dayEntry = dayMap.get(dateKey);
          if (dayEntry) {
            dayEntry.duration += d.durationMinutes;
            dayEntry.focusScoreTotal += d.focusScore;
            dayEntry.sessionCount += 1;
          }

          // Subject Aggregation (Last 30 Days)
          const sessionMidnight = new Date(sessionDate);
          sessionMidnight.setHours(0, 0, 0, 0);
          if (sessionMidnight.getTime() >= thirtyDaysAgo.getTime()) {
            let sub = d.subject ? d.subject.trim() : "Uncategorized";
            if (sub === "") sub = "Uncategorized";
            sub = sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();
            subjectTally[sub] = (subjectTally[sub] || 0) + d.durationMinutes;
          }

          // Chronotype
          let block = "";
          if (sessionHour >= 5 && sessionHour < 12) block = "Morning";
          else if (sessionHour >= 12 && sessionHour < 17) block = "Afternoon";
          else if (sessionHour >= 17 && sessionHour < 21) block = "Evening";
          else block = "Night";
          timeBlocks[block].scoreSum += d.focusScore;
          timeBlocks[block].count += 1;
        });

        // Analytics calculations
        const last14Days = last90Days.slice(-14);
        const last7Days = last90Days.slice(-7);

        const total14DayMinutes = last14Days.reduce((acc, curr) => acc + curr.duration, 0);
        const average14Day = Math.round(total14DayMinutes / 14);
        const chartData = last14Days.map(day => ({ ...day, baseline: average14Day }));
        setData(chartData);

        // Today's Performance
        const todayMinutes = chartData[13].duration; 
        let status = "Neutral";
        let diff = 0;
        if (average14Day > 0) {
          diff = Math.round(((todayMinutes - average14Day) / average14Day) * 100);
          if (diff > 0) status = "Outperforming";
          if (diff < 0) status = "Underperforming";
        } else if (todayMinutes > 0) {
          status = "Outperforming";
          diff = 100;
        }
        setTodayPerformance({ minutes: todayMinutes, status, diffPercentage: diff });

        // Burnout Predictor
        const total90DayMinutes = last90Days.reduce((acc, curr) => acc + curr.duration, 0);
        const average90Day = total90DayMinutes / 90;
        const total7DayMinutes = last7Days.reduce((acc, curr) => acc + curr.duration, 0);
        const average7Day = total7DayMinutes / 7;
        const isBurnout = average90Day > 10 && average7Day > (average90Day * 1.5);
        setBurnoutWarning(isBurnout);

        // Subject Data
        const formattedSubjectData = Object.keys(subjectTally).map(key => ({
          name: key, value: subjectTally[key]
        })).sort((a, b) => b.value - a.value);
        setSubjectData(formattedSubjectData);

        // Chronotype
        let maxAvg = 0;
        let bestBlock = null;
        for (const [block, blockData] of Object.entries(timeBlocks)) {
          if (blockData.count > 0) {
            const avg = Math.round(blockData.scoreSum / blockData.count);
            if (avg > maxAvg) {
              maxAvg = avg;
              bestBlock = { name: block, score: avg, icon: blockData.icon };
            }
          }
        }
        if (bestBlock) setChronotype(bestBlock);

        // OPTIMIZATION 3: Cache for 5 minutes
        globalCache = {
          data: chartData,
          subjectData: formattedSubjectData,
          todayPerformance: { minutes: todayMinutes, status, diffPercentage: diff },
          burnoutWarning: isBurnout,
          chronotype: bestBlock
        };
        lastFetchTime = Date.now();

      } catch (error) {
        console.error("Error fetching sessions", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [user]);

  const generateDummyData = () => {
    if (!user) return;

    const subjects = ["Math", "Physics", "Computer Science", "History"];
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Generate 40 sessions locally (instant, zero network)
    const localSessions = [];
    for (let i = 0; i < 40; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const randomHour = Math.floor(Math.random() * 24);
      const sessionDate = new Date(now);
      sessionDate.setDate(sessionDate.getDate() - daysAgo);
      sessionDate.setHours(randomHour, 0, 0, 0);
      localSessions.push({
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        durationMinutes: Math.floor(Math.random() * (120 - 20) + 20),
        interruptions: Math.floor(Math.random() * 3),
        focusScore: Math.floor(Math.random() * (100 - 70) + 70),
        createdAt: sessionDate,
      });
    }

    // Step 2: Compute all analytics instantly from local data
    const dayMap = new Map();
    const last90Days = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const entry = { dateObj: d, key, name: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }), duration: 0, focusScoreTotal: 0, sessionCount: 0 };
      last90Days.push(entry);
      dayMap.set(key, entry);
    }
    const subjectTally = {};
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const chronoBlocks = { Morning: { s: 0, c: 0 }, Afternoon: { s: 0, c: 0 }, Evening: { s: 0, c: 0 }, Night: { s: 0, c: 0 } };

    for (const sess of localSessions) {
      const dateKey = new Date(sess.createdAt.getFullYear(), sess.createdAt.getMonth(), sess.createdAt.getDate()).toISOString().split("T")[0];
      const dayEntry = dayMap.get(dateKey);
      if (dayEntry) { dayEntry.duration += sess.durationMinutes; dayEntry.focusScoreTotal += sess.focusScore; dayEntry.sessionCount += 1; }
      const mid = new Date(sess.createdAt); mid.setHours(0, 0, 0, 0);
      if (mid.getTime() >= thirtyDaysAgo.getTime()) {
        const sub = sess.subject.charAt(0).toUpperCase() + sess.subject.slice(1).toLowerCase();
        subjectTally[sub] = (subjectTally[sub] || 0) + sess.durationMinutes;
      }
      const h = sess.createdAt.getHours();
      const block = h >= 5 && h < 12 ? "Morning" : h >= 12 && h < 17 ? "Afternoon" : h >= 17 && h < 21 ? "Evening" : "Night";
      chronoBlocks[block].s += sess.focusScore;
      chronoBlocks[block].c += 1;
    }

    const last14Days = last90Days.slice(-14);
    const last7Days = last90Days.slice(-7);
    const avg14 = Math.round(last14Days.reduce((a, c) => a + c.duration, 0) / 14);
    const chartData = last14Days.map(day => ({ ...day, baseline: avg14 }));
    const todayMins = chartData[13].duration;
    let status = "Neutral", diff = 0;
    if (avg14 > 0) { diff = Math.round(((todayMins - avg14) / avg14) * 100); if (diff > 0) status = "Outperforming"; if (diff < 0) status = "Underperforming"; }
    else if (todayMins > 0) { status = "Outperforming"; diff = 100; }

    const avg90 = last90Days.reduce((a, c) => a + c.duration, 0) / 90;
    const avg7 = last7Days.reduce((a, c) => a + c.duration, 0) / 7;
    const isBurnout = avg90 > 10 && avg7 > (avg90 * 1.5);
    const formattedSubjectData = Object.keys(subjectTally).map(k => ({ name: k, value: subjectTally[k] })).sort((a, b) => b.value - a.value);

    const chronoIcons = {
      Morning: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f4a261" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>,
      Afternoon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e9c46a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
      Evening: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e76f51" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 5-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>,
      Night: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2a9d8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
    };
    let maxAvg = 0, bestBlock = null;
    for (const [block, bd] of Object.entries(chronoBlocks)) {
      if (bd.c > 0) { const avg = Math.round(bd.s / bd.c); if (avg > maxAvg) { maxAvg = avg; bestBlock = { name: block, score: avg, icon: chronoIcons[block] }; } }
    }

    // Step 3: SET STATE INSTANTLY — graphs appear with zero wait
    setData(chartData);
    setTodayPerformance({ minutes: todayMins, status, diffPercentage: diff });
    setBurnoutWarning(isBurnout);
    setSubjectData(formattedSubjectData);
    if (bestBlock) setChronotype(bestBlock);

    globalCache = { data: chartData, subjectData: formattedSubjectData, todayPerformance: { minutes: todayMins, status, diffPercentage: diff }, burnoutWarning: isBurnout, chronotype: bestBlock };
    lastFetchTime = Date.now();

    // Step 4: Write to Firebase silently in the background (non-blocking)
    const writes = localSessions.map(s =>
      addDoc(collection(db, "sessions"), { userId: user.uid, subject: s.subject, durationMinutes: s.durationMinutes, interruptions: s.interruptions, focusScore: s.focusScore, createdAt: Timestamp.fromDate(s.createdAt) })
    );
    Promise.all(writes).catch(err => console.error("Background write error:", err));
  };

  if (!user) {
    return <div style={{ textAlign: "center", marginTop: "2rem" }}>Please sign in to view your dashboard.</div>;
  }

  if (loading) {
    return (
      <div className="zen-container" style={{ marginTop: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="gradient-text" style={{ fontSize: "1.2rem", fontWeight: "600", animation: "pulseGlow 2s infinite" }}>
            Analyzing Data...
          </div>
        </div>
        
        {/* Skeleton Top Banner */}
        <div className="glass-card" style={{ height: "120px", width: "100%", animation: "pulse 1.5s infinite ease-in-out", opacity: 0.5 }}></div>
        
        {/* Skeleton Metric Banner */}
        <div className="glass-card" style={{ height: "160px", width: "100%", animation: "pulse 1.5s infinite ease-in-out", opacity: 0.3, animationDelay: "0.2s" }}></div>
        
        {/* Skeleton Chart */}
        <div className="glass-card" style={{ height: "300px", width: "100%", animation: "pulse 1.5s infinite ease-in-out", opacity: 0.1, animationDelay: "0.4s" }}></div>
        
        <style>{`
          @keyframes pulse {
            0% { background-color: rgba(24, 24, 27, 0.4); }
            50% { background-color: rgba(255, 255, 255, 0.05); }
            100% { background-color: rgba(24, 24, 27, 0.4); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="zen-container" style={{ marginTop: "2rem" }}>
      
      {/* PHASE 3: Burnout Alert Banner */}
      {burnoutWarning && (
        <div className="glass-card" style={{
          textAlign: "center",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          background: "rgba(239, 68, 68, 0.08)",
        }}>
          <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#ef4444", marginBottom: "0.3rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "text-bottom", marginRight: "0.4rem" }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Burnout Warning
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Your recent 7-day volume exceeds 150% of your long-term average. Consider a recovery day.
          </div>
        </div>
      )}

      {/* PHASE 5: Chronotype Banner */}
      {chronotype && (
        <div className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <div style={{ fontSize: "3rem", filter: "drop-shadow(0 0 15px rgba(255,255,255,0.2))" }}>{chronotype.icon}</div>
          <div>
            <h3 style={{ fontSize: "1rem", color: "var(--text-muted)", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "1px" }}>Your Chronotype</h3>
            <div className="gradient-text" style={{ fontSize: "1.4rem", fontWeight: "800" }}>
              {chronotype.name} Scholar
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-color)", opacity: 0.9 }}>
              Peak Focus Score: <strong style={{ color: "var(--accent-color)" }}>{chronotype.score}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Verdict Banner */}
      <div className="glass-card" style={{ textAlign: "center" }}>
        <h3 style={{ fontSize: "1rem", color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "1px" }}>Today&apos;s Performance</h3>
        <div style={{ fontSize: "3.5rem", fontWeight: "800", letterSpacing: "-1px", marginBottom: "0.5rem" }}>
          {todayPerformance.minutes} <span style={{ fontSize: "1.2rem", fontWeight: "500", color: "var(--text-muted)" }}>mins</span>
        </div>
        
        {todayPerformance.status === "Outperforming" && (
          <div style={{ color: "#10b981", fontWeight: "600", fontSize: "1.1rem" }}>
            ↑ {todayPerformance.diffPercentage}% vs Baseline
          </div>
        )}
        {todayPerformance.status === "Underperforming" && (
          <div style={{ color: "#ef4444", fontWeight: "600", fontSize: "1.1rem" }}>
            ↓ {Math.abs(todayPerformance.diffPercentage)}% vs Baseline
          </div>
        )}
        {todayPerformance.status === "Neutral" && (
          <div style={{ color: "var(--text-muted)", fontWeight: "500", fontSize: "1.1rem" }}>
            Matching Baseline
          </div>
        )}
      </div>

      <h2 style={{ marginBottom: "1.5rem", fontWeight: "600", fontSize: "1.3rem", textAlign: "center" }}>14-Day Rolling Baseline</h2>
      
      <div className="glass-card" style={{ width: "100%", height: 300, padding: "1.5rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <XAxis dataKey="name" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} minTickGap={20} />
            <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', borderColor: 'var(--glass-border)', color: 'var(--text-color)', borderRadius: '8px', backdropFilter: 'blur(8px)' }}
              itemStyle={{ color: 'var(--accent-color)' }}
            />
            <Bar dataKey="duration" fill="var(--accent-color)" radius={[6, 6, 0, 0]} name="Actual Minutes" />
            <Line type="monotone" dataKey="baseline" stroke="#ef4444" strokeWidth={3} strokeDasharray="6 6" name="14-Day Baseline" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* PHASE 4: Subject Allocation Matrix */}
      <h2 style={{ marginBottom: "1.5rem", fontWeight: "600", fontSize: "1.3rem", textAlign: "center" }}>30-Day Subject Allocation</h2>
      
      <div className="glass-card" style={{ width: "100%", height: 350, padding: "1.5rem" }}>
        {subjectData.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: "6rem", opacity: 0.5 }}>No subject data logged in the last 30 days.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={subjectData}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={4}
                dataKey="value"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth={2}
              >
                {subjectData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', borderColor: 'var(--glass-border)', color: 'var(--text-color)', borderRadius: '8px', backdropFilter: 'blur(8px)' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value) => [`${value} mins`, 'Total Time']}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-muted)' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: "3rem", marginBottom: "5rem" }}>
        <button 
          onClick={generateDummyData}
          className="btn-secondary" 
          style={{ fontSize: "0.8rem", opacity: 0.5, borderStyle: "dashed" }}>
          + Generate Demo Data (Dev Only)
        </button>
      </div>

    </div>
  );
}
