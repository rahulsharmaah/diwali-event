import { checkLogin, setSession, clearSession, isAdmin, authConfigured } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") return res.status(200).json({ loggedIn: isAdmin(req) });

  if (req.method === "DELETE") {
    clearSession(req, res);
    return res.status(200).json({ loggedIn: false });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!authConfigured()) return res.status(500).json({ error: "Admin login is not set up (ADMIN_USER / ADMIN_PASSWORD)." });

  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!checkLogin(b.user ?? "", b.password ?? "")) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return res.status(401).json({ error: "Wrong username or password." });
  }
  setSession(req, res);
  return res.status(200).json({ loggedIn: true });
}
