import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "frontend", "dist");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(
  /\/+$/,
  "",
);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

function isApiRequest(pathname) {
  if (pathname === "/health" || pathname.startsWith("/health/")) return true;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
  if (pathname.startsWith("/investigate/")) return true;
  return false;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

async function proxyToBackend(req, res) {
  const targetUrl = `${BACKEND_URL}${req.url || "/"}`;
  try {
    const method = req.method || "GET";
    const headers = {};
    if (req.headers["content-type"]) {
      headers["content-type"] = String(req.headers["content-type"]);
    }
    if (req.headers.accept) {
      headers.accept = String(req.headers.accept);
    }

    const body =
      method !== "GET" && method !== "HEAD"
        ? await readRequestBody(req)
        : undefined;

    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(15000),
    });

    const contentType =
      upstream.headers.get("content-type") || "application/json; charset=utf-8";
    const payload = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, { "Content-Type": contentType });
    res.end(payload);
  } catch (err) {
    res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        success: false,
        detail: `FastAPI backend unavailable at ${BACKEND_URL}. Start uvicorn inside backend/ or configure BACKEND_URL.`,
        error: err instanceof Error ? err.message : "Backend unreachable",
      }),
    );
  }
}

function serveStaticFrontend(req, res, pathname) {
  const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(
    DIST_DIR,
    safePath === "/" ? "index.html" : safePath,
  );

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        success: false,
        detail:
          "Frontend bundle not built yet. Run `npm run build` to build frontend/dist.",
      }),
    );
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];

  if (isApiRequest(urlPath)) {
    void proxyToBackend(req, res);
    return;
  }

  serveStaticFrontend(req, res, urlPath);
});

server.listen(PORT, HOST, () => {
  console.log(
    `Wifi-dashboard preview gateway listening on http://${HOST}:${PORT} (proxying API to ${BACKEND_URL})`,
  );
});
