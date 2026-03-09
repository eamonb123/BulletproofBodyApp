# Bulletproof Body — Multi-Service Architecture

> **Updated:** 2026-03-09
> **Pattern:** bulletproofbody.ai is a Next.js gateway that proxies to backend services via URL rewrites.

---

## How It Works

```
bulletproofbody.ai (Next.js on Render)
│
├── /jumper              → Native Next.js page (lead magnet swap tool)
├── /directory           → Native Next.js page (tool directory)
├── /start               → Redirect to /jumper
│
├── /weekly-check-in/*   → PROXY → EPM Check-In FastAPI service
├── /coach/*             → PROXY → EPM Coach Dashboard
├── /checkin-admin       → PROXY → EPM Admin Hub
│
└── (future tools)       → Add rewrites in next.config.ts
```

**Key idea:** bulletproofbody.ai is the single domain for all client-facing tools. Each tool can be built in any stack (Next.js, FastAPI, etc.) and proxied behind the same domain via Next.js rewrites.

---

## Adding a New Proxied Service

### 1. Deploy the backend service on Render

Create a new Render web service for the backend (e.g., EPM check-in dashboard):

```yaml
# Example: render.yaml for EPM check-in service
services:
  - type: web
    name: epm-checkin-dashboard
    runtime: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn src.checkin_dashboard.server:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: CHECKIN_ADMIN_KEY
        sync: false
      - key: CHECKIN_DASHBOARD_SECRET
        sync: false
```

### 2. Add rewrite rule in BBA's next.config.ts

```typescript
async rewrites() {
  const newServiceUrl = process.env.NEW_SERVICE_URL || "http://localhost:XXXX";
  return [
    {
      source: "/my-tool/:path*",
      destination: `${newServiceUrl}/:path*`,
    },
  ];
}
```

### 3. Add env var to BBA's render.yaml

```yaml
- key: NEW_SERVICE_URL
  sync: false
```

### 4. Set env var in Render dashboard

Point `NEW_SERVICE_URL` to the deployed backend's internal URL (e.g., `https://epm-checkin-dashboard.onrender.com`).

### 5. Redeploy BBA

The Next.js rewrite will now proxy requests from `bulletproofbody.ai/my-tool/*` to the backend service.

---

## Current Services

| Route | Backend | Service | Status |
|-------|---------|---------|--------|
| `/jumper`, `/directory`, `/start` | Native Next.js | `bulletproof-body-app` | LIVE |
| `/weekly-check-in/*` | EPM FastAPI | `epm-checkin-dashboard` | TODO — deploy EPM |
| `/coach/*` | EPM FastAPI | `epm-checkin-dashboard` | TODO — deploy EPM |
| `/checkin-admin` | EPM FastAPI | `epm-checkin-dashboard` | TODO — deploy EPM |

---

## EPM Check-In Dashboard — Deployment Notes

The check-in dashboard lives in `EamonianProgramMaster/src/checkin_dashboard/` and is tightly coupled to EPM's data layer:

**Dependencies:**
- `weekly_checkin.py` — data aggregator (Trainerize metrics, messages, Fathom calls)
- `clients.db` — EPM's SQLite database
- `trainerize-sync/google_sheets_api.py` — Google Sheets mirroring
- `fastapi`, `jinja2`, `python-multipart`

**Routes (EPM side):**
- `GET /checkin/{client_name}?token=xxx` — Client check-in form
- `POST /checkin/{client_name}/submit` — Form submission
- `GET /coach/{client_name}?key=xxx` — Coach review dashboard
- `GET /admin?key=xxx` — Admin hub (all clients)

**Auth:** HMAC-signed URLs (token = `{expiry}.{hmac_hex}`). No login page — the URL IS the credential.

**To deploy on Render:**
1. Create a new Render web service from the EPM repo
2. Set `rootDir` to repo root (needs access to `src/` and `data/`)
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn src.checkin_dashboard.server:app --host 0.0.0.0 --port $PORT`
5. Env vars: `CHECKIN_ADMIN_KEY`, `CHECKIN_DASHBOARD_SECRET`
6. **Database:** EPM uses SQLite at `data/clients.db` — needs persistent disk on Render (paid plan) or migration to PostgreSQL
7. Set `CHECKIN_SERVICE_URL` in BBA's Render env to point to this service

**URL mapping after deployment:**
- `bulletproofbody.ai/weekly-check-in/bryant-barile?token=xxx` → EPM `/checkin/bryant-barile?token=xxx`
- `bulletproofbody.ai/coach/bryant-barile?key=xxx` → EPM `/coach/bryant-barile?key=xxx`
- `bulletproofbody.ai/checkin-admin?key=xxx` → EPM `/admin?key=xxx`

---

## Local Development

Run both services locally:

```bash
# Terminal 1: BBA (Next.js)
cd app && npm run dev  # Port 3000

# Terminal 2: EPM Check-In (FastAPI)
cd ../EamonianProgramMaster
python -m src.checkin_dashboard.server  # Port 8090
```

The Next.js rewrite defaults to `http://localhost:8090` when `CHECKIN_SERVICE_URL` is not set.

Visit `http://localhost:3000/weekly-check-in/bryant-barile?token=xxx` to test the proxy.

---

## Design Decisions

1. **Why proxy instead of iframe?** — Iframes break auth flows, can't share cookies, and feel janky on mobile. Rewrites are transparent to the user.

2. **Why not rewrite in Next.js?** — The check-in dashboard is deeply integrated with EPM's data layer (Trainerize sync, Google Sheets, client DB). Rewriting would duplicate 500+ lines of Python logic.

3. **Why not a monorepo?** — BBA and EPM serve different purposes. BBA is a public lead magnet. EPM is internal coaching infrastructure. Keeping them separate preserves clear boundaries.

4. **Why one domain?** — Clients get one URL for everything: `bulletproofbody.ai`. No confusion about which site to visit.
