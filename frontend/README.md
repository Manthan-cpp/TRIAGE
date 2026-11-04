# Project Triage frontend

This React/Vite application is the review dashboard for Project Triage. Run it from the repository
root with `npm run dev:frontend` after starting the backend, or build it with `npm run build`.

The API origin is configured by `VITE_API_BASE_URL`. During local Vite development, configure
`VITE_DEV_API_PROXY_TARGET` so `/api` requests are forwarded to the backend. When the backend
serves `frontend/dist` in production, leave `VITE_API_BASE_URL` empty so requests stay same-origin.
