"use client";

// Global error boundary — shown when any server-rendered page throws.
// In almost every case the cause is a missing/wrong DATABASE_URL on
// the host, so we explain the fix instead of a generic stack trace.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDb =
    /ECONNREFUSED|database|connect|password|sslmode|leads.*does not exist/i.test(
      error.message ?? "",
    );

  return (
    <html>
      <body style={{ fontFamily: "system-ui", padding: 40, color: "#0f172a", background: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ maxWidth: 720, margin: "40px auto", background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
          <h1 style={{ fontSize: 24, marginTop: 0, marginBottom: 8 }}>
            {isDb ? "Database not connected yet" : "Something went wrong"}
          </h1>
          <p style={{ color: "#475569", marginTop: 0 }}>
            {isDb
              ? "The website is live, but it can't reach a Postgres database. Add one and the dashboard will start working immediately."
              : "The dashboard hit an unexpected error. Most often this is a database setup issue."}
          </p>

          <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "20px 0" }} />

          <h2 style={{ fontSize: 16, marginBottom: 8 }}>How to fix (one-time, ~3 minutes)</h2>
          <ol style={{ lineHeight: 1.7, paddingLeft: 20 }}>
            <li>Open your Vercel project page.</li>
            <li>Click the <b>Storage</b> tab at the top.</li>
            <li>Click <b>Create Database → Neon — Serverless Postgres</b>.</li>
            <li>Plan: <b>Free</b>. Region: <b>Frankfurt</b> (or any EU).</li>
            <li>Where it asks <b>Connect to project</b>, choose this project. Click <b>Create</b>.</li>
            <li>Vercel adds <code>DATABASE_URL</code> automatically.</li>
            <li>Click <b>Deployments → ⋯ → Redeploy</b>.</li>
          </ol>

          <p style={{ color: "#64748b", fontSize: 13, marginTop: 24 }}>
            Once redeployed, this page reloads with the 21 sample leads plus real Egyptian businesses pulled from OpenStreetMap. No code change needed.
          </p>

          {error.digest && (
            <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 16 }}>
              Error digest: <code>{error.digest}</code>
            </p>
          )}

          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              background: "#7c3aed",
              color: "white",
              border: 0,
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
