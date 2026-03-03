# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run typecheck    # TypeScript type checking (no emit)
npm run lint         # ESLint
npm run test         # Vitest (runs src/**/*.test.ts)

npm run prisma:generate   # Regenerate Prisma client to src/generated/prisma/
npm run prisma:migrate    # Apply migrations (dev)
npm run prisma:seed       # Seed demo data
```

## Architecture

**Next.js 16 App Router** with TypeScript, PostgreSQL + Prisma 7, NextAuth v5 beta, Tailwind CSS 4.

### Route Structure

All authenticated pages live under `src/app/(dashboard)/` with a shared layout that pre-loads notifications and enforces auth. Public routes: `/login`, `/api/auth/*`, `/api/cron/*`.

Feature routes: `/colaboradores`, `/pdis`, `/feedbacks`, `/notificacoes`, `/configuracoes`, `/perfil`, `/programacao`, `/calendario`.

### Data Flow Pattern

Each feature follows this pattern:
- `src/app/(dashboard)/[feature]/actions.ts` — Server Actions for mutations and queries (called directly from components)
- `src/app/(dashboard)/[feature]/page.tsx` — Server component (fetches data, passes to components)
- `src/components/[feature]-form.tsx` / `[feature]-table.tsx` — Client components

There is **no separate API layer** for dashboard features — everything uses Server Actions.

### Access Control

`src/lib/access-control.ts` enforces role-based access:
- **admin**: full access
- **manager**: self + all direct/indirect subordinates (resolved via `EmployeeHierarchy` table)
- **employee**: self only

All Server Actions must call `getAccessibleEmployeeIds()` or the relevant filter helpers (`getPDIAccessFilter()`, `getFeedbackAccessFilter()`) before querying data. Tests in `src/lib/__tests__/access-control.test.ts`.

**Critical rule:** Always call `getEffectiveAuth()` from `src/lib/impersonation.ts` (never `auth()` directly) so that admin impersonation is respected in all access checks.

### Authentication & Impersonation

`src/lib/auth.ts` — NextAuth v5 with two providers:
1. **Credentials** (email + bcryptjs password)
2. **Microsoft Entra ID** (Azure AD SSO, optional — disabled if env vars are empty)

On first SSO login, a user record is auto-created. If the email matches an existing credentials user, the SSO is linked to it. Role is stored in JWT and available via `session.user.role`.

**Admin impersonation:** Admins can view the app as any user via `src/lib/impersonation.ts`. An HTTP-only cookie (`__impersonate`) stores the target user ID without affecting the real session. All Server Actions and access-control logic must call `getEffectiveAuth()` (from `src/lib/impersonation.ts`) instead of `auth()` directly. API routes: `POST/DELETE /api/impersonate` (activate/deactivate), `GET /api/impersonate/users` (list users). UI: `ImpersonationBanner` (yellow banner) and `ImpersonationSelector` (modal in sidebar).

### Database

Prisma schema at `prisma/schema.prisma`. Generated client outputs to `src/generated/prisma/` (gitignored — always run `prisma:generate` after schema changes or fresh clone).

Key models: `User` (with `UserRole` enum: admin/manager/employee), `OrganizationalUnit` (hierarchical), `EmployeeHierarchy` (manager-employee links with date ranges), `PDI` + `PDIGoal` + `PDIEvidence` + `PDIComment`, `Feedback` + `FeedbackSchedule`, `NineBoxEvaluation` + `NineBoxResponse`, `Notification`.

### Nine Box

Managers can trigger a Nine Box evaluation from within a Feedback. Evaluators receive internal notifications and email, then fill out the form at `/feedbacks/[id]/ninebox`. Results are visible to the manager (dashboard) and to the evaluated employee (read-only view). Actions in `src/app/(dashboard)/feedbacks/ninebox-actions.ts`.

### Testing

Test files live in `src/lib/__tests__/`. Shared mock fixtures (users, hierarchy, sessions) are in `src/lib/__tests__/fixtures.ts` — use these as the single source of truth for all tests.

Mock conventions:
- Prisma: `vi.mock("@/lib/prisma", () => ({ prisma: { ... } }))`
- Auth: `vi.mock("@/lib/impersonation", () => ({ getEffectiveAuth: vi.fn() }))` — never mock `@/lib/auth` directly in Server Actions
- Cookies: `vi.mock("next/headers", () => ({ cookies: vi.fn() }))`

Every new Server Action or API route that touches access-controlled data must have a corresponding test file.

### Email

`src/lib/email.ts` — Nodemailer. Falls back to console logging if SMTP env vars are not set. Templates in `src/lib/email-templates.ts`. Cron job at `/api/cron/email-reminders` triggers scheduled reminders (protected by `CRON_SECRET`).

## Environment

Copy `.env.example` to `.env`. Required: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Optional: Azure AD vars for SSO, SMTP vars for email, `CRON_SECRET`.

## Dev Container

The project includes a devcontainer (`.devcontainer/`) with a firewall init script. Shell scripts must use **LF line endings** — Windows CRLF will cause `bad interpreter` errors inside the container. The `.gitattributes` enforces `*.sh eol=lf`.
