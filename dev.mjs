// Local dev server: serves static files and runs /api/* handlers the way Vercel does.
// Usage: ADMIN_KEY=test node dev.mjs
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.PORT || 5173);
const root = process.cwd();
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };

  if (url.pathname.startsWith("/api/")) {
    const name = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, "");
    const file = path.join(root, "api", `${name}.js`);
    try {
      let raw = "";
      for await (const c of req) raw += c;
      req.body = raw ? JSON.parse(raw) : {};
      const mod = await import(pathToFileURL(file).href);
      return await mod.default(req, res);
    } catch (e) {
      console.error(e);
      return res.status(e.code === "ERR_MODULE_NOT_FOUND" ? 404 : 500).json({ error: "dev server error" });
    }
  }

  const rel = url.pathname === "/" ? "index.html" : url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname;
  let file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) return res.status(403).end();
  try {
    if (!path.extname(file)) file += ".html";
    const body = await fs.readFile(file);
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    res.end(body);
  } catch {
    res.status(404).end("Not found");
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
