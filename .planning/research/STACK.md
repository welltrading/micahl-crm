# Stack Research

**Domain:** WhatsApp CRM + Campaign Manager (Single-user, Airtable-backed, Hebrew RTL)
**Researched:** 2026-03-17
**Confidence:** MEDIUM-HIGH (core stack HIGH; scheduling decision MEDIUM due to deployment dependency)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.x (latest stable) | Full-stack framework | App Router gives a clean split between React UI and Node.js API routes; single repo for frontend + backend logic; Railway/Render support first-class. Next.js 15+ is stable — Next.js 16.1.6 is current as of Mar 2026. |
| React | 19.x | UI rendering | Ships with Next.js 16; required for concurrent features used by shadcn v2 components. |
| TypeScript | 5.x | Type safety | Airtable field names are error-prone to refactor; TS catches column name mismatches at compile time rather than at 2am when a campaign fires. |
| Tailwind CSS | 4.x | Styling | Ships via `@tailwindcss/postcss` in Next.js 16 projects; zero-config content detection; CSS-native config via `@theme`. RTL logical utilities (`ms-*`, `ps-*`, `start-*`) work natively. |
| shadcn/ui | latest (Jan 2026 RTL release) | Component library | First-class RTL support added January 2026. CLI handles physical-to-logical class transformation at install time via `--rtl` flag. Radix UI primitives underneath give accessible dropdowns, dialogs, and tables for free. Copy-paste model means no locked-in dependency. |

### Data Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| airtable (npm) | 0.12.2 | Airtable REST API client | Official Airtable SDK. Actively maintained (issues as recent as Jan 2026). The slow release cadence (3 years since last publish) is not a concern — the Airtable REST API is stable and this package wraps it correctly. Avoid community forks for a production use case. |
| Airtable REST API (direct fetch fallback) | v0 | Bulk operations / filtering | For operations where the SDK's pagination or filtering is awkward, raw `fetch` to `https://api.airtable.com/v0/{baseId}/{tableId}` is always an option. Keep in back pocket. |

### WhatsApp Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @green-api/whatsapp-api-client-js-v2 | latest | Send WhatsApp messages via GREEN API | This is the **current** v2 SDK — the original `@green-api/whatsapp-api-client` is explicitly marked as outdated/legacy on the official docs. v2 is TypeScript-native, uses a clean class-based API, and matches what GREEN API documents as current. Single `sendMessage` call with `chatId` + `message`. |

> Note: GREEN API also exposes a plain REST endpoint (`POST /waInstance{id}/sendMessage/{token}`) if you ever need to bypass the SDK. The SDK is just a thin wrapper over this. Prefer the SDK to avoid manually constructing URLs.

### Scheduler

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Bree | 9.x (9.2.9, published Mar 2026) | In-process job scheduler | No Redis. No MongoDB. No external service. Runs jobs in isolated worker threads (not the main thread). Supports cron syntax, `Date` objects, and human-readable intervals (`'5 minutes'`). Actively maintained. Perfect fit: single-user app, low job volume (1-2 campaigns/month), deployed as a persistent server. |

> Why not BullMQ: requires Redis, which adds a managed database cost and operational complexity for a single-user tool with ~10 messages per campaign.

> Why not Vercel Cron: requires Vercel hosting; jobs run as serverless invocations with a max 15-minute timeout; can't maintain in-memory job state; every deployment re-triggers cron setup (documented Vercel issue #51509).

> Why not node-cron: runs jobs in the main thread; multiple cron registrations on hot reloads in Next.js dev mode; no job persistence if the process restarts.

> Bree caveat: requires a **persistent server** (Railway, Render, VPS — not Vercel serverless). This is a deployment constraint, not a flaw. See deployment section.

