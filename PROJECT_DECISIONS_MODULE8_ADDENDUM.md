## Module 8 Addendum — Shopping Cart (append to PROJECT_DECISIONS.md)

### Module Completion Log
| Module | Status | Notes |
|---|---|---|
| 8 — Shopping Cart | ✅ Complete | Guest cart (signed cookie) + logged-in cart (DB), unified behind one service layer; real coupon validation against the existing Coupon table |

### Cart Architecture Decisions

- **One unified cart service** (`src/lib/cart/service.ts`) is the only entry point pages/API routes use — it branches guest-vs-logged-in internally via `getSession()`. Nothing above this layer needs to know which storage backend is active.
- **Guest cart** is a signed JWT-in-cookie (`src/lib/cart/guest-cart.ts`), reusing the project's existing `jose` library rather than adding a new signing mechanism. Merges into the real `CartItem` table on login (`src/lib/cart/merge.ts`, called from `api/auth/login/route.ts`) — duplicate products increase quantity, invalid/deleted products are silently skipped, guest cookie clears on success.
- **Coupon state** is a plain (unsigned) cookie storing only the applied *code* — the actual discount is always recomputed server-side from the live `Coupon` table on every request, so a tampered cookie can't grant an unauthorized discount by design, not just by convention.
- **CONFIG vs CONTENT formally split**, per this module's new standing rule: `src/lib/config/cart.ts` (shipping threshold/charge, max quantity, coupon limits, tax/delivery placeholders) vs. the new `src/lib/content/` directory's `cart.ts` (all customer-facing copy). This is the pattern all future modules should follow.
- **`BUY_X_GET_Y` coupons are explicitly unsupported** (schema has the enum value, validation logic returns a clear "not supported yet" error) rather than half-implemented — real rule complexity (which product, how many, what's free) needs its own design pass.
- **Found and fixed during implementation:** `getProductImageUrl`/`resolveProductImageSet` (Module 6) were pure functions trapped inside `src/lib/data/products.ts`'s whole-file `server-only` guard, blocking Module 8's cart line items (a Client Component) from using them. Extracted to `src/lib/products/image-helpers.ts` (no server-only guard); `products.ts` re-exports them, so every existing Server Component import is unaffected.
- **Considered, not used:** Module 6's `QuantitySelector` couldn't be reused as-is in `CartLineItem` — it always initializes its internal state to `1` with no way to seed an existing quantity, which cart line items need. Built a local stepper in `CartLineItem.tsx` instead of modifying a completed Module 6 file for this one case.

### Open items for future modules
- `CART_COOKIE_NAME` env var is optional (has a working default) but worth adding to `.env.example` for completeness — not done this module since that file isn't part of Module 8's scope.
- Adding 1–2 sample `Coupon` rows to `seed.ts` for local testing was suggested but not approved/implemented this round.
