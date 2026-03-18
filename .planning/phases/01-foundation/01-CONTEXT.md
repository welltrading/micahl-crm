# Phase 1: Foundation - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Next.js project deployed on Railway, Airtable schema with 5 tables fully defined, server-only service layer for all Airtable access, and Hebrew RTL dashboard layout with navigation. Settings page with step-by-step integration guides for GREEN API and MAKE.com webhook.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout & navigation
- Persistent sidebar on the right (RTL) with icons + Hebrew labels
- Sidebar items from day one: תפריט (Dashboard), קמפיינים (Campaigns), אנשי קשר (Contacts), הגדרות (Settings)
- Campaigns and Contacts pages show "בקרוב" placeholder until their phases ship
- Landing page: overview with key stats — upcoming campaigns, recent contacts, GREEN API status
- Mobile: hamburger menu (☰) — sidebar hides behind icon, opens as overlay on tap

### Airtable schema
- Hebrew field names throughout (שם_קמפיין, תאריך_אירוע, טלפון, סטטוס, etc.)
- All 5 tables visible to Michal: Campaigns, Contacts, CampaignEnrollments, ScheduledMessages, MessageLog
- Seed base with sample data for development and testing — Michal deletes when going live

### Claude's Discretion
- Table names (Hebrew vs English) — pick based on Airtable API best practices
- Settings page layout and step-by-step guide format
- Visual style, color palette, typography
- Exact sidebar icon choices
- Loading states and error handling patterns

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- shadcn/ui with --rtl flag for components (decided in project setup)
- Tailwind 4 logical CSS properties (ms-*, ps-*) for RTL
- Next.js App Router (standard for new projects)

### Integration Points
- Railway deployment with Bree scheduler as persistent process
- Airtable Personal Access Token (server-side only, never exposed to client)
- GREEN API v2 for WhatsApp
- MAKE.com webhook endpoint for contact intake (Phase 2, but settings page references it)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-17*
