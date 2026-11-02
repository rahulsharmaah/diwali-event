import { getById, saveRegistration } from "./_store.js";

// POST { id, email, utr } — the guest says they paid and gives the UPI
// transaction ID. The admin still has to confirm it against the bank app.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const id = String(b.id || "").trim().toUpperCase();
  const email = String(b.email || "").trim().toLowerCase();
  const utr = String(b.utr || "").replace(/\s/g, "");

  if (!/^[A-Za-z0-9]{8,35}$/.test(utr)) {
    return res.status(400).json({ error: "Please enter the UPI transaction ID (UTR) from your payment app." });
  }

  const rec = await getById(id);
  if (!rec || rec.email !== email) return res.status(404).json({ error: "Registration not found." });
  if (rec.payment?.status === "paid") return res.status(200).json({ status: "paid" });

  rec.payment = { ...(rec.payment || {}), status: "claimed", utr, claimedAt: new Date().toISOString() };
  await saveRegistration(rec);
  return res.status(200).json({ status: "claimed" });
}
