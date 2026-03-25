---
status: complete
phase: 09-dashboard-live-stats-cleanup
source: [09-01-SUMMARY.md, 09-02-SUMMARY.md]
started: 2026-03-25T14:00:00Z
updated: 2026-03-25T14:10:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Dashboard Stat Cards Show Live Numbers
expected: Navigate to / (dashboard). Four stat cards are visible with actual numeric values — not placeholder dashes ("--"). At minimum you should see: messages sent this month (a real number), and other live counts. No card should display "--" as its value.
result: issue
reported: "הכרטיס 'אנשי קשר' מוצג במקום 'נרשמות' כפי שתוכנן ב-CONTEXT.md — תוכן שגוי, לא הנתון הנכון"
severity: major

### 2. GREEN API Badge with Colored Dot
expected: On the dashboard (/), a GREEN API connection badge is always visible. It shows a colored dot: green dot if the API is authorized/connected, red dot if not authorized, gray dot if status is unknown. The badge is present regardless of connection state.
result: pass

### 3. Campaign Grid with Per-Campaign Metrics
expected: On the dashboard (/), a campaign grid shows all campaigns. Each campaign row/card displays: enrolled count, interested count, conversion % (or "—" if no interested), and sent messages count. All four columns are present for each campaign.
result: pass

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "כרטיס הסטטיסטיקה הראשון מציג 'נרשמות' (ספירת נרשמות לקמפיינים)"
  status: failed
  reason: "User reported: הכרטיס מציג 'אנשי קשר' (contacts.length) במקום 'נרשמות' כפי שתוכנן"
  severity: major
  test: 1
  artifacts: []
  missing: []
