# Project Decisions — Kutir Home Decor Platform

Long-term architectural memory. Updated whenever a significant decision is
made, per standing project rules (in effect from Module 4 onward, applied
retroactively here for Modules 1–4 so this document starts accurate).

---

## Module Completion Log

| Module | Status | Notes |
|---|---|---|
| 1 — Project Architecture & Setup | ✅ Complete | Next.js 14 App Router, TS, Tailwind, Shadcn/UI configured |
| 2 — Database Design | ✅ Complete | 18-model Prisma schema, MySQL, seeded |
| 3 — Authentication & User Management | ✅ Complete | JWT-in-httpOnly-cookie via `jose`, session abstraction layer |
| 4 — Homepage & Navigation | ✅ **Officially closed** | Lighthouse (production build): Perf 85 / A11y 87 / BP 96 / SEO 100. No critical issues. Accessibility gap (87, target 95+) noted as open, non-blocking. |

---

## Design System Decisions

- **Palette:** custom warm-neutral tokens (`ink`, `bone`, `brass`, `clay`, `sage`, `charcoal`) defined in `tailwind.config.ts`, deliberately not the generic cream/terracotta AI-default pairing.
- **Typography:** Fraunces (display/headings), Manrope (body), IBM Plex Mono (eyebrow labels, prices, code-like accents). Loaded via `next/font/google` in `src/app/layout.tsx`.
- **Shadcn/UI:** configured via `components.json` with CSS-variable tokens mapped to the brand palette (not generic zinc/slate) — see `src/app/globals.css` `:root`/`.dark` blocks. No components have been generated via the Shadcn CLI yet; existing hand-built primitives (`Button.tsx`, etc.) are the current standard.
- **Card/section pattern:** `rounded-sm`, `shadow-sm` → `shadow-card` on hover, subtle lift/scale — one shared treatment reused across product cards, category tiles, and theme banners (not three different hover styles).
- **Signature motif:** jali lattice pattern (`public/patterns/jali.svg`) used as a subtle background texture on dark sections, referencing Indian architectural lattice work — ties the brand's cultural-collections premise to the visual identity.

## Authentication Decisions

- **Session model:** stateless JWT (signed via `jose`, Edge-compatible) stored in an httpOnly, secure, sameSite=lax cookie. No DB session table.
- **Session abstraction (`src/lib/session.ts`) is the required interface** for all auth-aware code — `createSession`/`getSession`/`requireSession`/`requireRole`/`destroySession`. Nothing outside `lib/auth.ts` and `lib/session.ts` should touch JWT/cookie details directly, so the backend (JWT-in-cookie today) can be swapped later with changes contained to one file.
- **Route Handlers vs. Server Components:** `requireSession()`/`requireRole()` call `redirect()` and are for pages/Server Components only. Route Handlers use `getSession()` + a manual `apiError(..., 401)`, since `redirect()` doesn't behave correctly inside a Route Handler.
- **Roles:** `CUSTOMER`/`ADMIN` (plus several reserved for future staff roles) already in the `Role` enum from Module 2 — no schema change needed to add role-gated areas later (e.g. an eventual `/admin`).
- **Login enumeration protection:** identical `"Invalid email or password"` response (401) for nonexistent email, wrong password, and blocked account alike, plus a constant-time decoy-hash comparison — a deliberate tradeoff, documented in Module 3's delivery notes.

## Database Decisions

