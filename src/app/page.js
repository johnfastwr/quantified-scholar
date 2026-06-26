import Timer from "../components/Timer";

export default function Home() {
  return (
    <main className="zen-container">
      <header className="zen-header">
        <h1 className="zen-title" style={{ textAlign: "center", marginBottom: "2rem" }}>Focus</h1>
      </header>

      <section>
        <Timer />
      </section>
    </main>
  );
}
