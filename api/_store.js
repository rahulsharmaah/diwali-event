// Tiny storage layer. On Vercel it uses Upstash Redis (connect it from the
// Vercel Storage tab; it sets KV_REST_API_URL / KV_REST_API_TOKEN). Without
// those env vars it falls back to a local JSON file for development.
import { promises as fs } from "node:fs";
import path from "node:path";

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...cmd) {
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const out = await res.json();
  if (out.error) throw new Error(out.error);
  return out.result;
}

const LOCAL_FILE = path.join(process.cwd(), ".data", "registrations.json");
async function readLocal() {
  try { return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8")); } catch { return {}; }
}
async function writeLocal(all) {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(all, null, 2));
}

export const usingRedis = Boolean(URL_ && TOKEN);

if (!usingRedis && process.env.VERCEL) {
  console.error("No Redis configured: connect Upstash Redis in Vercel Storage.");
}

// Returns true if saved, false if this email already exists.
export async function addRegistration(rec) {
  if (usingRedis) {
    const ok = await redis("SET", `reg:${rec.email}`, JSON.stringify(rec), "NX");
    if (ok !== "OK") return false;
    await redis("SET", `regid:${rec.id}`, rec.email);
    await redis("SADD", "reg:emails", rec.email);
    return true;
  }
  if (process.env.VERCEL) throw new Error("Database is not configured.");
  const all = await readLocal();
  if (all[rec.email]) return false;
  all[rec.email] = rec;
  await writeLocal(all);
  return true;
}

export async function getById(id) {
  if (usingRedis) {
    const email = await redis("GET", `regid:${id}`);
    if (!email) return null;
    const raw = await redis("GET", `reg:${email}`);
    return raw ? JSON.parse(raw) : null;
  }
  return Object.values(await readLocal()).find((r) => r.id === id) || null;
}

// Overwrites an existing registration (keyed by email).
export async function saveRegistration(rec) {
  if (usingRedis) {
    await redis("SET", `reg:${rec.email}`, JSON.stringify(rec));
    return;
  }
  const all = await readLocal();
  all[rec.email] = rec;
  await writeLocal(all);
}

export async function listRegistrations() {
  if (usingRedis) {
    const emails = await redis("SMEMBERS", "reg:emails");
    if (!emails.length) return [];
    const rows = await redis("MGET", ...emails.map((e) => `reg:${e}`));
    return rows.filter(Boolean).map((r) => JSON.parse(r));
  }
  return Object.values(await readLocal());
}
