# Diwali of the Ancients — registration

Prehistoric-themed (three.js) registration page. One registration per email, ₹250 per person.

- `/` — registration form
- `/admin` — registrations list, totals and CSV export (needs `ADMIN_KEY`)

## Deploy on Vercel

1. Import this repo in Vercel (no build settings needed).
2. Storage → Create → **Upstash Redis** → connect to the project (adds `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
3. Settings → Environment Variables → add `ADMIN_KEY` (any secret phrase).
4. Redeploy.

## Run locally

```bash
ADMIN_KEY=test node dev.mjs
```

Without Redis env vars, local data is saved to `.data/registrations.json`.
