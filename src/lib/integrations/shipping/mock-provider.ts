import "server-only";
import type { ShipmentProvider, CreateShipmentParams, CreateShipmentResult, ShipmentStatusResult } from "@/lib/integrations/shipping/types";

/**
 * Local-only implementation of ShipmentProvider — makes no network calls of
 * any kind. Exists so the rest of the shipment architecture (status
 * mapping, shipment-service.ts, the webhook route, simulate-shipment.ts)
 * can be built and tested end-to-end without Shiprocket credentials, per
 * this module's explicit "no real external calls" constraint.
 *
 * getShipmentStatus() always returns a fixed "just picked up" snapshot —
 * it's not meant to simulate a live tracking history; simulate-shipment.ts
 * drives status progression by POSTing sequential events to the webhook
 * route instead, which is the same path a real provider's webhook would use.
 */
class MockShipmentProvider implements ShipmentProvider {
  key = "mock";

  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    const suffix = params.orderNumber.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase();
    return {
      providerShipmentId: `mock-shp-${suffix}`,
      courierName: params.preferredCourier || "Mock Courier",
      trackingNumber: `MOCKAWB${suffix}`,
    };
  }

  async getShipmentStatus(trackingNumber: string): Promise<ShipmentStatusResult> {
    return { status: "PICKED_UP", trackingNumber, lastUpdatedAt: new Date() };
  }

  async cancelShipment(): Promise<{ cancelled: boolean } | null> {
    return { cancelled: true };
  }
}

export const mockShipmentProvider = new MockShipmentProvider();
