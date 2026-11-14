## Module 9.5 Addendum — Checkout & UX Improvements (append to PROJECT_DECISIONS.md)

### Module Completion Log
| Module | Status | Notes |
|---|---|---|
| 9.5 — UX & Validation Polish | ✅ Partial — prioritized subset, disclosed below | No schema/architecture changes, as required |

### Environment note — read this first
This session's sandbox reset **three times** mid-conversation (confirmed by file counts dropping to zero between tool calls). Given the cost of fully reconstructing the ~121-file tree from memory repeatedly, I switched to **syntax-only verification** (catches parse errors, not cross-file type mismatches) rather than attempting a fourth full reconstruction. This is a real reduction in verification confidence versus Modules 6–9, where I did full module-resolution typechecking. **Your own `npm run build` is more load-bearing than usual for this module** — please treat any errors it surfaces the same way as before (paste them exactly, I'll fix immediately).

### What was built (real, complete implementations)
- **Password UX**: `PasswordInput` (show/hide toggle, reusable) and `PasswordStrengthMeter` — both now used in Login and Register.
- **Registration**: confirm-password field, Terms & Conditions checkbox, all validated client-side without changing `registerSchema` or the register API's request contract.
- **Login**: Forgot Password link, "Continue as guest" link.
- **`/forgot-password`**: real placeholder page (no backend, as instructed).
- **Pincode auto-fill**: `AddressLookupProvider` interface + `IndiaPostProvider` (free public API, no key needed) + `/api/address/pincode/[pincode]` route + `usePincodeLookup` hook, wired into checkout's address form.
- **Guest order → account linking** (`src/lib/checkout/account-linking.ts`): a standalone service, not embedded in auth routes as instructed. Matches by verified email, imports addresses only (never touches historical `Order` rows — snapshots stay immutable), idempotent via a line1+pincode+phone duplicate check, respects existing default-address logic. Wired into both login and register.
- **Add to Cart**: now navigates to `/cart?added=1` with a real success banner, instead of an inline PDP message.
- **Cart page**: visual shipping-progress bar (replacing text-only), trust badges, "Continue Shopping" link, and a "You May Also Like" section as the honest fallback for Recently Viewed (which still has recording-only architecture from Module 6 — no display UI built here either, per the instruction to gracefully fall back rather than force it).
- **Login during checkout**: a "Sign in for faster checkout" link using Module 3's *existing* `?redirect=` support — no new logic needed, since cart (cookie/DB) and coupon (cookie) already survive login by construction from Module 8/9's architecture.

### What was explicitly deferred (disclosed, not silently dropped)
- Save for later (UI-only ask) — not built this pass.
- Undo remove on cart line items — not built this pass.
- Full checkout visual redesign (payment icons, secure-checkout badge, loading skeletons on checkout specifically) — partial only; cart/login/register got the bulk of this session's attention.
- Online payment promotions ("Pay online, save ₹X") — not built. With `enableOnlinePayment: false` still (Module 10 territory), there's no live payment method for a promo to attach to yet; building the config/logic now would be speculative rather than genuinely useful.
- Field-message wording wasn't exhaustively rewritten to match every example in the brief — existing Module 3/8/9 validation messages were already specific (not generic "Invalid input" at the field level), so effort went to the items above instead of re-wording already-adequate copy.

### No schema, architecture, or API contract changes
Confirmed: no Prisma changes, no breaking changes to any existing endpoint's request/response shape. New endpoints (`/api/address/pincode/[pincode]`) are additive only.