### Deployment

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Railway | — | Hosting | Persistent Node.js process (not serverless). Usage-based billing — idle server costs very little. Official Next.js Railway template exists (`github.com/nextjs/deploy-railway`). Supports native cron jobs at the platform level too as a safety net. Dead-simple deploys via GitHub push. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Noto Sans Hebrew (`next/font/google`) | — | Hebrew typography | Import as `Noto_Sans_Hebrew` from `next/font/google`; assign to `--font-sans` CSS variable. Required — system fonts render Hebrew poorly across platforms. |
| date-fns | 4.x | Date/time arithmetic | Computing "7 days before event", "morning of event (08:00)", "30 minutes before". Lightweight, tree-shakeable, no Moment.js bloat. |
| zod | 3.x | Schema validation | Validate Airtable API responses before processing (field names, types). Also validates campaign form inputs. Pairs with `react-hook-form`. |
| react-hook-form | 7.x | Form management | Campaign creation form, message scheduling form. Pairs with zod via `@hookform/resolvers`. |
| @hookform/resolvers | 3.x | zod adapter for react-hook-form | Connects zod schemas to form validation. |
| lucide-react | latest | Icons | shadcn/ui's default icon library. RTL-aware (icons flip automatically with `rtl:rotate-180` class). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package manager | Faster installs, better monorepo support than npm. shadcn CLI works with pnpm. Use `pnpm dlx shadcn@latest create --template next --rtl` for project init. |
| ESLint + Next.js config | Linting | Ships with Next.js. Catches React hook violations before they surface as runtime scheduler bugs. |
| Prettier | Formatting | Add `prettier-plugin-tailwindcss` to auto-sort Tailwind classes. |

---

## Installation

```bash
# Create project with RTL support
pnpm dlx shadcn@latest create --template next --rtl

# OR if starting from create-next-app:
pnpm create next-app@latest micahl-crm --typescript --tailwind --app --no-src-dir

# Airtable SDK
pnpm add airtable

# GREEN API v2 SDK
pnpm add @green-api/whatsapp-api-client-js-v2

# Scheduler
pnpm add bree

# Date utilities + validation + forms
pnpm add date-fns zod react-hook-form @hookform/resolvers

# Icons (usually included via shadcn)
pnpm add lucide-react

# Dev dependencies
pnpm add -D @types/bree prettier prettier-plugin-tailwindcss
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Bree (scheduler) | BullMQ | When you need multi-server job distribution, high job volume (thousands/day), or already have Redis in the stack. Not this project. |
| Bree (scheduler) | Vercel Cron | If you are committed to Vercel deployment and can accept serverless limitations (no persistent state, max 15 min execution, cold starts). Not this project — cron must fire reliably. |
| Bree (scheduler) | node-cron | Only if you never need job persistence across restarts and accept jobs running in the main thread. Too fragile for a system where "messages must fire on time" is the core promise. |
| Bree (scheduler) | Agenda.js | If you already have MongoDB and want human-readable schedule definitions with dashboard UI. Adds a whole database dependency for no benefit here. |
| @green-api/whatsapp-api-client-js-v2 | Raw fetch | If the SDK has a breaking bug and you need to ship fast. The REST endpoint is well-documented and simple enough to call directly. |
| airtable (npm) | airtable-ts | If you want full TypeScript type safety on Airtable fields (auto-generated types from base schema). Worthwhile enhancement post-MVP but adds setup friction upfront. |
| Railway | Render | Both are valid persistent-server platforms. Render has a free tier that sleeps after inactivity — bad for a scheduler. Railway's usage-based model stays awake. |
| Railway | Vercel | Only if you remove Bree and switch to Vercel Cron. This is a valid alternative architecture but trades scheduling reliability for deployment simplicity. |
| shadcn/ui | Mantine | Mantine has good RTL support and built-in components (DataTable, Calendar). Heavier bundle, less control over styles. Use if you need a full data grid out of the box. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| MAKE.com / Zapier | This is what the project is replacing. Re-introducing it recreates the exact problem being solved. | Bree scheduler inside the app |
| Google Sheets / App Script | Same as above — the existing stack is the problem. | Airtable as the single database |
| Vercel (for this architecture) | Serverless functions cannot run persistent schedulers. Cron jobs re-register on every deployment (verified Vercel GitHub discussion #51509). | Railway (persistent Node.js process) |
| node-cron in Next.js App Router | App Router hot reloads register duplicate cron jobs in dev mode. No job persistence across restarts. Runs on main thread. | Bree (worker threads, persistent) |
| Bull (original, not BullMQ) | Bull is in maintenance mode as of 2023. BullMQ is the successor — but even BullMQ requires Redis, which is overkill here. | Bree |
| @green-api/whatsapp-api-client (v1) | Explicitly marked as "outdated and left for compatibility" on GREEN API official docs as of Mar 2026. | @green-api/whatsapp-api-client-js-v2 |
| Moment.js | Deprecated, large bundle. | date-fns (tree-shakeable, modern) |
| next-intl / i18n routing | Overkill for a single-language (Hebrew-only) app. Adds routing complexity for zero benefit. | Set `dir="rtl" lang="he"` on `<html>` directly; use shadcn RTL CLI. |
| Prisma / Drizzle ORM | Airtable is not a SQL database. ORMs add no value when your "schema" is Airtable base columns. | airtable npm SDK directly |

---

## Stack Patterns by Variant

**If deployed on Vercel (alternative architecture):**
- Remove Bree entirely
- Use Vercel Cron (`vercel.json` cron triggers) pointing at `/api/send-scheduled` route
- Store scheduled job state in Airtable itself (poll the table for due messages)
- Accept: 1-minute minimum cron granularity on paid plan, jobs can fail silently if cold-start exceeds timeout
- This is a valid architecture but less reliable for time-critical message delivery

**If message volume grows beyond 100/day:**
- Replace Bree with BullMQ + Redis (Upstash Redis managed service ~$0/month for low volume)
- Add a job monitoring dashboard (BullMQ Board or Bull Dashboard)

**If Michal wants to edit campaigns from her phone:**
- Add `viewport: responsive` (already default in Next.js)
- shadcn/ui components are mobile-friendly out of the box
- No separate mobile build needed

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 16.x | React 19.x | React 19 is required (not optional) for Next.js 16 App Router |
| shadcn/ui (Jan 2026+) | Tailwind CSS 4.x | RTL feature requires Tailwind 4 logical utilities (`ms-*`, `start-*`); not available in Tailwind 3 |
| Bree 9.x | Node.js 18+ | Worker threads API requires Node.js 12.17+ minimum; Node 18 (LTS) recommended for Railway |
| airtable 0.12.2 | Node.js 10+ | Known issue #386: AbortSignal error in some environments; workaround exists in repo issues |
| @green-api/whatsapp-api-client-js-v2 | Node.js 16+ | TypeScript-native; ESM compatible |
| date-fns 4.x | TypeScript 5.x | v4 is ESM-first; ensure `moduleResolution: "bundler"` in tsconfig |

---

## Architecture Note on Scheduler Placement

Bree jobs must be initialized in a **persistent server process**, not inside Next.js API route handlers (which are stateless). The correct pattern:

1. Create a `scheduler/index.ts` file that initializes Bree
2. Import and start it in a custom Next.js server (`server.ts`) or a standalone Node.js process alongside Next.js
3. On Railway: the `next start` command keeps the process alive; initialize Bree before calling `nextStart()`

```
server.ts
  └── starts Bree (scheduler)
  └── starts Next.js server

