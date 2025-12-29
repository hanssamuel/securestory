import { useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, setToken } from "./api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Project = { id: string; slug: string; name: string };
type Finding = {
  id: string;
  project: string;
  tool: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  status: "open" | "resolved" | "dismissed";
  first_seen: string;
};

export default function App() {
  const [token, setTokState] = useState<string | null>(getToken());
  const [email, setEmail] = useState("admin@local.dev");
  const [password, setPassword] = useState("Password123!");
  const [err, setErr] = useState("");

  // data
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSlug, setProjectSlug] = useState<string>("");

  const [counts, setCounts] = useState<{ critical: number; high: number; medium: number; low: number } | null>(null);
  const [riskSeries, setRiskSeries] = useState<any[]>([]);
  const [mttr, setMttr] = useState<{ mttr_hours: number | null; resolved_count: number } | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.slug === projectSlug) ?? null;
  }, [projects, projectSlug]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      setTokState(res.token);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  async function loadAll(slug?: string) {
    const projSlug = slug ?? projectSlug;
    if (!projSlug) return;

    const [c, r, m, f] = await Promise.all([
      api.severityCounts(projSlug, 30),
      api.riskScore(projSlug, 30),
      api.mttr(projSlug, 90),
      api.findings(),
    ]);

    setCounts(c.counts);
    setRiskSeries(r.series ?? []);
    setMttr({ mttr_hours: m.mttr_hours, resolved_count: m.resolved_count });

    // filter findings by project
    const filtered = (f.findings as Finding[]).filter((x) => x.project === projSlug);
    setFindings(filtered);
  }

  async function boot() {
    setErr("");
    try {
      await api.me();
      const p = await api.projects();
      setProjects(p.projects);

      const first = p.projects?.[0]?.slug ?? "";
      setProjectSlug(first);
      if (first) await loadAll(first);
    } catch (e: any) {
      // token invalid
      setErr(e.message || String(e));
      clearToken();
      setTokState(null);
    }
  }

  useEffect(() => {
    if (token) boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function resolve(id: string) {
    setErr("");
    try {
      await api.resolveFinding(id);
      await loadAll();
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", fontFamily: "system-ui" }}>
        <h1 style={{ marginBottom: 6 }}>SecureStory</h1>
        <p style={{ marginTop: 0, opacity: 0.7 }}>Login to view security insights.</p>

        {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              style={inputStyle}
            />
          </label>

          <button style={btnStyle}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>SecureStory</h1>
          <div style={{ opacity: 0.7 }}>Security signals → risk you can explain.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={projectSlug}
            onChange={async (e) => {
              const slug = e.target.value;
              setProjectSlug(slug);
              await loadAll(slug);
            }}
            style={inputStyle}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name} ({p.slug})
              </option>
            ))}
          </select>

          <button
            style={btnStyle}
            onClick={() => {
              clearToken();
              setTokState(null);
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {err && <div style={{ color: "crimson", marginTop: 12 }}>{err}</div>}

      <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        <Card title="Open High" value={counts ? String(counts.high) : "—"} />
        <Card title="Risk score (today)" value={riskSeries?.length ? String(riskSeries[riskSeries.length - 1]?.risk_score ?? "—") : "—"} />
        <Card
          title="MTTR (hours)"
          value={mttr?.mttr_hours == null ? "—" : Number(mttr.mttr_hours).toFixed(2)}
          sub={mttr ? `${mttr.resolved_count} resolved` : ""}
        />
      </section>

      <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Risk score (30 days)</h2>
            <div style={{ opacity: 0.7 }}>{selectedProject ? selectedProject.slug : ""}</div>
          </div>

          <div style={{ height: 280, minHeight: 280, width: "100%", marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="risk_score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Severity counts (open)</h2>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <KV label="Critical" value={counts ? counts.critical : "—"} />
            <KV label="High" value={counts ? counts.high : "—"} />
            <KV label="Medium" value={counts ? counts.medium : "—"} />
            <KV label="Low" value={counts ? counts.low : "—"} />
          </div>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <div style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Findings</h2>
            <button style={btnStyle} onClick={() => loadAll()}>
              Refresh
            </button>
          </div>

          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.8 }}>
                  <th style={thStyle}>Severity</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Tool</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>First seen</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={f.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={tdStyle}>{f.severity}</td>
                    <td style={tdStyle}>{f.title}</td>
                    <td style={tdStyle}>{f.tool}</td>
                    <td style={tdStyle}>{f.type}</td>
                    <td style={tdStyle}>{f.status}</td>
                    <td style={tdStyle}>{new Date(f.first_seen).toLocaleString()}</td>
                    <td style={tdStyle}>
                      {f.status === "open" ? (
                        <button style={btnSmall} onClick={() => resolve(f.id)}>
                          Resolve
                        </button>
                      ) : (
                        <span style={{ opacity: 0.6 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!findings.length && (
                  <tr>
                    <td style={tdStyle} colSpan={7}>
                      No findings for this project yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ opacity: 0.7, fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
      {sub ? <div style={{ opacity: 0.7, marginTop: 4, fontSize: 12 }}>{sub}</div> : null}
    </div>
  );
}

function KV({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={{ opacity: 0.8 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{String(value)}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: 10,
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: 10,
  background: "white",
  cursor: "pointer",
};

const btnSmall: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #ddd",
  borderRadius: 10,
  background: "white",
  cursor: "pointer",
};

const panelStyle: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 14,
  padding: 14,
  background: "white",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 14,
  padding: 14,
  background: "white",
};

const thStyle: React.CSSProperties = { padding: "8px 8px" };
const tdStyle: React.CSSProperties = { padding: "10px 8px", verticalAlign: "top" };
