# Module 1 & 2 Review Report — Kutir Home Decor Platform

Date: 2026-07-20
Scope: Module 1 (Project Architecture & Initial Setup), Module 2 (Database Design)

## ⚠️ Environment disclosure — read first

This sandbox's egress proxy denies `registry.npmjs.org` at runtime
(`403 Host not in allowlist`), so **`npm install`, `next build`,
`prisma generate`, `prisma migrate`, and a real ESLint/TypeScript run
against installed dependencies could not be executed here.** I will not
claim otherwise. What this report *is* based on:

1. A manual, line-by-line review of every file in the repo.
2. A syntax-only parse pass using the TypeScript compiler available in
   this sandbox (`tsc --noResolve`, no project type packages installed)
   — this catches real parse/syntax errors but not type errors that
   depend on `next`/`react`/`@prisma/client` type declarations.
3. Manual verification of the Prisma schema's relations, field types,
   and consistency against `seed.ts`.
4. Dependency cross-referencing (declared vs. imported packages).

**Action needed from you:** run the commands in the "Verification you
still need to run" section on your machine (or via Claude Code in VS
Code, which has real network access) to get an actual `npm install` /
`next build` / `prisma migrate` pass. I recommend doing that before
Module 3 begins, since it's the first real end-to-end confirmation.

---

## 1. Files reviewed (32 total)

**Config/tooling:** `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `next.config.js`, `.env.example`, `.gitignore`, `.eslintrc.json` (added during this review), `README.md`

**Database:** `prisma/schema.prisma`, `prisma/seed.ts`

**App shell (active):** `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

**Infra (active):** `src/lib/prisma.ts`, `src/lib/utils.ts`

**API routes (stubbed placeholders):** `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/categories/route.ts`, `src/app/api/products/route.ts`, `src/app/api/products/[slug]/route.ts`, plus their five `.module-draft` originals

**Module 3/4 draft files (unwired):** `src/lib/auth.ts`, `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`, `src/components/home/Hero.tsx`, `src/components/home/ProductRail.tsx`, `src/components/home/FeaturedCategories.tsx`, `src/components/ui/ProductCard.tsx`, `src/components/ui/Button.tsx`, `src/types/index.ts`

**Assets:** `public/patterns/jali.svg`

---

## 2. Problems found

| # | Severity | File | Problem |
|---|----------|------|---------|
| 1 | Medium | `package.json` | No `.eslintrc.json` existed. `next lint` auto-prompts interactively on first run without one, which breaks non-interactive/CI use. |
| 2 | Medium | `package.json` | Missing `"prisma": { "seed": "..." }` block — without it, `prisma migrate dev` won't offer to run the seed script automatically, and `npx prisma db seed` fails. |
| 3 | Low | `prisma/seed.ts` | Duplicated a local `slugify()` function instead of reusing `src/lib/utils.ts` — same logic existed in two places (minor drift risk). |
| 4 | Low (documented, not fixed) | `prisma/schema.prisma` | `Order.shippingAddress` / `billingAddress` are **live foreign keys** to `Address`, not snapshots. `OrderItem` correctly snapshots `name`/`price` at order time, but addresses aren't snapshotted — a customer editing/deleting an address later would retroactively change historical order data, and deleting an address used in any past order is blocked by the default `Restrict` behavior. This is a real e-commerce data-integrity pattern worth fixing before Module 9 (Checkout) is built on top of it, but changing it now would mean re-touching `seed.ts` and is a schema-shape decision — flagged rather than silently changed. |
| 5 | Low, informational | `src/components/layout/Footer.tsx` (Module 4 draft, out of scope) | Uses an inline `onSubmit` handler but has no `"use client"` directive — as written, this would fail to build once wired in, because Next.js Server Components can't carry event handlers. **Not fixed**, per your explicit instruction not to modify Module 3+ files — flagging for whoever picks up Module 4. |
| 6 | Cosmetic | `prisma/schema.prisma` | Minor inconsistent field-alignment spacing in `Coupon` and `Order` blocks. `npx prisma format` (needs local Prisma CLI) will auto-fix; purely cosmetic, no functional impact. |

No TypeScript **syntax** errors were found anywhere (all `tsc` errors were expected "cannot find module" / "implicit any" results of missing installed type packages, not real bugs — see disclosure above).