Bree jobs (scheduler/jobs/*.ts)
  └── job: check-due-messages.ts  (runs every minute)
  └── job: send-campaign.ts       (triggered on demand)
```

The check-due-messages job queries Airtable for messages where `scheduled_at <= now` and `status = 'pending'`, then calls the GREEN API for each one. Simple, reliable, no Redis.

---

## Sources

- [airtable npm package](https://www.npmjs.com/package/airtable) — version 0.12.2, last published ~3 years ago but maintained (issues filed Jan 2026)
- [GREEN API Node.js v2 SDK docs](https://green-api.com/en/docs/sdk/nodejs/client-v2/) — confirms v1 is deprecated, v2 package name and install command
- [shadcn/ui RTL changelog Jan 2026](https://ui.shadcn.com/docs/changelog/2026-01-rtl) — confirms `--rtl` CLI flag, DirectionProvider, logical class transformation
- [shadcn/ui RTL Next.js setup](https://ui.shadcn.com/docs/rtl/next) — exact setup steps verified
- [Bree GitHub](https://github.com/breejs/bree) — version 9.2.9, published Mar 2026, worker thread architecture confirmed
- [Next.js 15.5 release blog](https://nextjs.org/blog/next-15-5) — confirms Next.js 16 as current stable
- [Tailwind CSS v4 compatibility](https://tailwindcss.com/docs/compatibility) — browser support, PostCSS setup
- [BullMQ requires Redis](https://github.com/taskforcesh/bullmq/discussions/2412) — confirmed no Redis-free mode
- [Vercel cron re-trigger on deploy issue](https://github.com/vercel/next.js/discussions/51509) — documented problem with Vercel Cron
- [Railway Next.js deploy template](https://github.com/nextjs/deploy-railway) — official template, persistent process confirmed
- [Better Stack Node.js schedulers comparison](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) — MEDIUM confidence (WebSearch, single source)

---

*Stack research for: WhatsApp CRM + Campaign Manager (מיכל CRM)*
*Researched: 2026-03-17*
