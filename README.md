# SecureStory

SecureStory turns security findings into risk you can explain.

It ingests findings (SAST/DAST/etc), normalizes them, and produces:
- severity distribution
- risk score over time
- MTTR (mean time to remediate)

Built to mirror how security data flows through modern DevSecOps teams.

---

## Why this exists

Security tools generate a lot of noisy alerts.

Teams need:
- a clean data model
- a consistent ingest API
- metrics that leadership understands
- fast ways to track risk and remediation

SecureStory provides that foundation.

---

## Core features

### Authentication + RBAC
- JWT auth
- Roles: admin, analyst, viewer
- Protected routes for ingest + updates

### Project + Findings model
- Projects are a stable unit for grouping security signals
- Findings are normalized across tools
- Findings support lifecycle: open, resolved, dismissed

### Dashboards
- severity_counts (open findings in last N days)
- risk_score time series (weighted severity score)
- mttr (hours, resolved findings only)

### Web UI
- Login
- Project selector
- KPI cards (Open High, Risk score, MTTR)
- Risk score chart
- Findings table with Resolve action

---

## Architecture

Frontend
- React + TypeScript (Vite)
- Recharts
- Token stored in localStorage

API
- Fastify + TypeScript
- Zod validation
- Rate limiting + CORS

Database
- PostgreSQL
- SQL migrations

---

## Local setup

### API
```bash
cd apps/api
npm install
npm run migrate
npm run dev

