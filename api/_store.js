// Tiny storage layer. Works with whichever Redis Vercel connected:
//  - Upstash (REST): *_KV_REST_API_URL + *_KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL/TOKEN
//    (any prefix chosen in the Vercel Storage tab is fine)
//  - Redis (TCP): REDIS_URL (or any *_REDIS_URL)
// With none of these it falls back to a local JSON file for development.
import { promises as fs } from "node:fs";
import path from "node:path";

const env = process.env;
const findEnv = (re) => Object.keys(env).find((k) => re.test(k) && env[k]);

const restUrlKey = findEnv(/(^|_)KV_REST_API_URL$/) || findEnv(/(^|_)REDIS_REST_URL$/);
const restTokenKey = restUrlKey && (findEnv(new RegExp("^" + restUrlKey.replace(/URL$/, "TOKEN") + "$")) || findEnv(/(^|_)KV_REST_API_TOKEN$/) || findEnv(/(^|_)REDIS_REST_TOKEN$/));
const URL_ = restUrlKey && env[restUrlKey];
const TOKEN = restTokenKey && env[restTokenKey];
const tcpKey = !URL_ ? findEnv(/(^|_)(REDIS_URL|KV_URL)$/) : null;

export const storageInfo = { mode: URL_ && TOKEN ? "upstash-rest" : tcpKey ? "redis-tcp" : "local-file", vars: [restUrlKey, restTokenKey, tcpKey].filter(Boolean) };

let tcpClient;
async function tcp() {
  if (!tcpClient) {
    const { createClient } = await import("redis");
    tcpClient = createClient({ url: env[tcpKey] });
    tcpClient.on("error", (e) => console.error("redis", e.message));
    await tcpClient.connect();
  }
  return tcpClient;
}

async function redis(...cmd) {
  if (tcpKey) return (await tcp()).sendCommand(cmd.map(String));
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

export const usingRedis = storageInfo.mode !== "local-file";

if (!usingRedis && process.env.VERCEL) {
  console.error("No Redis configured: connect a Redis database in Vercel Storage.");
}

// Each operation runs as one Lua script, so it costs a single round trip to
// the database (and the add is atomic).
const ADD_LUA = `
if redis.call('SET', KEYS[1], ARGV[1], 'NX') then
  redis.call('SET', KEYS[2], ARGV[2])
  redis.call('SADD', KEYS[3], ARGV[2])
  return 1
end
return 0`;
const GET_BY_ID_LUA = `
local email = redis.call('GET', KEYS[1])
if not email then return false end
return redis.call('GET', 'reg:' .. email)`;
const LIST_LUA = `
local emails = redis.call('SMEMBERS', KEYS[1])
if #emails == 0 then return {} end
local keys = {}
for i, e in ipairs(emails) do keys[i] = 'reg:' .. e end
return redis.call('MGET', unpack(keys))`;

// Returns true if saved, false if this email already exists.
export async function addRegistration(rec) {
  if (usingRedis) {
    const ok = await redis("EVAL", ADD_LUA, 3, `reg:${rec.email}`, `regid:${rec.id}`, "reg:emails", JSON.stringify(rec), rec.email);
    return Number(ok) === 1;
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
    const raw = await redis("EVAL", GET_BY_ID_LUA, 1, `regid:${id}`);
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

// One round trip to the database, for latency checks.
export async function ping() {
  if (usingRedis) return redis("PING");
}

export async function listRegistrations() {
  if (usingRedis) {
    const rows = (await redis("EVAL", LIST_LUA, 1, "reg:emails")) || [];
    return rows.filter(Boolean).map((r) => JSON.parse(r));
  }
  return Object.values(await readLocal());
}
