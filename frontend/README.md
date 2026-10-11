# CivicShield frontend

React/Vite operations UI for the incident, analytics, decision-support, and triage services.

## Run locally

```powershell
npm install
npm run dev
```

The Vite server proxies requests to `http://localhost:8081` (incident service), `http://localhost:8083` (analytics service), and `http://localhost:5000` (Python triage model). Copy `.env.example` to `.env.local` to override those targets. Restart Vite after changing proxy targets.

The backend services must be started separately. The incident service requires `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`; analytics requires `DATABASE_PASSWORD` for its configured Neon database. The triage model is in `backend/model` and listens on port 5000 by default. Service status appears in the left rail; when a service is offline, its affected actions report the backend error.

## Validate

```powershell
npm run build
```