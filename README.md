# Diwali of the Ancients — registration

Prehistoric-themed (three.js) registration page. One registration per email, ₹250 per person.

- `/` — registration form
- `/admin` — login-protected list of registrations and payments, mark paid, CSV export

After booking, guests are sent to UPI (sharmaayush6872@okicici) with the amount filled in — the app opens on phones, a QR code shows on screen. They then enter the UPI transaction ID (UTR); the admin checks it in the bank app and taps **Mark paid**.

## Deploy on Vercel

1. Import this repo in Vercel (no build settings needed).
2. Storage → Create → **Upstash Redis** → connect to the project (adds `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
3. Settings → Environment Variables → add `ADMIN_USER` and `ADMIN_PASSWORD` (your admin login).
4. Redeploy.

## Run locally

```bash
ADMIN_USER=admin ADMIN_PASSWORD=test node dev.mjs
```

Without Redis env vars, local data is saved to `.data/registrations.json`.
