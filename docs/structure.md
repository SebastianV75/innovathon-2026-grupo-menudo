# Project Structure

Aliester is a monorepo: one shared InsForge backend plus two frontends (desktop web and mobile). This doc explains where things live and why.

## Quick Map

```
aliester/
├── apps/
│   ├── desktop/
│   │   └── public/        ← Static web frontend (served as-is, Vercel root)
│   │       ├── index.html
│   │       ├── css/
│   │       └── js/
│   │           ├── app.js
│   │           ├── data/
│   │           │   └── store.js
│   │           ├── services/
│   │           │   └── insforge.js
│   │           └── views/
│   └── mobile/
│       └── app/           ← Mobile frontend (native shell)
├── functions/             ← InsForge edge functions (Deno)
│   ├── ai-brief.ts
│   └── google-calendar-sync.ts
├── migrations/            ← SQL migrations (applied via insforge CLI)
├── docs/                  ← You are here
├── vercel.json            ← Vercel URL behavior config
├── insforge.toml          ← InsForge project config
├── AGENTS.md              ← AI agent instructions (InsForge skills)
├── README.md              ← Product overview + stack + status
└── .env.local             ← Local secrets (gitignored)
```

## Frontends

- **`apps/desktop/public/`** — The production web app. Vanilla JS SPA with a hash-based router. Served by Vercel from this path. The project root/output directory is configured in Vercel, not in this repo.
- **`apps/mobile/app/`** — The mobile app. Currently a minimal native shell that loads the desktop web app inside a WebView. Will evolve into a separate native codebase.

## Backend

The InsForge backend (`functions/`, `migrations/`, `insforge.toml`, `.insforge/`) stays at the repo root because the `insforge` CLI deploys from these conventional paths. Never move them.

## Design Decisions

| Area | Decision | Why |
|------|----------|-----|
| `functions/` | Stays at root | InsForge CLI deploys edge functions from this path by convention |
| `migrations/` | Stays at root | Standard InsForge migration convention |
| `apps/desktop/public/` | Served as-is by Vercel | Static site, no build step; `vercel.json` points here |
| `apps/mobile/app/` | Separate native codebase | Keeps mobile platform-specific code out of the web app |
| `apps/desktop/public/js/services/` | SDK client lives here | It wraps an external service (InsForge), not a vendored library |
| `apps/desktop/public/js/data/` | Store stays here | It IS the data layer — the name matches the role |
| `apps/desktop/public/js/views/` | Flat folder, one file per module | 9 files is manageable; sub-grouping adds complexity without payoff |
| `vercel.json` at root | Controls URL behavior only | The desktop root is configured in Vercel project settings |

## CSS Load Order

The `<link>` tags in `index.html` load CSS in dependency order:

1. `tokens.css` — Design tokens (colors, spacing, typography)
2. `base.css` — Reset + base element styles
3. `layout.css` — Grid, sidebar, navbar structure
4. `components.css` — Buttons, cards, forms, modals
5. `views.css` — Module-specific styles
6. `auth.css` — Auth screen (isolated)

## Script Load Order

Scripts in `index.html` are ordered by dependency:

1. `views/auth.js` — Auth UI (needed before anything else renders)
2. `data/store.js` — Data layer (needs `window.insforge` from services)
3. `app.js` — Router + utilities (needs store)
4. `views/*.js` — Module views (need router + store + app utilities)
5. `services/insforge.js` — ES module, loads async, dispatches `auth-ready` event

## Future Cleanup (Not Done Yet)

These are improvements worth considering later, but not urgent:

- **Extract shared UI helpers** from `app.js` into `apps/desktop/public/js/utils/` (formatCurrency, formatDate, showToast, etc.) — would reduce app.js from 256 lines to ~100
- **Add `apps/desktop/public/js/views/index.js`** as a barrel file if views grow beyond ~12 files
- **Consider `apps/desktop/public/js/data/mappers.js`** if store.js grows past 400 lines (mappers are ~80 lines today)
- **Update the mobile WebView URL** in `apps/mobile/app/_layout.tsx` only if the production domain changes
