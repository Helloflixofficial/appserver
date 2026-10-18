# Vercel deployment notes

This is a standalone copy of the Termini Next.js backend project. The original source remains in `backend_repo`.

## Build settings

- Framework preset: Next.js
- Project root: this folder (`appserver`) if imported from a repository; for the original monorepo, use `backend_repo`.
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: leave the Next.js default
- Node.js version: choose 22.x in Vercel Project Settings

The package postinstall generates Prisma Client. The Vercel deployment must use the Next.js app routes; the local `server.js` listener is for running the standalone API locally. A Node-runtime catch-all is included here to preserve server.js API handlers for paths without a dedicated Next.js route.

## Environment variables

Add production values in Vercel Project Settings → Environment Variables. Never upload `.env` or commit secret values. Use the variable names in `.env.example`; the app uses PostgreSQL, Clerk, UploadThing, Stripe, LiveKit, and Firebase where those features are enabled. Import `.env.vercel` for the existing test setup or add the same values in Project Settings. Enable Vercel system environment variables; the app derives its deployed URL from Vercel when `NEXT_PUBLIC_APP_URL` is unset. Add the exact origin to `CORS_ORIGINS` only if a separate website origin must call this server. Configure optional Stripe, UploadThing, LiveKit, and Firebase values before enabling those features. Use `PG_POOL_MAX=1` with a pooled Neon connection string for serverless deployments.

## Start the Vercel setup

1. Sign into Vercel and create a project named `appserver` (or choose an existing backend project deliberately).
2. Connect the source repository, or use the Vercel CLI from this folder if deploying this standalone local copy directly.
3. For Git import from the Termini monorepo, set the project Root Directory to `backend_repo`; for this standalone copy, set it to the repository root.
4. Add the environment variables in Vercel before deploying. Keep secret values in Vercel's secret fields and never paste them into chat or source files.
5. Deploy a Preview first, verify `/healthz` and the mobile API routes, then promote to Production.

Vercel's Next.js integration builds Next.js routes as functions. It does not run the custom `server.js` process as a continuously listening server. Long-running processes and local video-file streaming are not provided by this setup; keep media on UploadThing/Neon or use a host designed for a persistent Node server if any endpoint depends on local files or a permanent process.