- MySQL via Prisma, 18 models covering the full platform scope from the original spec (not just Modules 1–4's immediate needs) — built once in Module 2 rather than incrementally, so later modules add queries/routes, not schema churn.
- **Known open decision, not yet resolved:** `Order.shippingAddress`/`billingAddress` are live FKs to `Address`, not snapshots. `OrderItem` does snapshot `name`/`price`. This should be decided explicitly before Module 9 (Checkout) is designed around it.
- Standing rule from this point forward: no schema/migration/seed changes without an explicit stop-and-explain-first step (why, which models, data preservation, migration necessity, affected routes, seed impact) before any code is written.

## Reusable Component Conventions

- Homepage sections are data-driven: components accept typed props (`ProductCardDTO`, `CategoryDTO`, `ThemeDTO`, `HeroSlideDTO`, etc.) and render placeholder data from `src/lib/mock-data.ts` today. Prop shapes deliberately mirror the Prisma models they'll eventually be backed by (e.g. `HeroSlideDTO` mirrors the `Banner` model), so swapping mock data for real queries in later modules shouldn't require redesigning the consuming components.
- Shared primitives are built once and reused, not duplicated: `Button.tsx` (all CTAs), `FadeIn.tsx` (all scroll animations — currently under review for a lighter implementation), `Newsletter.tsx` (both the homepage band and the footer, via a `variant` prop), `StorySection.tsx` (both Brand Story and Craftsmanship sections, via a `reverse` prop), `FeaturedCategories.tsx` (both homepage instances, via `title`/`subtitle`/`limit` props).
- Mock/placeholder image URLs are centralized in `src/lib/mock-data.ts`, never scattered inline in components — makes future replacement a one-file change.

## Coding Standards

- TypeScript strict mode throughout.
- Zod validation schemas are the single source of truth, imported by both API routes and the client forms that call them (no duplicated validation rules) — established in Module 3, to be followed for all future forms/routes.
- `apiSuccess`/`apiError` (`src/lib/api-response.ts`) are the standard response shape for all API routes.
- Every module's stubbed/future-scope files are marked with an explicit "not wired in yet" comment until their module is approved, then the comment is removed the moment the file is actually wired in (not left stale) — enforced consistently since Module 1.

## Performance Decisions

- **Target:** Lighthouse Performance 90+, Accessibility 95+, Best Practices 100, SEO 100 (per-module going forward).
- **Resolved (Module 4):** dev-mode Lighthouse testing was the dominant early factor (42→84 just from testing a production build correctly) — always confirm `next build && next start` before diagnosing a low score as an application problem.
- **Resolved (Module 4):** `sharp` installed for Next's image optimizer; `HeroCarousel` now mounts only the active + next slide instead of all slides at once; `sizes` attributes across `FeaturedCategories`/`ThemeShowcase`/`InstagramGallery` corrected to match their actual responsive grid breakpoints (previously mismatched, causing under-sized image requests at some widths).
- **Current state:** Performance 85 in production build, with the remaining gap assessed as likely local-testing/image-latency related rather than architectural.
- **Open, non-blocking:** Accessibility is at 87 against a 95+ target — no dedicated audit has been done yet to identify the specific gap(s).

## Image Sourcing — Lessons Learned & Standing Rule

- **Mistake made and corrected in Module 4:** initial placeholder images used hand-typed Unsplash photo IDs recalled from memory, without verification — this produced widespread 404s. Root cause: guessing specific CDN photo IDs is unreliable; Unsplash's old keyword-redirect fallback (`source.unsplash.com`) is also fully deprecated since 2021, so there's no forgiving safety net there either.
- **Interim fix (Module 4):** switched to Picsum Photos' seed-based URLs (deterministic, cannot 404 by construction) to guarantee reliability. These are NOT home-decor-themed — accepted as a temporary tradeoff to unblock Module 4 specifically.
- **Standing rule from Module 5 onward:** every placeholder image must be (a) thematically relevant to premium home decor/interiors, (b) sourced from something verified stable enough not to 404, and (c) centralized in `mock-data.ts` only, never inline in components. Given the Module 4 lesson, any new image-sourcing approach should be proposed and confirmed before being applied at scale, rather than assumed reliable from memory.

## Future Compatibility Decisions

- Homepage components are intentionally decoupled from their data source (props in, mock data or real Prisma query — same component either way) so Modules 5–7 (Categories, Products, Search) can wire in real data without homepage redesign.
- Nav mega-menu structure (`shopMegaMenu` in `mock-data.ts`) is shaped to be trivially replaced by a live categories/themes query later — the `DesktopNav` component itself won't need to change.
- Session/role architecture (see Authentication Decisions above) is built to support the eventual Shopify-like admin dashboard (Module 13) without refactoring — new protected areas are additive entries in `middleware.ts`'s `protectedRoutes` array, not structural changes.

## Batch 0 (pre-Module 6): Architecture Investments

Done as a dedicated pre-Module-6 batch, at the project owner's explicit request, to avoid repeated redesign later.

**Image architecture — two deliberately separate systems, not one:**
- Product/Category/Theme images remain database-backed (`Category.image`, `Theme.banner`, `ProductImage.url`) — already a correct single source of truth since Module 2/5. No registry needed for these; future replacement = update the DB row (manually today, via Module 13's admin panel and eventual Media Library later), never touching component code.
- Marketing/lifestyle images (hero, brand story, Instagram gallery) now go through `src/lib/images/registry.ts` (named constants like `heroLivingRoom`, `storyCraftsmen`) + `src/lib/images/resolve.ts` (the one function that will change when storage moves to Cloudinary/S3/ImageKit/a future Media Library — nothing else will need to).
- Deliberately excluded: testimonial avatar photos. Using real stock photos of strangers as fake "customer" photos would misattribute a real person's likeness to a fictional review. `Testimonials.tsx` was left rendering text-only; revisit only with real, consented customer photos.
- **Known, flagged, not-yet-fixed debt:** the homepage's `FeaturedCategories`/`ThemeShowcase`/product rail sections still read from `mock-data.ts`'s separate mock category/theme/product arrays (Picsum images), not the real DB-backed data Module 5 made available. This is a second, lesser source of truth for the same concepts and should be resolved (query `src/lib/data/*.ts` directly) in a future approved batch — not fixed here since it's a functional change beyond this batch's explicit "fix the duplicate navigation config" scope.

**Navigation architecture — single source of truth:**
- `src/lib/config/navigation.ts` now owns main nav (desktop + mobile share one `getMainNav()` call from `Header.tsx`), the mega menu (now built from live `getAllCategories()`/`getAllThemes()` — Module 5's real data layer — instead of a separate hardcoded mock list), and footer link columns.
- `DesktopNav`, `MobileNavToggle`, and `Footer` are now pure presentational components with no nav data of their own.
- This is the layer Module 13's CMS will eventually swap for DB-driven config (custom menu items, reordering, etc.) without any of the above three components needing to change.

**Customer profile — extensible without redesign:**
- `User.role` is no longer selected or displayed on the customer-facing profile — internal concept, not customer-relevant.
- `/account` is now a layout (`src/app/account/layout.tsx`, shared header/greeting/logout + `AccountNav` sidebar) wrapping a content page. Future sections (Addresses, Orders, Wishlist, Reviews — per the project owner's stated roadmap) become new `/account/*` pages under the same layout; `src/lib/config/account-nav.ts` is the single place their nav entries get added. They currently render as visibly inert "Soon" items in the sidebar, matching the same "build the shell now, wire logic later" pattern already used for `FilterSidebar` in Module 5.

**Phone number — mandatory at the application layer only:**
- `registerSchema` and `updateProfileSchema` (`src/lib/validations/auth.ts`) now require a non-empty phone number.
- `User.phone` stays nullable in `prisma/schema.prisma` — deliberately not migrated to a `NOT NULL` constraint, since the existing seeded admin user and any already-registered accounts have no phone value; a hard constraint would need a backfill and migration that were explicitly not approved. This is Option A from a two-option decision the project owner made explicitly (Option B, the schema-level constraint, was declined given the data-risk to existing users).

**Deferred, not built (explicitly out of scope per project owner instruction):**
- Notification service abstraction (email/WhatsApp for registration, orders, etc.) — will be designed when Module 11 (Orders) or an earlier module genuinely needs it, not scaffolded speculatively now.
- Store Settings (logo, contact info, shipping/tax config, policies) admin-editable panel — Module 16+ territory.
- Media Library (upload → library → assign-to-anything workflow) — the image registry/resolver split above is explicitly designed to make this addition non-disruptive later, but the library itself is not built yet.
