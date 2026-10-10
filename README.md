# Interview Arena

A technical interview training ground that plays like a game. Practice
real Python, Kubernetes, and 4G/5G interview questions across five
difficulty levels -- multiple choice, real in-browser Python execution,
and self-assessed scenario/system-design questions -- with XP, streaks,
achievements, and progress saved locally in your browser. No account,
no backend, no server.

## Stack

React 18 + TypeScript + Vite + Tailwind CSS, Zustand (persisted to
`localStorage`), React Router, Monaco Editor, Framer Motion, and
[Pyodide](https://pyodide.org) (real CPython compiled to WebAssembly,
loaded from a CDN and run inside a dedicated Web Worker) for genuine
Python code execution.

## Running locally

```bash
npm install
npm run dev       # http://localhost:5174
```

```bash
npm run build      # production build -> dist/
npm run preview     # serve the production build locally
npm run test        # Vitest
npm run lint         # ESLint
npm run typecheck    # tsc -b --noEmit
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for a full, platform-by-platform
guide. Short version: this is a static single-page app -- build it,
host `dist/` on any static host, and make sure the host rewrites every
path to `index.html` (client-side routing requires this; config files
for Vercel and Netlify/Cloudflare Pages are already in this repo).

## Architecture notes

- **Everything runs client-side.** No backend, no API, no database. All
  progress lives in the browser's `localStorage`, behind a small
  replaceable interface (`src/lib/storage.ts`) so it could be swapped
  for something else later without touching the rest of the app.
- **Python execution is sandboxed in a Web Worker**
  (`src/workers/pyodideWorker.ts`), with a 10-second hard timeout on the
  main-thread side (`src/lib/pyRunner.ts`). This is what lets the app
  recover cleanly from a user's infinite loop instead of freezing the
  tab -- a worker can be forcibly terminated from the outside; a
  synchronous main-thread WASM call cannot.
- **The game engine is data-driven.** Adding a new game (see
  `src/games/`) is just adding a `GameDefinition` with its own
  questions to `src/lib/gameRegistry.ts` -- no changes to the
  dashboard, scoring, persistence, or UI chrome.
- **Errors are caught at the route level** (`errorElement` in
  `src/app/routes.tsx`), not just by a top-level React error boundary --
  React Router's data router needs its own `errorElement` per route, or
  a route-render crash bypasses a plain wrapping error boundary entirely
  and falls through to React Router's own default error page.

## Known limitations

- Scenario/system-design questions are self-graded (reveal a model
  answer, then honestly mark your own attempt) -- there's no backend
  and no LLM to grade free text automatically.
- Progress is local to one browser on one device. Clearing site data
  (or switching browsers/devices) loses it -- there's no account system
  or cross-device sync.
- Most domains in the library (Java, C++, SQL, Docker, ...) are
  intentionally-labeled "coming soon" placeholders -- the architecture
  supports them, but their question banks don't exist yet.
