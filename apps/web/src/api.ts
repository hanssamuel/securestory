const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8002";

export function getToken(): string | null {
  return localStorage.getItem("securestory_token");
}

export function setToken(token: string) {
  localStorage.setItem("securestory_token", token);
}

export function clearToken() {
  localStorage.removeItem("securestory_token");
}

async function req(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(opts.headers);

  if (!headers.has("Content-Type") && opts.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  login: (email: string, password: string) =>
    req("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  me: () => req("/me"),

  projects: () => req("/projects"),
  createProject: (slug: string, name: string) =>
    req("/projects", { method: "POST", body: JSON.stringify({ slug, name }) }),

  findings: () => req("/findings"),
  resolveFinding: (id: string) => req(`/findings/${id}/resolve`, { method: "POST" }),

  severityCounts: (project: string, days = 30) =>
    req(`/dash/severity_counts?project=${encodeURIComponent(project)}&days=${days}`),

  riskScore: (project: string, days = 30) =>
    req(`/dash/risk_score?project=${encodeURIComponent(project)}&days=${days}`),

  mttr: (project: string, days = 90) =>
    req(`/dash/mttr?project=${encodeURIComponent(project)}&days=${days}`),
};
