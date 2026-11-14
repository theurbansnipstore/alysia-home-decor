## Module 9.6.1 Addendum — Standard Checkout Form (Autocomplete Fully Removed)

### 1. Address autocomplete — completely removed, verified
Deleted entirely: `src/lib/providers/address/` (all 8 files — types, registry, nominatim, india-post, google-places, here-maps, locationiq, mapmyindia), `src/app/api/address/` (both routes), `src/lib/hooks/useAddressSearch.ts`, `src/lib/hooks/usePincodeLookup.ts`.

Verified via grep across every file in this session: zero remaining references to Nominatim, Google Places, MapMyIndia, HERE, LocationIQ, or any `AddressProvider`/`AddressSearchProvider` type. Zero API calls, zero dropdown UI.

### 2. International architecture — preserved
`src/lib/config/countries.ts` untouched. `AddressStep` now calls `getDefaultCountry()` and renders it as static, non-editable text — the same config that will drive a real selector later. Enabling more countries is a UI change in one component, not a config or business-logic change.

### 3. Standard address form — built to the exact spec
Full Name, Mobile Number (+91 prefix, non-editable, 10 digits only), House No/Flat/Building, Floor/Landmark, Area/Locality, City, State, Pincode, Country (static "India (+91)"). No "(optional)" text anywhere in this form — all nine are genuinely required in validation.

### 4. Database mapping — exact, as specified
`line1` = House No/Flat/Building. `line2` = `"{Floor/Landmark}, {Area/Locality}"`. Verified against your example: input `"B-402 Sunrise Apartment"` / `"3rd Floor"` / `"Sai Alampata, Taloja Phase 2"` produces `line1: "B-402 Sunrise Apartment"`, `line2: "3rd Floor, Sai Alampata, Taloja Phase 2"` — matches exactly. Zero schema changes; the snapshot's stored shape is identical to before this batch.

### 5. Phone — exact behavior
`+91` shown as a fixed, non-editable prefix box; input accepts only digits, capped at the country's configured digit count (10 for India). Validation distinguishes "wrong length" from "right length but invalid format" with two different messages, both from your examples.

### 6. Validation — every message field-specific
No instance of generic "Invalid input" anywhere in this batch's schemas. Two-schema design: `addressFormSchema` (3 separate UI fields, granular client-side errors) feeds `toShippingAddressPayload()`, which combines into the unchanged `addressInputSchema`/storage shape server-side.

### 7. Brand Settings audit — completed for available files, rest explicitly listed
Fixed: hardcoded `"Elysia"` in `checkout/page.tsx` and `cart/page.tsx` metadata titles (now `` `Checkout — ${getBrandSettings().name}` ``), and a dead hardcoded `"Elysia"` string in `navigation.ts`'s footer config (was already overridden at render by `Footer.tsx`, but shouldn't have existed as literal text regardless — replaced with a generic placeholder + explanatory comment).

**Explicitly unavailable this session — not assumed, not reconstructed, per your instruction:**
`middleware.ts`, `mock-data.ts`, `prisma/seed.ts`, `README.md`, `package.json`, `session.ts`, `guest-cart.ts`, `coupon-cookie.ts`, `Newsletter.tsx`, `InstagramGallery.tsx`, `categories/*`, `themes/*`, `shop/page.tsx`, `product/[slug]/page.tsx`, `.env.example`. Any "Kutir" references or cookie-name (`kutir_*`) changes in these files remain outstanding — genuinely not touched, not silently assumed fixed.

### 8. Product Details admin-configurable sections
**Not built this session** — `ProductSpecTable.tsx` and the product detail page are not in this session's file set. Listed per your explicit instruction rather than reconstructed from memory.

### 9. Logo via Brand Settings
`Header.tsx` already reads `getBrandSettings().logoUrl`. `Footer`, checkout, and login pages don't currently render a logo image at all (only Header does, and it's shared via the root layout across every page) — so "Footer/Checkout/Login should use Brand Settings" is already effectively true by virtue of the shared Header, not because those pages independently render their own logo. Flagging this as the actual current state rather than claiming separate work was done.

### 10. Preserved, unmodified
Add-to-cart redirect + badge refresh, guest checkout, guest order → account linking, notification architecture, address/order snapshot architecture — none of these files were touched this session.

### Verification
- [ ] `npm run build` — not run by me (no live Next.js environment in this sandbox); syntax-only check via `tsc --noResolve` passed clean across all 27 files present
- [ ] `npx tsc --noEmit` — same caveat; recommend running for real locally
- [ ] Manual grep re-confirmed zero autocomplete/provider references and zero remaining hardcoded brand strings in every file available this session
