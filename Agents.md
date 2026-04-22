# Agents.md — Beyond Project Conventions

This file defines the conventions and rules that all AI coding agents must follow when working on this repository.

---

## Language

- **All code, comments, variable names, function names, type names, and identifiers must be written in English.**
- **All UI text, labels, placeholders, error messages, and user-facing strings must be in English.**
- **All documentation, inline comments, and commit messages must be written in English.**
- Do not use Korean or any other non-English language anywhere in the codebase.

## Currency

- **All monetary values displayed in the UI must use the US dollar sign (`$`).**
- Format prices as `$X.XX` (e.g., `$12.99`, `$0.50`).
- Do not use Korean Won (₩) or any other currency symbol.
- Internally, prices are stored in **millicents** (1/100,000 of a dollar). When displaying to users, divide by `100000` to get the dollar amount.

---

## Project Overview

Beyond is a multi-tenant food & beverage platform with the following portals:

- **Owner Portal** (`/owner/`) — store and catalog management for business owners.
- **Customer App** (`/[tenantSlug]/app/`) — customer-facing ordering and account management.
- **Admin Console** (`/admin/`) — platform-level administration.
- **Marketplace** (`/marketplace/`, `/provider/`) — recipe marketplace for providers.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js
- **Payments**: Stripe (including Stripe Connect for providers)
- **Testing**: Vitest
- **Styling**: Tailwind CSS

## Code Conventions

- Use **TypeScript** for all source files.
- Services live in `services/`, API routes in `app/api/`, UI components in `components/`, and page files in `app/`.
- Monetary fields in the database use **millicents** (Int). Field names follow the pattern: `unitCost`, `basePrice`, `currentPrice`, `observedPrice`.
- Tests are located in `__tests__/` and must be kept up to date with any service changes.
- Do not remove or skip existing tests.

## List Navigation and Edit UX

- **Clicking a title or primary attribute in any list must navigate to that item's detail page.** Do not open a modal or expand inline — always route to a dedicated detail page (e.g., `/owner/products/[productId]`).
- **Edit / modify actions in any list must navigate to a dedicated edit page** (e.g., `/owner/products/[productId]/edit`). Do not perform inline editing directly inside the list row.
- These rules apply across all portals: Owner Portal, Admin Console, Marketplace, and Customer App.

## Build Verification

- **After every code change, always run `npm run build` to verify the build succeeds before finalizing.**
- If build errors occur, fix them before completing the task.
- Do not consider a task done until the build passes without errors.
