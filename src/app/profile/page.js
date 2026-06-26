import Auth from "../../components/Auth";

export default function ProfilePage() {
  return (
    <main className="zen-container">
      <header className="zen-header">
        <h1 className="zen-title" style={{ textAlign: "center", marginBottom: "2rem" }}>Profile</h1>
      </header>
      <Auth />
    </main>
  );
}
