// Admin login: ADMIN_USER + ADMIN_PASSWORD env vars. A successful login sets a
// signed, httpOnly cookie that expires after 12 hours.
import crypto from "node:crypto";

const COOKIE = "dw_admin";
const TTL_MS = 12 * 60 * 60 * 1000;

const secret = () => process.env.ADMIN_SESSION_SECRET || `${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`;
const sign = (v) => crypto.createHmac("sha256", secret()).update(v).digest("base64url");

function same(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export const authConfigured = () => Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD);

export function checkLogin(user, pass) {
  if (!authConfigured()) return false;
  // Evaluate both so timing doesn't reveal which one was wrong.
  const u = same(user, process.env.ADMIN_USER);
  const p = same(pass, process.env.ADMIN_PASSWORD);
  return u && p;
}

function cookieAttrs(req) {
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || "");
  return `Path=/; HttpOnly; SameSite=Strict${local ? "" : "; Secure"}`;
}

export function setSession(req, res) {
  const exp = String(Date.now() + TTL_MS);
  res.setHeader("Set-Cookie", `${COOKIE}=${exp}.${sign(exp)}; Max-Age=${TTL_MS / 1000}; ${cookieAttrs(req)}`);
}

export function clearSession(req, res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; ${cookieAttrs(req)}`);
}

export function isAdmin(req) {
  if (!authConfigured()) return false;
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return same(sig, sign(exp));
}
