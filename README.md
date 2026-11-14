# Kutir — Home Decor eCommerce Platform

Built module by module. This README currently documents **Module 1 (Project
Architecture & Initial Setup)** and **Module 2 (Database Design)** only.
Everything else in the codebase beyond these two modules is an unwired
placeholder — see "Project status" below.

## Stack (Module 1)

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS with a custom design-token system (`tailwind.config.ts`)
- Fonts: Fraunces (display), Manrope (body), IBM Plex Mono (utility/prices)
- Prisma ORM targeting MySQL (`prisma/schema.prisma`)
- JWT + bcrypt helpers scaffolded for later modules (not active yet)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit .env — at minimum set DATABASE_URL to a real MySQL instance
# e.g. DATABASE_URL="mysql://root:password@localhost:3306/kutir_home_decor"

# 3. Generate the Prisma client
npx prisma generate

# 4. Create the database schema
npx prisma migrate dev --name init

# 5. (optional) Seed dummy data — admin user, categories, themes, products
npm run prisma:seed

# 6. Run the dev server
npm run dev
```

Open http://localhost:3000 — you should see the Module 1 placeholder page
confirming fonts, Tailwind tokens, and the App Router shell are working.

## Testing Module 1

- `npm run dev` starts without errors.
- http://localhost:3000 renders "Kutir" in the Fraunces display font on a
  bone (`#F3EEE4`) background, with the "Module 1 — Base Setup" label in
  IBM Plex Mono / brass color — confirms all three fonts and the color
  token system are wired correctly.
- `npm run build` completes with no type errors.

## Testing Module 2

- `npx prisma studio` opens a browser UI at http://localhost:5555 where you
  can inspect all tables: User, Address, Category, Theme, Product,
  ProductImage, ProductVariant, StockMovement, CartItem, WishlistItem,
  Review, Coupon, Order, OrderItem, Payment, Banner, Setting, ActivityLog.
- After seeding, Prisma Studio should show:
  - 1 user (`admin@kutir.in`, role `SUPER_ADMIN`)
  - 10 categories, 10 themes
  - 12 products, each linked to a category, a theme, and one image
- Run `npx prisma validate` to confirm the schema has no structural errors.

## Project status

**Active / complete:**
- Root config: `package.json`, `tsconfig.json`, `tailwind.config.ts`,
  `postcss.config.js`, `next.config.js`, `.env.example`, `.gitignore`
- `prisma/schema.prisma`, `prisma/seed.ts`
- `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` (placeholder)
- `src/lib/prisma.ts` (Prisma client singleton), `src/lib/utils.ts`

**Present in the repo but explicitly NOT implemented/wired yet** (drafted
ahead of schedule, now stubbed pending approval of their module):
- `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`
  → return `501 Not Implemented`. Full draft preserved at `*.module-draft`.
  Real implementation ships in **Module 3**.
- `src/app/api/categories/route.ts` → returns `501`. Draft preserved.
  Ships in **Module 5**.
- `src/app/api/products/route.ts`, `src/app/api/products/[slug]/route.ts`
  → return `501`. Draft preserved. Ship in **Module 6/7**.
- `src/lib/auth.ts` → JWT/bcrypt helpers, not imported anywhere currently.
  Ships in **Module 3**.
- `src/components/layout/Header.tsx`, `Footer.tsx`,
  `src/components/home/Hero.tsx`, `ProductRail.tsx`, `FeaturedCategories.tsx`,
  `src/components/ui/ProductCard.tsx`, `Button.tsx`, `src/types/index.ts`
  → exist as files but are not imported by `layout.tsx` or any page.
  Ship in **Module 4** (and used by later product/catalog modules).

None of the above will be implemented or wired in until their module is
explicitly approved.
