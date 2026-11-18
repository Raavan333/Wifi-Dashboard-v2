# Enterprise WiFi Observability & Investigation Platform — Frontend

Self-contained React 19 + TypeScript + Vite frontend interacting directly with the FastAPI backend in `../backend`.

## Stack

- React 19, TypeScript, Vite
- Material UI (MUI v7)
- TanStack Query, TanStack Table, TanStack Virtual
- Zustand, Recharts, React Router, Framer Motion

## Local Development

1. Start the FastAPI backend on port `8000`:

```bash
cd ../backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

2. Install dependencies and start Vite inside `frontend/`:

```bash
cd frontend
npm install
npm run dev
```

3. Production build:

```bash
cd frontend
npm run build
```
