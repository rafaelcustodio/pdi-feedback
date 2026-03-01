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

Feature routes: `/colaboradores`, `/pdis`, `/feedbacks`, `/notificacoes`, `/configuracoes`, `/perfil`.

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

### Authentication

`src/lib/auth.ts` — NextAuth v5 with two providers:
1. **Credentials** (email + bcryptjs password)
2. **Microsoft Entra ID** (Azure AD SSO, optional — disabled if env vars are empty)

On first SSO login, a user record is auto-created. If the email matches an existing credentials user, the SSO is linked to it. Role is stored in JWT and available via `session.user.role`.

### Database

Prisma schema at `prisma/schema.prisma`. Generated client outputs to `src/generated/prisma/` (gitignored — always run `prisma:generate` after schema changes or fresh clone).

Key models: `User` (with `UserRole` enum: admin/manager/employee), `OrganizationalUnit` (hierarchical), `EmployeeHierarchy` (manager-employee links with date ranges), `PDI` + `PDIGoal` + `PDIEvidence` + `PDIComment`, `Feedback` + `FeedbackSchedule`, `Notification`.

### Email

`src/lib/email.ts` — Nodemailer. Falls back to console logging if SMTP env vars are not set. Templates in `src/lib/email-templates.ts`. Cron job at `/api/cron/email-reminders` triggers scheduled reminders (protected by `CRON_SECRET`).

## Environment

Copy `.env.example` to `.env`. Required: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Optional: Azure AD vars for SSO, SMTP vars for email, `CRON_SECRET`.

## Dev Container

The project includes a devcontainer (`.devcontainer/`) with a firewall init script. Shell scripts must use **LF line endings** — Windows CRLF will cause `bad interpreter` errors inside the container. The `.gitattributes` enforces `*.sh eol=lf`.
