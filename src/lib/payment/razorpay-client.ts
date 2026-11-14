// Client-safe (no "server-only") — loads Razorpay's Checkout.js and opens
// the payment modal. Deliberately kept out of CheckoutForm.tsx's own body
// so the component stays focused on form state, not gateway wiring.

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      // Already injected by a previous attempt on this page — poll briefly.
      const check = setInterval(() => {
        if (window.Razorpay) {
          clearInterval(check);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve(!!window.Razorpay);
      }, 5000);
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpaySuccessPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface OpenRazorpayCheckoutParams {
  keyId: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess: (payload: RazorpaySuccessPayload) => void;
  onDismiss: () => void;
}

export async function openRazorpayCheckout(params: OpenRazorpayCheckoutParams): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error("Could not load the payment gateway. Please check your connection and try again.");
  }

  const rzp = new window.Razorpay({
    key: params.keyId,
    amount: params.amount,
    currency: params.currency,
    order_id: params.razorpayOrderId,
    name: params.name,
    description: params.description,
    prefill: params.prefill,
    handler: (response: RazorpaySuccessPayload) => params.onSuccess(response),
    modal: { ondismiss: params.onDismiss },
  });
  rzp.open();
}
