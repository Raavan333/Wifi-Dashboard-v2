import http from "node:http";

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

const ENDPOINTS = [
  "GET /health",
  "GET /dashboard",
  "GET /dashboard/summary",
  "GET /dashboard/population",
  "GET /dashboard/connectivity",
  "GET /dashboard/ssid",
  "GET /dashboard/location",
  "GET /dashboard/activity",
  "GET /dashboard/data-quality",
  "GET /dashboard/ap",
  "GET /dashboard/inactive-users",
  "GET /dashboard/rare-users",
  "GET /investigate/search",
  "GET /investigate/options",
  "POST /investigate/events",
  "POST /investigate/timeline",
  "POST /investigate/summary",
  "GET /investigate/user/{employee_id}",
  "GET /investigate/mac/{user_mac}",
  "GET /investigate/location/{location}",
  "GET /investigate/ssid/{ssid}",
  "GET /investigate/ap/{ap_hostname}",
  "GET /investigate/ap-mac/{ap_mac}",
  "GET /investigate/entity/{value}",
];

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (urlPath === "/") {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        service: "WiFi Observability & Investigation Platform",
        version: "3.0.0",
        status: "running_preview_gateway",
        backend_location: "backend/",
        note: "Production FastAPI + asyncpg + PostgreSQL backend is in backend/. Run `uvicorn app.main:app --host 0.0.0.0 --port 8000` inside backend/ in a Python 3.11+ environment with PostgreSQL access.",
        endpoints: ENDPOINTS,
      }),
    );
    return;
  }

  if (urlPath === "/health") {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        service: "WiFi Observability & Investigation Platform",
        version: "3.0.0",
        status: "healthy",
        database: "external-postgres-in-backend",
      }),
    );
    return;
  }

  res.writeHead(503);
  res.end(
    JSON.stringify({
      success: false,
      message:
        "FastAPI + asyncpg backend is implemented in backend/ and requires Python 3.11+ with PostgreSQL.",
      data: null,
    }),
  );
});

server.listen(PORT, HOST, () => {
  console.log(`Dev preview server listening on http://${HOST}:${PORT}`);
});
