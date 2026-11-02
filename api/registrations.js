import { listRegistrations } from "./_store.js";

export default async function handler(req, res) {
  const key = process.env.ADMIN_KEY;
  if (!key || req.headers["x-admin-key"] !== key) {
    return res.status(401).json({ error: "Wrong admin key." });
  }
  const rows = (await listRegistrations()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ rows });
}
