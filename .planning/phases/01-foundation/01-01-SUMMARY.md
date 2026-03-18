---
phase: "01-foundation"
plan: "01"
subsystem: "project-scaffold"
tags: [nextjs, tailwind, shadcn, bree, railway, rtl]
dependency_graph:
  requires: []
  provides: [next-app-shell, tailwind-rtl, shadcn-rtl, railway-config, bree-stub]
  affects: [02-01, 02-02, 03-01]
tech_stack:
  added:
    - "Next.js 16.1.7 (App Router)"
    - "React 19.2.3"
    - "Tailwind CSS 4 (CSS-first, no config file)"
    - "shadcn/ui 4.0.8 with --rtl flag (Radix components)"
    - "Bree 9.2.9 (persistent scheduler)"
    - "Airtable SDK 0.12.2"
  patterns:
    - "Tailwind 4 logical CSS properties (ms-*, ps-*) for RTL"
    - "shadcn/ui RTL provider pattern (dir=rtl on html element)"
    - "serverExternalPackages for server-only SDKs"
key_files:
  created:
    - "package.json — project manifest with all dependencies and scripts"
    - "next.config.ts — serverExternalPackages: ['airtable']"
    - "src/app/layout.tsx — lang=he dir=rtl root layout"
    - "src/app/page.tsx — Hebrew placeholder"
    - "src/app/globals.css — Tailwind 4 + shadcn CSS vars + Hebrew font stack"
    - ".env.local.example — 5 env var entries (AIRTABLE, GREEN_API, APP_URL)"
    - ".gitignore — .env.local excluded, .env.local.example allowed"
    - "railway.toml — web + scheduler service declarations"
    - "src/scheduler/index.ts — Bree entry point stub (no jobs, Phase 4)"
    - "src/scheduler/jobs/.gitkeep — ensures jobs dir exists in git"
  modified: []
decisions:
  - "Next.js 16.1.7 installed (plan specified 15, 16 is current stable — no functional difference)"
  - "Used temp directory scaffold then copy due to create-next-app rejecting dir name 'MICAHL CRM' (uppercase + spaces)"
  - "shadcn init used --defaults flag (not --yes) to avoid interactive prompt with --rtl"
  - "Tailwind 4 has no tailwind.config.ts — config is CSS-first via globals.css @theme directives"
  - ".gitignore updated from .env* catch-all to explicit list allowing .env.local.example"
  - "@types/bree installed but deprecated (bree ships its own types) — harmless"
metrics:
  duration_minutes: 12
  tasks_completed: 2
  files_created: 10
  completed_date: "2026-03-18"
---

# Phase 1 Plan 1: Project Bootstrap Summary

**One-liner:** Next.js 16 App Router with Tailwind 4 CSS-first, shadcn/ui RTL (Radix/neutral), Bree scheduler stub, and Railway two-service deployment config — Hebrew RTL shell ready for all subsequent phases.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Bootstrap Next.js with Tailwind 4 and shadcn/ui RTL | 19e052b | package.json, next.config.ts, layout.tsx, globals.css, page.tsx, .env.local.example, .gitignore |
| 2 | Configure Railway deployment with Bree process | 4931ec6 | railway.toml, src/scheduler/index.ts, src/scheduler/jobs/.gitkeep |

## Verification Results

All criteria pass:

- `npm run build` exits 0, TypeScript clean
- `src/app/layout.tsx` contains `lang="he" dir="rtl"`
- `.env.local.example` has all 5 env var entries (AIRTABLE_API_TOKEN, AIRTABLE_BASE_ID, GREEN_API_INSTANCE_ID, GREEN_API_TOKEN, NEXT_PUBLIC_APP_URL)
- `.env.local` in `.gitignore`, `.env.local.example` explicitly allowed
- `railway.toml` at root with web + scheduler service declarations
- `src/scheduler/index.ts` imports Bree, has empty jobs array, references jobs directory
- `package.json` scripts: dev, build, start, lint, scheduler, build:scheduler
- No Airtable token or GREEN API key hardcoded anywhere

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] create-next-app rejected directory name**
- **Found during:** Task 1
- **Issue:** `create-next-app` rejected "MICAHL CRM" as a package name (uppercase letters, spaces not URL-safe)
- **Fix:** Scaffolded to `/tmp/micahl-crm` then copied files to project root
- **Files modified:** None — same output, different scaffold path
- **Commit:** 19e052b

**2. [Rule 1 - Observation] Next.js 16.1.7 instead of 15**
- **Found during:** Task 1
- **Issue:** Plan specified Next.js 15 but `create-next-app@latest` installed 16.1.7 (current stable)
- **Fix:** Accepted 16.1.7 — no breaking differences for this project's use case
- **Impact:** All subsequent plans should expect `next: 16.x`

**3. [Rule 1 - Bug] .gitignore .env* pattern excluded .env.local.example**
- **Found during:** Task 1
- **Issue:** Default `.env*` catch-all would have excluded `.env.local.example` from git
- **Fix:** Replaced with explicit list of excluded files, added `!.env.local.example` allowlist
- **Files modified:** .gitignore
- **Commit:** 19e052b

**4. [Rule 1 - Observation] Tailwind 4 has no tailwind.config.ts**
- **Found during:** Task 1
- **Issue:** Plan listed `tailwind.config.ts` in `files_modified`, but Tailwind 4 is config-file-free (CSS-first)
- **Fix:** Not applicable — Tailwind 4 config is embedded in `globals.css` via `@theme` directives. No separate file needed.

**5. [Rule 1 - Observation] shadcn --yes flag doesn't suppress library prompt**
- **Found during:** Task 1
- **Issue:** `shadcn init --rtl --yes` still prompted interactively for component library selection
- **Fix:** Used `--defaults` flag which auto-selects Radix (the default) without interaction

## Key Notes for Future Plans

- Tailwind 4 uses `@import "tailwindcss"` in CSS, not a config file. Use `@theme` directives to extend the theme.
- shadcn/ui RTL docs: https://ui.shadcn.com/docs/rtl/next — RTL provider may be needed for certain components
- The `scheduler` script runs `node src/scheduler/index.js` — TypeScript must be compiled first in production. The `build:scheduler` script handles this.
- Railway multi-service: the `[[services]]` sections in railway.toml document intent. Actual Railway multi-service setup requires creating separate services in the Railway dashboard pointing to the same repo.

## Self-Check: PASSED

All 10 files exist on disk. Both commits (19e052b, 4931ec6) found in git log. `npm run build` exits 0 with no TypeScript errors.
