# Production deployment

Deploy the Next.js frontend and Express API as separate Vercel projects from
this monorepo. The frontend project uses the repository root; the API project
uses `dine-os-api` as its Root Directory. The API exports its HTTP server for
Vercel Functions and still starts normally for local or long-running Node
deployments.

## Frontend

Set these values in the frontend Vercel project's **Production** environment before its
production build. `NEXT_PUBLIC_*` values are embedded in the browser bundle at
build time.

- `NEXT_PUBLIC_DINE_OS_API_URL`: public HTTPS URL of the API project. Prefer
  `https://api.apnacafe.in` after assigning that domain to the API project.
- `NEXT_PUBLIC_TENANT_SLUG`: `apna-cafe`.
- `NEXT_PUBLIC_OWNER_WHATSAPP`: WhatsApp number with country code and digits
  only.

The supplied website origin is `https://apnacafe.in`. If the site also serves
`www.apnacafe.in`, add that exact origin to the API's `ALLOWED_ORIGINS` too.

## API

Configure the API Vercel project with `dine-os-api` as its Root Directory.

- Build command: `npm run build` (Vercel installs dependencies automatically).
- Framework preset: Express, detected automatically from `src/server.ts`.
- Health check: open `/health` on the deployed API URL.

Vercel does not provide a database migration release phase. Run
`npm run db:deploy` from `dine-os-api` against the production database before
deploying API changes that require schema updates. Run `npm run db:seed` only
once for a new database.

Set `NODE_ENV=production`, a hosted PostgreSQL `DATABASE_URL`, a random
`JWT_SECRET` of at least 32 characters, a different random `ADMIN_SECRET_KEY`
of at least 32 characters, a unique `OWNER_PASSWORD`, and `OWNER_EMAIL`.
Set `ALLOWED_ORIGINS` to the exact HTTPS origin(s) of the frontend, separated
by commas with no trailing slash. For the current domain, use
`https://apnacafe.in`. Add `https://www.apnacafe.in` only if the site serves
that origin too. Set `TENANT_SLUG=apna-cafe` and
`TENANT_NAME=Apna Cafe`.

Set the frontend's `NEXT_PUBLIC_DINE_OS_API_URL` to the API's final HTTPS URL,
then redeploy the frontend. Add that same API URL as the API project's custom
domain if using `api.apnacafe.in`; CORS origins should remain the website's
origins, not the API hostname.

If the database is new, run `npm run db:seed` once after migrations. Do not
seed on every deployment. Configure `TENANT_UPI_ID` and `TENANT_UPI_NAME` if
customers should be able to pay by UPI; cash ordering can work without them.

Phone OTP sign-in is intentionally disabled in production until an SMS delivery
provider is configured. Demo OTPs are only returned in development.

The admin dashboard also refreshes from the API every 30 seconds, so order
counts remain current if a realtime socket reconnects or an event is missed.
Socket.IO currently keeps room delivery in process memory; Vercel may route
requests and sockets to different function instances. For immediate, reliable
cross-instance push, add a Socket.IO Redis adapter and configure its Redis
connection before relying on realtime updates alone.

Use the sample files [`.env.production.example`](.env.production.example) and
[`dine-os-api/.env.production.example`](dine-os-api/.env.production.example)
as checklists. Do not commit real credentials or paste secrets into chat.
