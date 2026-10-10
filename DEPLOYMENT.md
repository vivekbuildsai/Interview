# Deploying Interview Arena

Interview Arena is a static single-page app: `npm run build` produces a
`dist/` folder of plain HTML/CSS/JS with no server-side component. Any
static host works, with one requirement explained below.

## The one thing every host must do: SPA fallback

React Router (`createBrowserRouter`) serves real-looking paths --
`/library`, `/arena/python/beginner`, etc. -- entirely on the client.
A host that just serves files 1:1 will 404 on a direct visit or a page
refresh on any route except `/`, because there's no actual file at
`/library` and no app code has run yet to redirect it.

**The fix: every path that isn't a real static file must be rewritten
to serve `index.html` (status 200, not a redirect).** This repo already
ships the config for the two platforms recommended below:

- `vercel.json` -- a `rewrites` rule plus sensible cache headers
- `netlify.toml` and `public/_redirects` -- same idea, Netlify's own
  format (Cloudflare Pages reads `_redirects` too, same syntax)

If you choose a different host, you need to configure this yourself --
search for "SPA fallback" or "history API fallback" plus your host's
name.

## Recommended hosting: Vercel or Netlify

Both are zero-config for this app (the config files above are just
extra insurance), both serve from the domain root (matching this app's
`base: "/"` default in `vite.config.ts`), both give you free HTTPS and
a global CDN, and both support instant rollback. Pick whichever you
already have an account with.

### Option A: Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. On [vercel.com](https://vercel.com), "Add New Project" -> import the
   repo.
3. Framework preset: Vite (auto-detected). Build command
   `npm run build`, output directory `dist` (auto-detected from
   `vercel.json`).
4. Deploy. Vercel gives you a `*.vercel.app` URL immediately; add a
   custom domain under Project Settings -> Domains whenever you're
   ready.

Or from the CLI, from this directory:

```bash
npm install -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

### Option B: Netlify

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. On [app.netlify.com](https://app.netlify.com), "Add new site" ->
   "Import an existing project".
3. Build command `npm run build`, publish directory `dist` (both
   auto-filled from `netlify.toml`).
4. Deploy. Netlify gives you a `*.netlify.app` URL immediately; add a
   custom domain under Site configuration -> Domain management.

Or from the CLI:

```bash
npm install -g netlify-cli
netlify deploy --build            # preview deploy
netlify deploy --build --prod     # production deploy
```

### Option C: Cloudflare Pages

Same idea as Netlify -- connect the repo, build command `npm run
build`, output directory `dist`. Cloudflare Pages reads the same
`public/_redirects` file Netlify does, so no extra config is needed.

### If you'd rather use GitHub Pages, S3, or a plain nginx/Apache box

These work too, but need one extra step each:

- **GitHub Pages** serves from a repo subpath
  (`username.github.io/interview-arena/`), not the domain root. You'd
  need to set `base: "/interview-arena/"` in `vite.config.ts` (matching
  your actual repo name) before building, and GitHub Pages' SPA
  fallback is typically done via a `404.html` that's a copy of
  `index.html`.
- **S3 + CloudFront**: enable "static website hosting" on the bucket
  with both the index document AND the error document set to
  `index.html` (S3 website hosting returns the error document with a
  200 for this exact purpose), or configure a CloudFront custom error
  response (404/403 -> `/index.html`, HTTP 200) if serving through
  CloudFront in front of a private bucket.
- **nginx**: add `try_files $uri $uri/ /index.html;` inside your
  `location /` block.
- **Apache**: enable `mod_rewrite` and add a `.htaccess` with
  `FallbackResource /index.html` (or an equivalent `RewriteRule`).

## Before you deploy: a pre-flight checklist

Run from this directory:

```bash
npm run typecheck   # must be clean
npm run lint         # must be clean
npm run test         # must all pass
npm run build        # must succeed
npm run preview       # smoke-test the real production build locally first
```

Then, with `npm run preview` running, manually check in a browser:

- The dashboard loads with no console errors.
- Navigate to `/library` directly (paste the URL, don't click into it)
  -- confirms routing doesn't depend on having started at `/`.
- Play one multiple-choice question and one coding question through to
  a real pass -- confirms Pyodide genuinely loads and executes in this
  exact build.
- Open Settings -> Reset all progress, confirm the confirmation dialog
  and reset both work.

(All of the above were already verified as part of the production-
readiness audit this guide accompanies -- this checklist is for
re-verifying after your *next* change, not a one-time task.)

## Custom domain and DNS

Both Vercel and Netlify walk you through this in their dashboard once a
domain is added to the project (you'll add a `CNAME` or `A`/`ALIAS`
record at your DNS provider, and the platform issues a free TLS
certificate automatically, usually within minutes). Neither platform
needs this repo's code changed for a custom domain -- it's entirely a
dashboard + DNS-provider configuration step, not a build-config one.

**This repository does not make any DNS changes.** As of this launch
pass, the repo has been pushed to `github.com/vivekbuildsai/Interview`
(`main`, authorized explicitly for that step) -- but no hosting
platform has been connected and no deployment exists yet. Connecting
Vercel/Netlify and pointing a custom domain both require your own
account and, for the Vercel/Netlify connection step specifically, your
own interactive login (see the main launch report for exactly what's
needed).

## After deploying: what to double check once, live

- Open the deployed URL, then refresh on `/library` and `/progress`
  directly -- this is the one thing that can't be fully verified
  without a real deployed host (see the audit report's note on SPA
  fallback).
- Play through one full session end to end on the real deployed URL,
  not just `localhost` -- confirms the CDN-hosted Pyodide/Monaco scripts
  aren't blocked by any CSP or network policy specific to the hosting
  platform.
- Check the browser console for errors on first load.
