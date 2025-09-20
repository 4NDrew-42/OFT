# AI Marketplace Frontend (Vercel Shell)

This Next.js 14 application is the thin Vercel-hosted surface for the AI Marketplace. All dynamic blocks proxy to the self-hosted ORION-CORE services through secure tunnels.

## Local Development

```bash
npm install
npm run dev
```

The app expects ORION services at the URLs declared in `.env.local`. Use the sample values in `.env.example` and point them to your Cloudflare (or other) tunnels.

## Required Environment Variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Tunnelled REST/GraphQL endpoint for the API gateway. |
| `NEXT_PUBLIC_WS_URL` | WebSocket endpoint exposed via the tunnel. |
| `NEXT_PUBLIC_ORION_API_URL` | ORION-CORE vector or memory service URL. |
| `NEXT_PUBLIC_VERCEL_ENV` | Optional hint so the UI can show which environment is running. |

## Deployment (Vercel)

1. Push this `frontend/apps/web` directory to GitHub (or set it as Vercel’s root directory).
2. In Vercel, configure the project to use Node 18+ and install command `npm install` with build command `npm run build`.
3. Add the environment variables above with your tunnel URLs.
4. Trigger a deployment. The shell will render and call back to your infrastructure through the tunnels.

## Verification Checklist

- `npm run lint` & `npm run type-check` pass.
- `npm run build` succeeds locally.
- `/` renders the hero, search bar, and dynamic feed grids.
- `/robots.txt` and `/site.webmanifest` are reachable.
- The backend status codes in the header reflect real tunnel endpoints in production.
