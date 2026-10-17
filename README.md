# AI Photo Studio (working name)

Premium AI headshots that look like you. Frontend is built mock-first in stages, see `CLAUDE.md` and `docs/04-roadmap.md`.

## Requirements

- Node.js ≥ 20.9 (LTS 22/24 recommended), npm

## Getting started

```bash
npm install                       # also copies the MediaPipe WASM runtime to public/vendor (postinstall)
npx playwright install chromium   # once, for e2e and screenshots
npm run dev                       # http://localhost:3000
```

In development a **Dev** button (bottom-left) switches mock scenarios: Guest / New user / Has shoot / Shoot generating / Preview used, plus error toggles. The component gallery lives at `/dev/ui`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | route types + `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e (builds and starts on port 3100) |
| `npm run screenshots` | Light/Dark × 1440/390 (+1024 Studio) into `screenshots/stage-$STAGE/` (default 1) |

## Structure

```
src/app/           routes (CLAUDE.md §6)
src/components/    ui/ (design-system), layout/ (headers, footer), before-after/, dev/
src/config/        brand, packs, styles, edit-tools, use-cases, demo-manifest, selfie-check
src/services/      service interfaces + mock/ implementations (Supabase later)
src/features/      selfie-check (in-browser checks), crop (downloads, ZIP), shoot-wizard, shoot-page, auth
src/stores/        zustand stores
public/models/     face detector model (see public/models/README.md)
docs/              product spec (Russian) — source of truth
design/            approved references and motion prototypes
reports/           per-stage reports
```
