# Feature Research

**Domain:** WhatsApp Campaign Manager + Simple CRM (single-user, business coach)
**Researched:** 2026-03-17
**Confidence:** HIGH

---

## Context Note

This is a bespoke tool for one person (Michal), not a SaaS product. The "competition" is not other products — it is the current manual workflow: MAKE.com + Google Sheets + App Script rebuilt from scratch per event. Features are evaluated against that baseline, not against commercial tools. Every feature must justify its cost relative to replacing that pain.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must exist or the tool has failed its core purpose. These replace the existing manual workflow — missing any one of them means Michal still needs the old system.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create a campaign (event) with name + date/time | Core replacement for building MAKE.com automation per event | LOW | Name, event date, event time — that's all needed |
| Attach a list of messages to a campaign with send-timing rules | The "program" that replaces App Script scheduling logic | MEDIUM | Timing rules: N days/hours before event, or fixed datetime. Content is plain text. |
| Automatic message scheduling based on event date | The whole point — messages go out without manual triggering | MEDIUM | When event date changes, all message send-times must recalculate |
| Send a broadcast message to all contacts in a campaign | Replaces sending manually or setting up MAKE.com trigger | MEDIUM | Single message → all registrants. No personalization needed in v1. |
| Message send status screen (sent / pending / failed) | Michal must be able to verify messages actually went out | LOW | Per-campaign view showing each scheduled message and its status |
| Contact list with name + phone + join date | Basic CRM — who registered for what | LOW | Replaces the Google Sheet that tracks registrants |
| Per-contact event registration history | Which events did this contact attend | LOW | Simple join table: contact ↔ campaigns |
| Import contacts from CSV | Registrants come from Rav Messer landing pages — need to get them in | LOW | CSV with name + phone minimum. Map columns on import. |
| Automatic "welcome" message to new registrant | Currently done via MAKE.com — expected to carry over | MEDIUM | Triggered on contact creation or import, fires once per contact |
| GREEN API integration for sending | The actual delivery mechanism — without this nothing works | HIGH | Requires valid API key, instance ID. Handle rate limits and send errors. |

### Differentiators (Competitive Advantage)

Features that make this tool meaningfully better than the current manual workflow or a generic tool. Given this is a custom build, "differentiation" means "exactly fits Michal's workflow."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Event-relative timing ("7 days before", "morning of") | Michal thinks in terms of event proximity, not absolute dates. Competitors use absolute dates. | MEDIUM | UI: "Send X days before the event at HH:MM" — backend converts to absolute datetime when campaign is created or event date changes |
| Recalculate all send-times when event date changes | Events get rescheduled — currently requires rebuilding the whole MAKE.com flow | MEDIUM | When event_date updates, cascade recalculate all pending message send_at values |
| Per-contact delivery status ("received / not received") | Michal wants to know if a specific woman got the message, not just aggregate stats | LOW | Join message_log to contact — show per-contact send result |
| Monthly growth stats (registrations per month, growth rate) | Business coaching context — Michal tracks her own growth metrics | LOW | Simple count queries. Not a dashboard — just numbers on the contact list screen. |
| Hebrew RTL interface throughout | No commercial tool does this well. Right-to-left layout, Hebrew labels. | LOW | CSS direction: rtl on root. Use Hebrew text for all labels. |
| Airtable as visible data backend | Michal can inspect and edit data directly in Airtable even without the dashboard | HIGH | All data in Airtable. Dashboard reads/writes via API. Gives Michal a safety net. |

### Anti-Features (Commonly Requested, Often Problematic)

