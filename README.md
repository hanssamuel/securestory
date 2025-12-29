# SecureStory

SecureStory is a production-ready security analytics platform that turns raw security findings into risk metrics leadership can understand.

It ingests findings from security tools (SAST/DAST/etc), normalizes them, and exposes clear indicators like severity distribution, risk trends, and mean time to remediate (MTTR).

Built to reflect how security data actually flows through modern DevSecOps teams.

---

## Why SecureStory exists

Security tools generate thousands of alerts.

Most teams struggle to:
- Normalize noisy findings
- Track risk over time
- Explain security posture in business terms
- Measure remediation effectiveness

SecureStory solves this by providing:
- A clean data model
- A consistent ingest API
- Metrics designed for both engineers and leadership

---

## What this project demonstrates

- Real authentication and authorization (JWT + RBAC)
- Secure password handling with bcrypt
- Email-based password reset with expiring tokens
- PostgreSQL with migrations and SSL (production)
- Role-protected APIs
- Deployment on Render
- Environment-driven configuration
- End-to-end production debugging and fixes

This is not a demo app.  
It is deployed, secured, and tested in a real environment.

---

## Core features

### Authentication & Access Control
- JWT-based auth
- Roles: admin, analyst, viewer
- Protected routes
- Secure password hashing
- Password reset flow with expiring tokens

### Findings ingestion
- Accepts findings from multiple tools
- Normalizes severity, type, and metadata
- Associates findings with projects

### Metrics & dashboards
- Severity counts over time
- Risk score trends
- Mean time to remediate (MTTR)

### API-first design
- Clean REST endpoints
- Zod validation
- Rate limiting
- CORS configured for production

---

## Tech stack

### Backend
- Node.js
- Fastify
- TypeScript
- PostgreSQL
- Zod
- JWT
- bcrypt

### Frontend
- Vite

### Infrastructure
- GitHub
- Render (API + Postgres)
- SQL migrations
- SSL-enabled database connections

---

## High-level architecture

Security tools → Ingest API → Normalized database → Metrics & dashboards → Leadership-ready insights

---

## Example API endpoints

POST /auth/login  
POST /auth/register  
POST /auth/forgot_password  
POST /auth/reset_password  
GET  /me  

POST /projects  
POST /findings/ingest  
GET  /findings  

GET  /dash/severity_counts  
GET  /dash/risk_score  
GET  /dash/mttr  

All protected endpoints require a valid JWT.

---

## Production deployment

- API: https://securestory.onrender.com
- PostgreSQL: Render (SSL enforced)
- Secrets via environment variables
- Database migrations run on deploy

---

## Security considerations

- No plaintext passwords stored
- Token-based authentication
- Password reset tokens are single-use and time-bound
- Rate-limited endpoints
- Environment-scoped secrets

---

## Project status

Complete and functional.

- Authentication works
- Ingestion works
- Metrics work
- Deployment is live
- SMTP configuration is required to enable live password reset emails

---

## Why this matters

This project demonstrates the ability to:
- Design secure systems
- Debug real production failures
- Work across backend, database, and infrastructure
- Build software aligned with real-world security workflows
- Ship and maintain a deployed application
