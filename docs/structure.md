# Project Structure

Aliester is a vanilla JS frontend with an InsForge backend. This doc explains where things live and why.

## Quick Map

```
innovathon/
├── docs/              ← You are here
├── functions/         ← InsForge edge functions (Deno)
│   └── ai-brief.ts    ← AI assistant endpoint (OpenRouter)
├── migrations/        ← SQL migrations (applied via insforge CLI)
├── public/            ← Static frontend (served as-is)
│   ├── index.html     ← SPA shell + script loading
│   ├── css/           ← Stylesheets (tokens → base → layout → components → views → auth)
│   └── js/
│       ├── app.js     ← Router, settings, UI utilities
│       ├── data/
│       │   └── store.js   ← Data layer: CRUD ops + optimistic state
│       ├── services/
│       │   └── insforge.js ← InsForge SDK client + auth lifecycle
│       └── views/     ← One file per module (dashboard, finanzas, etc.)
├── AGENTS.md          ← AI agent instructions (InsForge skills)
├── README.md          ← Product overview + stack + status
└── .env.local         ← Local secrets (gitignored)
```

## Design Decisions

| Area | Decision | Why |
|------|----------|-----|
| `functions/` | Stays at root | InsForge CLI deploys edge functions from this path by convention |
| `public/js/services/` | SDK client lives here | It wraps an external service (InsForge), not a vendored library |
| `public/js/data/` | Store stays here | It IS the data layer — the name matches the role |
| `public/js/views/` | Flat folder, one file per module | 9 files is manageable; sub-grouping adds complexity without payoff |
| `migrations/` | Timestamped SQL at root | Standard InsForge migration convention |

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

- **Extract shared UI helpers** from `app.js` into `public/js/utils/` (formatCurrency, formatDate, showToast, etc.) — would reduce app.js from 256 lines to ~100
- **Add `public/js/views/index.js`** as a barrel file if views grow beyond ~12 files
- **Consider `public/js/data/mappers.js`** if store.js grows past 400 lines (mappers are ~80 lines today)
