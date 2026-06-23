# Deploying Katie & Alex's wedding app

Stack: **Vercel** (host) · **Turso** (database) · **Resend** (email) · **sherdley-bennett.wedding** (domain).

The repo is already configured for Vercel: `@sveltejs/adapter-vercel`, a daily
reminder cron in `vercel.json`, and the in-process scheduler auto-disables on
Vercel (Cron drives it instead).

---

## 1. Buy the domain

Register **sherdley-bennett.wedding** (`.wedding` is supported by Namecheap and
Cloudflare Registrar — Cloudflare is cheapest and gives you free DNS we'll reuse
for email). Don't add records yet; Vercel and Resend will tell us what to add.

## 2. Create the production database (Turso)

```bash
brew install tursodatabase/tap/turso   # or: curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create wedding
turso db show wedding --url                 # -> DATABASE_URL  (libsql://wedding-<org>.turso.io)
turso db tokens create wedding              # -> DATABASE_AUTH_TOKEN
```

Apply migrations + seed data to it from your machine:

```bash
DATABASE_URL='libsql://…' DATABASE_AUTH_TOKEN='…' npm run db:migrate
DATABASE_URL='libsql://…' DATABASE_AUTH_TOKEN='…' npm run db:seed
```

## 3. Generate the auth secrets

```bash
# Session signing secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Dashboard passcode hash (replace YOUR-PASSCODE):
node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log(s+':'+c.scryptSync('YOUR-PASSCODE',s,32).toString('hex'))"
```

## 4. Deploy to Vercel

Push the branch to GitHub and import the repo at vercel.com (framework auto-detected
as SvelteKit), **or** `npm i -g vercel && vercel`.

Set these Environment Variables (Production) in the Vercel project:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `libsql://…turso.io` |
| `DATABASE_AUTH_TOKEN` | from step 2 |
| `SESSION_SECRET` | from step 3 |
| `ADMIN_PASSCODE_HASH` | from step 3 |
| `PUBLIC_BASE_URL` | `https://sherdley-bennett.wedding` |
| `SLACK_WEBHOOK_URL` | your `#wedding` incoming webhook |
| `CRON_SECRET` | any random string (Vercel auto-sends it to the cron) |

Deploy. The daily reminder cron (`/api/cron/timeline-check`, 08:00 UTC) is picked
up automatically from `vercel.json`.

## 5. Custom domain

Vercel project → **Settings → Domains** → add `sherdley-bennett.wedding` (and
`www`). Add the A/CNAME records Vercel shows to your registrar's DNS. HTTPS is
automatic.

## 6. Email inbox (Resend)

1. resend.com → **Add Domain** `sherdley-bennett.wedding` → add the SPF/DKIM/MX
   DNS records it generates.
2. Create an API key → later set `RESEND_API_KEY` in Vercel.
3. Inbound: Resend → **Inbound** → route `hello@sherdley-bennett.wedding` to a
   webhook (we'll build `/api/inbound/email` in the AI phase).

Outbound sending works as soon as the domain verifies; inbound + the AI loop come
in the AI phase.

---

## Notes
- **Migrations on future deploys:** run `npm run db:migrate` against Turso whenever
  `src/lib/server/db/schema.ts` changes (currently up to `0009`).
- **If the DB fails to load on Vercel** (native-binding error): switch the client
  in `src/lib/server/db/index.ts` to `import { createClient } from '@libsql/client/web'`
  — pure HTTP, no native module. Only needed if the auto-client misbehaves on serverless.
