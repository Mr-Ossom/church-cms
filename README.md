# ChurchOS

A single-church management system for members, families, groups, events, attendance, giving, communication and a member-facing portal. Built mobile-first and installable as a PWA.

## Features

- **Members & families** — directory, CSV import/export, photos, household links, notes.
- **Groups & ministries** — leaders, rosters, meeting details.
- **Events** — services, meetings and gatherings with visibility rules for groups, leaders and staff.
- **Attendance** — sessions with headcounts, per-person check-in, and an offline queue that syncs automatically.
- **Giving** — tithes, offerings, pledges and printable receipts. Individual giving rows are visible to administrators only; pastors see aggregates.
- **Communication** — in-app announcements, bulk SMS (Africa's Talking or Twilio), WhatsApp share links and a delivery log.
- **Reports** — membership growth, attendance trends, giving summaries and CSV exports.
- **Member portal** — `/portal` for events, announcements, giving history and profile, with a PWA install prompt.
- **Self-service signup** — members create and verify their own account and get a linked visitor record; staff accounts still come through invites.
- **Settings** — church profile, team invitations and role management, linked member records, and an audit trail.

## Stack

- Next.js 16 (App Router) + React 19
- Supabase (Postgres, Auth, Row Level Security, Storage)
- Tailwind CSS v4, Recharts, Zod, TypeScript

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com).

3. Apply the schema. In the Supabase SQL editor, run the SQL files in
   `supabase/migrations` in filename order. Optionally run `supabase/seed.sql`
   afterwards to load demo data (Grace Chapel, 20 members, groups, events, giving).

   With the Supabase CLI you can instead run `supabase db push`.

4. Copy `.env.example` to `.env.local` and fill in:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # needed for team invites
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

5. In Supabase **Authentication**, enable sign-ups and **Confirm email** under
   **Providers → Email**, then set the Site URL and add
   `http://localhost:3000/auth/callback` (plus your production callback) as a redirect URL under
   **URL Configuration**.

6. Create the first administrator: **Authentication → Users → Add user** with an email and
   password. The database trigger creates a profile with the `member` role. Then promote it in
   the SQL editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

7. Run the app:

   ```bash
   npm run dev
   ```

   Sign in at `/login`, or create a member account at `/signup`. Self-signup creates a linked
   visitor record that administrators can update in the member directory. Further team members can
   be invited from **Settings → Team access** (this sends a Supabase invite email and requires the
   service role key).

## Signup and invites

- **Members:** register at `/signup`, confirm the email link, then use the portal. A `visitor`
  member record is created automatically and linked to the login.
- **Staff and leaders:** administrators add them from **Settings → Team access**. Invites keep their
  assigned role and do not create visitor records.
- Configure a custom SMTP provider for production email delivery; Supabase's built-in email service
  is rate-limited. Consider adding CAPTCHA/rate limits if signup is fully public.

## SMS setup

Set `SMS_PROVIDER` to `africastalking` (default) or `twilio`, then fill in the matching
credentials in `.env.local`:

- **Africa's Talking:** `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`, `SMS_SENDER_ID`
- **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`

If SMS is not configured the communication page still works; broadcasts are disabled with a
notice, while announcements and WhatsApp share links remain available.

## Roles

| Role | Access |
| --- | --- |
| `admin` | Everything: members, families, giving (individual records), reports, settings, team, invites |
| `pastor` | Members, families, events, attendance, communication, reports, giving aggregates |
| `leader` | Dashboard, own groups, events, attendance, group announcements, WhatsApp sharing |
| `member` | Member portal: events, announcements, own giving, profile |

Access is enforced in the app **and** by Postgres RLS policies. Members can only read their own
member record, giving and attendance; only admins can read individual donations. Leaders are
scoped to groups they lead.

## PWA

The app ships with `public/manifest.webmanifest`, a service worker (`public/sw.js`) and icons.
Install prompts appear on supported browsers when served over HTTPS (or `localhost`). Replace
`public/icon.svg`, `public/icon-192.png` and `public/icon-512.png` with your church branding.

## Scripts

```bash
npm run dev        # develop
npm run build      # production build
npm run start      # run the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Project layout

```
src/app/(auth)             login, signup, password reset
src/app/(dashboard)        staff application (members, giving, reports, settings, ...)
src/app/portal             member portal + PWA prompt
src/app/receipt/[id]       printable giving receipts
src/app/api                CSV exports and attendance check-in endpoint
src/components             UI kit, charts, portal and attendance components
src/lib                    Supabase clients, auth guards, schemas, SMS adapter, helpers
supabase/migrations        schema, RLS, triggers, RPCs
supabase/seed.sql          optional demo data
```

## Deployment notes

- Deploy to Vercel (or any Node host) and set the same environment variables in the host.
- Set `NEXT_PUBLIC_SITE_URL` to the production URL so signup confirmation, invite and reset emails link correctly.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only — never expose it with a `NEXT_PUBLIC_` prefix.
- Self-service membership signup is enabled; team accounts are still onboarded through invites. Use custom SMTP and rate limiting before a public launch.
- The migration creates a public-read `member-photos` storage bucket; uploads are restricted to
  staff.
