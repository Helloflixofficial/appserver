# Termini Backend

Next.js backend and API for the Termini learning platform. It uses PostgreSQL with Prisma and includes authentication, course, community, payment, media, and meeting integrations.

## Requirements

- Node.js 22.x
- npm
- PostgreSQL database (Neon is supported)

## Run locally

1. Copy `.env.example` to `.env` and fill in the values for the services you use. Never commit `.env` or paste secrets into chat.
2. Install dependencies: `npm ci`
3. Start the Next.js app: `npm run dev:http`
4. For the standalone local API listener, use `npm run dev:api` instead. Do not run both on the same port.

The web/API app listens on port 3000 by default. Check `http://localhost:3000/api/health` (or `/healthz`, depending on deployment routing) for the health endpoint.

## Deploy to Vercel

1. Import this repository into Vercel and select the repository root as the Root Directory.
2. Use the Next.js framework preset, `npm ci` as the install command, and `npm run build` as the build command. Leave the output directory at its default.
3. Set the project Node.js version to 22.x.
4. Add production environment variables from `.env.example` in Project Settings → Environment Variables. Add actual secret values directly in Vercel, not in Git. Configure the Production environment and redeploy after changes.
5. Deploy a Preview and verify the health endpoint and app APIs before using Production.

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for deployment details and limitations. Vercel runs Next.js routes as serverless functions; it does not keep the custom `server.js` HTTP listener alive as a persistent service. Local-file streaming and long-lived connections need an appropriate persistent host or external storage/service.

## Security

- `.env*` files, service-account JSON, signing keys, and deployment credentials are excluded from Git and Vercel uploads.
- `.env.example` contains variable names and placeholders only; verify placeholders are replaced in the hosting environment.
- Rotate any credential that has ever been committed or shared publicly.