Features to explicitly not build in v1 — and document why, so the scope stays clean.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Personalized messages per contact | "Dear [name], ..." feels more personal | Requires template engine, name field on every contact, error handling for missing names. Doubles complexity for marginal gain — Michal's audience expects broadcast-style messages. | Add in v2 only if Michal specifically requests it after using v1 |
| Reply/inbox management (two-way chat) | WhatsApp is conversational — seeing replies feels natural | This is a fundamentally different product (support inbox). Michal does not need to manage replies through this tool — she responds via her phone. Adds massive scope. | Out of scope permanently. Michal uses her phone for replies. |
| Multi-user / team access | "What if I hire someone?" | One user now. Auth, permissions, role management = significant engineering for zero current value. | Add login only when a second user is needed. |
| Click-through rate / link tracking | Analytics dashboards look impressive | Requires URL shortener infrastructure or redirect service. Michal's messages don't have trackable CTAs in v1. | Track delivery + read status only (available from GREEN API). Add link tracking in v2 if needed. |
| A/B message testing | Optimize open rates | Requires splitting contact list, variant management, statistical significance. Way beyond v1 scope. | Not relevant for 1-2 events/month at this contact volume. |
| Chatbot / automated response flows | "Automate replies to FAQs" | Requires NLP or decision tree engine. Completely different product category. | Michal answers questions personally — that's part of her brand. |
| Payment / billing integration | "Track who paid" | Not part of the registration-to-event funnel being replaced. Payments happen elsewhere. | Out of scope permanently per PROJECT.md. |
| Direct Rav Messer API sync | Real-time pull of new registrants | Rav Messer's API may be rate-limited or change. CSV import is sufficient and more reliable. | CSV import only. If Rav Messer adds a reliable webhook, revisit in v2. |
| Push notifications / mobile app | "Alerts when something fails" | Michal works from desktop. Browser is sufficient. | Show error state prominently in the dashboard UI. Email alert for failures is a v2 consideration. |
| Message templates library | Reuse message content across campaigns | Events recur but messages always get tweaked. A template that's "almost right" creates more confusion than starting fresh. | Copy-from-previous-campaign is sufficient (v1.x). |

---

## Feature Dependencies

```
[Campaign creation]
    └──requires──> [Contact list exists]
    └──requires──> [GREEN API credentials configured]

[Scheduled message sending]
    └──requires──> [Campaign creation]
    └──requires──> [Contacts assigned to campaign]
    └──requires──> [GREEN API integration working]

[Message status screen]
    └──requires──> [Scheduled message sending]
    └──enhances──> [Per-contact delivery status]

[Welcome message on new contact]
    └──requires──> [GREEN API integration working]
    └──requires──> [Contact creation / CSV import]

[Per-contact event history]
    └──requires──> [Contact list]
    └──requires──> [Campaign creation]

[Monthly growth stats]
    └──requires──> [Contact list with join dates]

[Event-relative timing recalculation]
    └──requires──> [Campaign creation]
    └──enhances──> [Scheduled message sending]

[CSV import]
    └──enhances──> [Contact list]
    └──triggers──> [Welcome message on new contact]  (optional: flag on import)
```

### Dependency Notes

- **GREEN API integration is a hard prerequisite** for everything that involves sending. It must be validated in Phase 1 before any sending features are built on top of it.
- **Campaign creation requires contacts to exist** — the UI should allow creating a campaign and adding contacts to it, but sending cannot be tested until both exist.
- **Event-relative timing recalculation** is a derived feature of campaign creation — it does not stand alone and should be built into the campaign model from the start, not retrofitted.
- **Welcome message** is independent of campaign flow but shares the GREEN API integration. It can be a simple trigger without complex scheduling logic.

---

## MVP Definition

### Launch With (v1)

The minimum that replaces the current MAKE.com + Google Sheets + App Script workflow completely.

- [ ] Campaign creation with name, event date, event time
- [ ] Message scheduling with event-relative timing (N days/hours before event)
- [ ] Send broadcast to all contacts in a campaign via GREEN API
- [ ] Message status screen (scheduled / sent / failed per message)
- [ ] Contact list (name, phone, join date)
- [ ] Contact-to-campaign assignment (who is registered for what)
- [ ] CSV import of contacts
- [ ] Welcome message on new contact (configurable on/off)
- [ ] Hebrew RTL interface
- [ ] Airtable as the data store (all reads/writes via Airtable API)

### Add After Validation (v1.x)

Features to add once the core sending loop is confirmed to work reliably.

- [ ] Per-contact delivery status view — useful once volume grows, add when Michal asks "did X get the message?"
- [ ] Monthly registration stats — once Michal has 2-3 months of data in the system
- [ ] Event date change recalculation — needed when first event gets rescheduled (will happen)
- [ ] Copy messages from previous campaign — avoids retyping the same 4 messages each time

### Future Consideration (v2+)

Defer until v1 is validated in production.