No circular imports, no hidden reverse-dependencies (nothing in Module 1/2 active code imports anything from the stubbed/draft Module 3/4 files — verified by grep).

## 3. Fixes applied

- ✅ Added `.eslintrc.json` extending `next/core-web-vitals`.
- ✅ Added `"prisma": { "seed": "tsx prisma/seed.ts" }` to `package.json`.
- ✅ Removed the duplicate `slugify()` in `prisma/seed.ts`; it now imports the single implementation from `src/lib/utils.ts`.
- ✅ Re-ran the syntax check after these edits — no new errors introduced.

## 4. Remaining technical debt

- Address snapshotting on `Order` (see Problem #4) — recommend resolving as part of Module 2's schema being finalized before Module 9, or accepting the FK-restrict behavior as an intentional design choice (worth an explicit decision either way, not a silent default).
- `Footer.tsx`'s missing `"use client"` (Problem #5) — will need fixing the moment Module 4 is approved; harmless today since the file is completely unwired.
- Cosmetic schema formatting (Problem #6) — run `npx prisma format` once you have the CLI locally.
- No automated tests exist yet (expected — Module 21 is dedicated to this).

## 5. Hidden-dependency check (Module 1/2 → future modules)

Verified clean in both directions:
- `src/app/layout.tsx` and `src/app/page.tsx` (the only currently-rendered app files) import nothing from `lib/auth.ts`, `components/layout/*`, `components/home/*`, `components/ui/*`, or `types/index.ts`.
- All five API routes under `src/app/api/**/route.ts` return `501` and import only `NextResponse` — none call into Prisma or `lib/auth.ts`.
- The only *forward* dependency is the expected one: future modules will depend on `lib/prisma.ts`, which is correct and intentional Module 1/2 infrastructure, not a violation.

## 6. Folder structure / architecture review

Structure follows a clean, conventional Next.js App Router layout:
```
src/app/          → routes + API routes, colocated by resource
src/components/   → split by domain: layout/, home/, ui/ (good separation)
src/lib/          → cross-cutting infra (prisma client, auth helpers, utils)
src/types/        → shared DTOs
prisma/           → schema + seed, isolated from app code
```
This matches the "reusable components, clean folder structure" requirement from your original brief and will scale reasonably as `hooks/` and `services/` get added in later modules (Cart, Checkout).

## 7. Placeholder-safety confirmation

- All 5 stub API routes return `501` and contain a comment naming their module and pointing to the preserved `.module-draft` file — cannot be accidentally used for real functionality.
- All 9 Module 3/4 draft files (`lib/auth.ts` + the 8 component/type files) carry an explicit top-of-file "PLACEHOLDER / DRAFT — not wired in" notice, and are confirmed (via grep) to be imported by nothing currently rendered.
- `.module-draft` files are inert by construction — Next.js only recognizes an exact `route.ts` filename, so these can never be picked up by the router regardless of content.

## 8. Production readiness score: **72 / 100**

Breakdown:
- Architecture & folder structure: strong (App Router conventions, clean domain separation)
- Schema design: strong, one real design decision to resolve (address snapshotting)
- Tooling completeness: was missing ESLint config and Prisma seed wiring — now fixed
- Verification: capped by the fact that no real `npm install`/build/migrate has been run against real dependencies yet — this is the main thing holding the score back from higher. Static review gives high confidence but isn't a substitute for an actual green build.

## 9. Recommended improvements (non-blocking)

1. Run the actual install/build/migrate pipeline locally or via Claude Code (see below) and confirm a clean pass before starting Module 3.
2. Decide now whether `Order` addresses should be snapshotted (recommended) or left as live FKs, before Module 9 builds checkout logic on top of it.
3. Run `npx prisma format` once tooling is available.
4. When Module 4 starts, remember to add `"use client"` to `Footer.tsx`.

---

## Verification you still need to run

```bash
npm install
cp .env.example .env   # set a real DATABASE_URL
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run build           # real TypeScript + Next build check
npm run lint             # real ESLint check (now non-interactive)
npm run dev
```

I was not able to execute these in this sandbox due to blocked npm registry access. Claude Code in VS Code has real network access and can run and report back on all of the above if you'd like me to hand off that verification step.
