# ORION Template Starter

Hello world playground built on Next.js (Vercel-ready) that showcases modular, animated design templates backed by ORION-CORE RAG.

## Quick Start

```bash
# From repository root
npm install
npm run dev --workspace @ai-marketplace/orion-template-starter
```

Open `http://localhost:3004` (or the port reported by Next) to explore the template playground. Each refresh requests new inspiration from ORION-CORE while falling back to curated defaults if the AI service is offline.

## Environment

Set the endpoint that bridges to ORION-CORE RAG (defaults assume the existing AI service):

```bash
export NEXT_PUBLIC_ORION_TEMPLATE_ENDPOINT="http://localhost:3001/api/ai"
```

If you already expose `NEXT_PUBLIC_API_URL` elsewhere in the monorepo the hook will reuse it automatically.

## Key Files

- `app/page.tsx` – Entry point which renders the playground
- `components/TemplatePlayground.tsx` – Client-side composition tying all sections together
- `hooks/useOrionTemplates.ts` – React Query hook that streams templates from ORION
- `lib/orionTemplates.ts` – Fetcher that maps ORION recommendations into modular template objects

## Building and Linting

```bash
# Type-check
npm run type-check --workspace @ai-marketplace/orion-template-starter

# Lint
npm run lint --workspace @ai-marketplace/orion-template-starter

# Production build
npm run build --workspace @ai-marketplace/orion-template-starter
```

## Deployment

The app follows the standard Vercel Next.js layout (App Router). Deploy directly via Vercel by pointing to the `sites/ai-marketplace/frontend/apps/orion-template-starter` directory.