- [ ] Personalized messages with contact name interpolation — only if Michal requests it
- [ ] Email alert on send failure — only if she misses a failure in the dashboard
- [ ] Link click tracking — only if messages start containing trackable CTAs
- [ ] Rav Messer webhook integration — only if CSV import becomes a friction point

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Campaign creation (name + date) | HIGH | LOW | P1 |
| Message scheduling (event-relative) | HIGH | MEDIUM | P1 |
| Broadcast send via GREEN API | HIGH | MEDIUM | P1 |
| Message status screen | HIGH | LOW | P1 |
| Contact list | HIGH | LOW | P1 |
| CSV import | HIGH | LOW | P1 |
| Contact-campaign assignment | HIGH | LOW | P1 |
| Welcome message trigger | MEDIUM | MEDIUM | P1 |
| Airtable as data backend | HIGH | HIGH | P1 (architectural, not optional) |
| Hebrew RTL UI | HIGH | LOW | P1 |
| Per-contact delivery status | MEDIUM | LOW | P2 |
| Monthly growth stats | MEDIUM | LOW | P2 |
| Event date recalculation cascade | MEDIUM | MEDIUM | P2 |
| Copy campaign messages | MEDIUM | LOW | P2 |
| Personalized messages | LOW | MEDIUM | P3 |
| Link tracking | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — replaces the current broken workflow
- P2: Should have — adds meaningful value, add post-launch
- P3: Nice to have — defer until explicitly requested

---

## Competitor Feature Analysis

This tool is not competing with commercial products — it is replacing a bespoke manual workflow. The reference points are the tools being replaced, not market competitors.

| Feature | Current Workflow (Replaced) | Commercial Tool (e.g. AiSensy, Gallabox) | This Tool |
|---------|---------------------------|------------------------------------------|-----------|
| Campaign setup time | Hours (rebuild MAKE.com per event) | Minutes (template-based) | Minutes (form-based, event-relative timing) |
| Contact management | Google Sheets (manual) | Built-in CRM, multi-user | Simple single-user list, Airtable-backed |
| Message scheduling | App Script + MAKE.com triggers | Visual workflow builder | Event-relative timing, auto-schedule |
| Delivery tracking | None (no feedback loop) | Sent / Delivered / Read / Failed | Sent / Failed (GREEN API statuses) |
| Interface language | English tools + Hebrew content | English or partial Hebrew | Full Hebrew RTL |
| Data visibility | Google Sheets (visible) | Opaque internal DB | Airtable (always visible to Michal) |
| Cost | MAKE.com + App Script time cost | $50-200/month SaaS | One-time build, self-hosted |
| Personalization | None | Template variables | None in v1 (by design) |

---

## Sources

- [11 Best WhatsApp Marketing Software (2026)](https://blog.campaignhq.co/whatsapp-marketing-software/)
- [WhatsApp Marketing Automation Table Stakes - SAP/Emarsys](https://emarsys.com/learn/blog/whatsapp-marketing-automation/)
- [Best WhatsApp Broadcast Tools 2026 - FlowCart](https://www.flowcart.ai/blog/whatsapp-broadcast-tools)
- [WhatsApp CRM Guide 2026 - NetHunt](https://nethunt.com/blog/whatsapp-crm/)
- [10 Best WhatsApp CRM Systems 2026 - ChatMaxima](https://chatmaxima.com/blog/10-best-whatsapp-crm-systems-2026/)
- [WhatsApp Campaign Analytics - Bird](https://bird.com/en-us/knowledge-base/marketing/measure-performance/whatsapp-campaign-reports)
- [WhatsApp Analytics & Delivery Reports - WANotifier](https://wanotifier.com/whatsapp-analytics-delivery-reports/)
- [GREEN API Documentation](https://green-api.com/en/docs/api/)
- [WhatsApp Business App vs API 2026 - ChatMaxima](https://chatmaxima.com/blog/whatsapp-business-app-vs-web-vs-api-2026/)
- [WhatsApp Broadcast Compliance & Scale - Infobip](https://www.infobip.com/blog/whatsapp-broadcast)

---

*Feature research for: WhatsApp Campaign Manager + CRM (Michal — single-user business coach tool)*
*Researched: 2026-03-17*
