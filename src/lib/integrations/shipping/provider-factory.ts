import "server-only";
import type { ShipmentProvider } from "@/lib/integrations/shipping/types";
import { mockShipmentProvider } from "@/lib/integrations/shipping/mock-provider";
import { shiprocketProvider } from "@/lib/integrations/shipping/shiprocket-provider";

/**
 * Order-FULFILLMENT provider selector (Module 27) — not to be confused
 * with src/lib/providers/shipping/types.ts's checkout-time rate-quote
 * `ShippingProvider`, a separate concern kept in a separate module.
 *
 * SHIPPING_PROVIDER=mock (default, including when unset) uses
 * MockShipmentProvider — safe for local development, makes no network
 * calls. SHIPPING_PROVIDER=shiprocket requires SHIPROCKET_EMAIL/
 * SHIPROCKET_PASSWORD to be set — this function fails LOUDLY (throws) if
 * they're missing, rather than silently falling back to mock, per this
 * module's explicit "production must never silently use mock shipping"
 * requirement. Any other value is a configuration error, also thrown, not
 * swallowed.
 */
export function getShipmentProvider(): ShipmentProvider {
  const selected = process.env.SHIPPING_PROVIDER || "mock";

  if (selected === "mock") return mockShipmentProvider;

  if (selected === "shiprocket") {
    if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
      throw new Error(
        "SHIPPING_PROVIDER=shiprocket but SHIPROCKET_EMAIL/SHIPROCKET_PASSWORD are not set. Configure both in .env, or set SHIPPING_PROVIDER=mock for local development."
      );
    }
    return shiprocketProvider;
  }

  throw new Error(`SHIPPING_PROVIDER="${selected}" is not a recognized value. Use "mock" or "shiprocket".`);
}
