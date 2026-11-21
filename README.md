This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## QR ordering

Customers can open `/order` and choose any active table. Links such as
`/order?table=4` and `/t/table4` open the specified table. The API issues a
short-lived signed table session so the order remains attached to that table
without exposing its permanent QR token. Set `NEXT_PUBLIC_OWNER_WHATSAPP` in
`.env.local` to the cafe WhatsApp number, including the country code and
without `+`, to enable order notifications and waiter calls.
Apna Cafe currently uses Tables 1–4.

For permanent table QR codes, configure and seed the API database first, then
generate printable QR images with:

```bash
npm run generate:qrs -- --base-url https://apnacafe.in
```

The PNG files are written to `public/qr/`; print and place each matching
table's image. Replace old QR codes so orders are linked to an unguessable
table token and appear in the admin dashboard. On checkout, the API records
the order and opens a prefilled WhatsApp message; the customer must still
press Send in WhatsApp.

## Admin dashboard

See [DEPLOYMENT.md](DEPLOYMENT.md) for production environment variables,
API deployment commands, migration setup, and the OTP limitation.

Open `/admin` and sign in with `ADMIN_SECRET_KEY` from `dine-os-api/.env`.
The dashboard shows today's pending orders, unpaid bills, and cash/UPI
collections. Menu items can be added, edited, removed from the customer menu,
and restored; removing an item keeps its historical order records. Staff can
mark an unpaid bill as Cash paid or UPI paid after checking that payment was
received; each change refreshes the dashboard.

Orders placed through the website or a table QR code are saved to the database
before WhatsApp opens, then appear in the dashboard's live order list. Orders
sent directly in WhatsApp, outside the website flow, are not received by the
dashboard.

The API database must be reachable, migrated, and seeded before admin login or
orders can work. Configure `DATABASE_URL`, `JWT_SECRET`, and `ADMIN_SECRET_KEY`
in `dine-os-api/.env`, then run:

```bash
cd dine-os-api
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, and ADMIN_SECRET_KEY in .env first.
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

For customer UPI QR payments, also set the real `TENANT_UPI_ID` and
`TENANT_UPI_NAME` in `dine-os-api/.env` before seeding. The QR encodes the
server-confirmed order amount; staff must still verify the received payment
and mark it paid in the admin panel.

Set `NEXT_PUBLIC_DINE_OS_API_URL` in the frontend environment (default:
`http://localhost:4000`). The dashboard receives order and waiter-call updates
over Socket.IO and refreshes every 30 seconds as a fallback.
