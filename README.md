# Defence Visitor Pass Management System

An enterprise-grade Visitor Management System built for high-security facility environments, with role-based portals for **Employees**, **HOD/HR**, and **Security**. The system manages the full visitor lifecycle — registration, approval, gate verification, on-site tracking, and forensic auditing — with defense-grade access control patterns.

**Live Repo:** `sin-h43/def-visitor-pass-mgmt`
**Stack:** React + TypeScript + Vite (frontend) · Supabase (auth, database, storage, realtime) · Vercel (deployment)

---

## Overview

Visitors are registered through category-specific intake pipelines (General, Government/Defence, Foreign National, Service/Vendor, HOD Registry), routed through an approval workflow, verified at the gate by Security, and tracked in real time while on campus. Every action — approval, denial, check-in, check-out, revocation, ban — is written to an immutable audit trail.

---

## Roles & Portals

### Employee Portal (`/emp`)
- Register new visitors or repeat visitors on behalf of the company
- Track dispatched pass requests and their live status
- View HOD remarks on denied requests and resubmit corrected requests
- Manage account settings (profile picture, session)

### HOD / HR Portal (`/hod`)
- Central command dashboard with pending/active/denied queues
- Category-specific onboarding terminals: General, Government/Defence, Foreign National, Service/Vendor, HOD Registry
- Approve/deny visitor requests with audit remarks
- Emergency revocation (kicks a visitor's active pass immediately, flags Security)
- Permanent visitor ban with enforcement across repeat-visitor lookups
- Master visitor directory (repeat visitor history, re-registration)
- Full audit log with filters, export to CSV, and account approval queue
- Live activity feed and notification center

### Security Portal (`/security`)
- Centralized check-in queue (pending vs. active on campus)
- Visitor verification workflow: ID check, kiosk photo capture, escort verification, badge issuance
- Real-time overstay detection with automatic forensic incident logging
- Emergency removal with forced checkout and HOD notification
- Ban enforcement at the gate
- Notification center polling for HOD bans, revocations, and new approvals

---

## Core Workflows

1. **Registration** — Employee or HOD creates a visitor request with category, purpose, pass type (One Day / Multi-Day / Contractor), and validity window.
2. **Approval** — HOD reviews and approves/denies with remarks. Denials route back to the requester for correction and resubmission.
3. **Gate Verification** — Security validates ID, captures a kiosk photo, verifies any escorts, and issues the badge to activate the pass.
4. **On-Site Monitoring** — Active passes are tracked against their expected checkout time; overstays are auto-logged as forensic incidents.
5. **Exit** — Normal checkout by Security, or emergency/forced removal by HOD or Security with mandatory reason and critical severity logging.
6. **Audit** — Every state transition (approval, denial, check-in, check-out, revocation, ban) is written to `audit_logs` and surfaced in the HOD audit trail.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) |
| Deployment | Vercel (Git-integrated CD) |

**Key Supabase tables:** `visitors`, `visits`, `escorts`, `employees`, `employee_registrations`, `audit_logs`, `forensic_incidents`, `time_tracking_logs`, `user_roles`

**Storage buckets:** `avatars` (employee profile pictures), `visitor-documents` (ID/credential scans), `visitor_documents` (kiosk photos)

---

## Local Setup

```bash
cd Frontend
npm install
npm run dev
```

Environment variables required (`.env.local`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Build
```bash
npm run build   # tsc -b && vite build
```
Note: `tsconfig.app.json` enforces `noUnusedLocals` / `noUnusedParameters` — all new code must be clean against this or the build will fail.

### Deployment
- Vercel project root directory: `Frontend`
- Framework preset: Vite
- `vercel.json` provides the SPA rewrite required for `BrowserRouter`
- Auto-deploys on push to `main`

---

## Future Scope

The system is actively evolving. Planned/candidate enhancements, roughly grouped by area:

### Access & Identity
- QR-code / barcode-based digital passes (scan-to-verify at gate instead of manual lookup)
- Visitor self-service pre-registration via emailed link (host fills minimal info, visitor completes their own profile before arrival)
- SSO / Active Directory integration for employee login instead of Supabase email-password
- Granular RBAC — department-scoped HOD access instead of a single flat "hr" role
- Multi-site/multi-facility support (site selector, per-site visitor queues and departments)

### Security & Compliance
- Face-match verification at the gate (compare kiosk photo against ID photo)
- Watchlist / blacklist integration beyond internal bans (e.g. government no-entry lists)
- Configurable approval chains (multi-level sign-off for high-security categories like Govt/Defence)
- Automatic pass expiry enforcement (auto-revoke instead of just flagging "Expired")
- Panic/lockdown mode — mass-revoke all active passes from the Security terminal

### Operations
- Physical badge printer integration (real printer driver output instead of browser print dialog)
- Visitor pre-arrival SMS/email notifications with pass details and QR code
- Host notification via SMS/push when their visitor checks in, not just in-app
- Multi-desk/multi-gate concurrent check-in support with desk-level analytics
- Recurring/scheduled visit templates for known contractors (e.g. weekly maintenance crew)

### Reporting & Analytics
- Wire up the existing Analytics page to live Supabase data (currently static/mock data)
- Scheduled report generation (daily/weekly compliance PDF emailed to HOD)
- Department-wise footfall and dwell-time analytics
- Exportable audit reports in PDF alongside the existing CSV export

### Platform
- Mobile app (React Native or PWA) for Security gate operations and host notifications
- Offline-tolerant check-in at Security terminal with sync-on-reconnect
- Dedicated kiosk mode UI for self-check-in tablets at the gate
- Webhook/API layer for integration with third-party HRMS or building access control systems

---

## Contribution Notes

- All fixes/features are delivered as files or diffs — verify locally before pushing to `main`, since `main` auto-deploys.
- New components should follow existing patterns: `DashboardLayout` for page shells, `HRNotificationCenter`/`SecurityNotificationCenter` polling pattern for live feeds, `audit_logs`/`forensic_incidents` conventions for anything security-relevant.
- Git history is a reliable rollback path — use `git log` / `git show` before assuming a file needs to be rebuilt from scratch.
