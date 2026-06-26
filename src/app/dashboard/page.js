import Dashboard from "../../components/Dashboard";

export default function DashboardPage() {
  return (
    <main className="zen-container">
      <header className="zen-header">
        <h1 className="zen-title" style={{ textAlign: "center", marginBottom: "1rem" }}>Analytics</h1>
      </header>
      <Dashboard />
    </main>
  );
}
