"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#8cb369', '#f4e285', '#f4a261', '#e76f51', '#2a9d8f', '#264653', '#e9c46a'];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [subjectData, setSubjectData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayPerformance, setTodayPerformance] = useState({ minutes: 0, status: "", diffPercentage: 0 });
  const [burnoutWarning, setBurnoutWarning] = useState(false);
  const [chronotype, setChronotype] = useState(null);

  useEffect(() => {
    async function fetchSessions() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "sessions"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        
        // Setup arrays for varying timeframes
        const last90Days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 89; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          last90Days.push({
            dateObj: d,
            name: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
            duration: 0, 
            focusScoreTotal: 0,
            sessionCount: 0
          });
        }

        const subjectTally = {};
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // PHASE 5: Chronotype Buckets
        const timeBlocks = {
          Morning: { scoreSum: 0, count: 0, icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f4a261" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg> },
          Afternoon: { scoreSum: 0, count: 0, icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e9c46a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg> },
          Evening: { scoreSum: 0, count: 0, icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e76f51" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 5-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg> },
          Night: { scoreSum: 0, count: 0, icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2a9d8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg> }
        };

        // Aggregate data
        snapshot.forEach((doc) => {
          const d = doc.data();
          const sessionDate = d.createdAt.toDate();
          const sessionHour = sessionDate.getHours();
          sessionDate.setHours(0, 0, 0, 0);

          // Pacing Array Population
          const dayIndex = last90Days.findIndex(day => day.dateObj.getTime() === sessionDate.getTime());
          if (dayIndex !== -1) {
            last90Days[dayIndex].duration += d.durationMinutes;
            last90Days[dayIndex].focusScoreTotal += d.focusScore;
            last90Days[dayIndex].sessionCount += 1;
          }

          // Subject Aggregation (Last 30 Days)
          if (sessionDate.getTime() >= thirtyDaysAgo.getTime()) {
            let sub = d.subject ? d.subject.trim() : "Uncategorized";
            if (sub === "") sub = "Uncategorized";
            sub = sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase();

            if (!subjectTally[sub]) {
              subjectTally[sub] = 0;
            }
            subjectTally[sub] += d.durationMinutes;
          }

          // Chronotype Aggregation
          let block = "";
          if (sessionHour >= 5 && sessionHour < 12) block = "Morning";
          else if (sessionHour >= 12 && sessionHour < 17) block = "Afternoon";
          else if (sessionHour >= 17 && sessionHour < 21) block = "Evening";
          else block = "Night";

          timeBlocks[block].scoreSum += d.focusScore;
          timeBlocks[block].count += 1;
        });

        // Slice arrays for specific analytics
        const last14Days = last90Days.slice(-14);
        const last7Days = last90Days.slice(-7);

        // 14-Day Average Calculation (For the UI Chart Baseline)
        const total14DayMinutes = last14Days.reduce((acc, curr) => acc + curr.duration, 0);
        const average14Day = Math.round(total14DayMinutes / 14);

        const chartData = last14Days.map(day => ({
          ...day,
          baseline: average14Day
        }));
        setData(chartData);

        // Today's Performance Verdict
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

        setTodayPerformance({
          minutes: todayMinutes,
          status,
          diffPercentage: diff
        });

        // PHASE 3: The Burnout Predictor
        const total90DayMinutes = last90Days.reduce((acc, curr) => acc + curr.duration, 0);
        const average90Day = total90DayMinutes / 90;
        
        const total7DayMinutes = last7Days.reduce((acc, curr) => acc + curr.duration, 0);
        const average7Day = total7DayMinutes / 7;

        if (average90Day > 10 && average7Day > (average90Day * 1.5)) {
          setBurnoutWarning(true);
        } else {
          setBurnoutWarning(false);
        }

        // PHASE 4: Format Subject Data
        const formattedSubjectData = Object.keys(subjectTally).map(key => ({
          name: key,
          value: subjectTally[key]
        })).sort((a, b) => b.value - a.value);

        setSubjectData(formattedSubjectData);

        // PHASE 5: Calculate Chronotype
        let maxAvg = 0;
        let bestBlock = null;

        for (const [block, data] of Object.entries(timeBlocks)) {
          if (data.count > 0) {
            const avg = Math.round(data.scoreSum / data.count);
            if (avg > maxAvg) {
              maxAvg = avg;
              bestBlock = { name: block, score: avg, icon: data.icon };
            }
          }
        }

        if (bestBlock) {
          setChronotype(bestBlock);
        }

      } catch (error) {
        console.error("Error fetching sessions", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [user]);

  if (!user) {
    return <div style={{ textAlign: "center", marginTop: "2rem" }}>Please sign in to view your dashboard.</div>;
  }

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "2rem" }}>Analyzing your biological data...</div>;
  }

  return (
    <div className="zen-container" style={{ marginTop: "2rem" }}>
      
      {/* PHASE 3: Burnout Alert Banner */}
      {burnoutWarning && (
        <div style={{
          backgroundColor: "#fff3cd",
          color: "#856404",
          padding: "1rem",
          borderRadius: "8px",
          border: "1px solid #ffeeba",
          marginBottom: "2rem",
          textAlign: "center",
          fontWeight: "bold"
        }}>
          ⚠️ Burnout Warning: Your recent 7-day volume is over 150% of your long-term average. Consider an Active Recovery Day to protect your focus momentum.
        </div>
      )}

      {/* PHASE 5: Chronotype Banner */}
      {chronotype && (
        <div style={{
          backgroundColor: "var(--card-bg)",
          padding: "1.5rem",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem"
        }}>
          <div style={{ fontSize: "2.5rem" }}>{chronotype.icon}</div>
          <div>
            <h3 style={{ fontSize: "1rem", opacity: 0.7, marginBottom: "0.2rem" }}>Your Chronotype</h3>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--accent-color)" }}>
              {chronotype.name} Scholar
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-color)", opacity: 0.8 }}>
              Peak Focus Score: {chronotype.score}
            </div>
          </div>
        </div>
      )}

      {/* Verdict Banner */}
      <div style={{
        backgroundColor: "var(--card-bg)",
        padding: "1.5rem",
        borderRadius: "12px",
        border: "1px solid var(--border-color)",
        marginBottom: "2rem",
        textAlign: "center"
      }}>
        <h3 style={{ fontSize: "1rem", opacity: 0.7, marginBottom: "0.5rem" }}>Today's Performance</h3>
        <div style={{ fontSize: "2.5rem", fontWeight: "300", marginBottom: "0.5rem" }}>
          {todayPerformance.minutes} <span style={{ fontSize: "1.2rem" }}>mins</span>
        </div>
        
        {todayPerformance.status === "Outperforming" && (
          <div style={{ color: "#27ae60", fontWeight: "bold" }}>
            ↑ {todayPerformance.diffPercentage}% vs Baseline
          </div>
        )}
        {todayPerformance.status === "Underperforming" && (
          <div style={{ color: "#e74c3c", fontWeight: "bold" }}>
            ↓ {Math.abs(todayPerformance.diffPercentage)}% vs Baseline
          </div>
        )}
        {todayPerformance.status === "Neutral" && (
          <div style={{ color: "var(--text-color)", opacity: 0.7 }}>
            Matching Baseline
          </div>
        )}
      </div>

      <h2 style={{ marginBottom: "1rem", fontWeight: "300", textAlign: "center" }}>14-Day Rolling Baseline</h2>
      
      <div style={{ width: "100%", height: 300, backgroundColor: "var(--card-bg)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "2rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <XAxis dataKey="name" stroke="var(--text-color)" tick={{fill: 'var(--text-color)'}} minTickGap={20} />
            <YAxis stroke="var(--text-color)" tick={{fill: 'var(--text-color)'}} />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
              itemStyle={{ color: 'var(--accent-color)' }}
            />
            <Bar dataKey="duration" fill="var(--accent-color)" radius={[4, 4, 0, 0]} name="Actual Minutes" />
            <Line type="monotone" dataKey="baseline" stroke="#e74c3c" strokeWidth={2} strokeDasharray="5 5" name="14-Day Baseline" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* PHASE 4: Subject Allocation Matrix */}
      <h2 style={{ marginBottom: "1rem", fontWeight: "300", textAlign: "center" }}>30-Day Subject Allocation</h2>
      
      <div style={{ width: "100%", height: 350, backgroundColor: "var(--card-bg)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
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
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {subjectData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                itemStyle={{ color: 'var(--text-color)' }}
                formatter={(value) => [`${value} mins`, 'Total Time']}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-color)' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
