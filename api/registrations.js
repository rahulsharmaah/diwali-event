import { listRegistrations, getById, saveRegistration } from "./_store.js";
import { isAdmin } from "./_auth.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAdmin(req)) return res.status(401).json({ error: "Please log in." });

  if (req.method === "GET") {
    const rows = (await listRegistrations()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return res.status(200).json({ rows });
  }

  // PATCH { id, paid: true|false } — admin confirms (or undoes) a payment.
  if (req.method === "PATCH") {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const rec = await getById(String(b.id || ""));
    if (!rec) return res.status(404).json({ error: "Registration not found." });
    const payment = rec.payment || { status: "unpaid" };
    if (b.paid) {
      rec.payment = { ...payment, status: "paid", paidAt: new Date().toISOString() };
    } else {
      rec.payment = { ...payment, status: payment.utr ? "claimed" : "unpaid", paidAt: null };
    }
    await saveRegistration(rec);
    return res.status(200).json({ row: rec });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
