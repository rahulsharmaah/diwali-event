import { storageInfo, listRegistrations } from "./_store.js";
import { authConfigured } from "./_auth.js";

// Setup check: which database is connected and whether admin login is set.
// Shows env var names only, never their values.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  let db = "ok";
  try {
    await listRegistrations();
  } catch (e) {
    db = "error: " + e.message;
  }
  return res.status(200).json({ storage: storageInfo.mode, vars: storageInfo.vars, db, adminLogin: authConfigured() });
}
