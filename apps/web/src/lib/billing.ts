"use client";
import { useEffect, useState } from "react";
import { get, isLive, post } from "./api";
import { load } from "./backend";

export interface BillingInfo {
  razorpay: boolean;
  stripe: boolean;
  currency: string;
  taxRate: number;
  packs: { credits: number; price: number; total: number; discount: number }[];
}

export interface PaymentRow { id: string; provider: string; credits: number; amount: number; currency: string; status: "created" | "paid" | "failed"; createdAt: string; paidAt: string | null }

/** Live mode: payment providers, server-priced packs and payment history. */
export function useBillingInfo() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const refresh = () => {
    if (!isLive()) return;
    get<BillingInfo>("/billing/providers").then(setInfo).catch(() => {});
    get<{ data: PaymentRow[] }>("/billing/payments").then((r) => setPayments(r.data)).catch(() => {});
  };
  useEffect(refresh, []);
  return { info, payments, refresh };
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, fn: (r: { error: { description: string } }) => void) => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Razorpay Checkout"));
    document.body.appendChild(s);
  });
}

/**
 * Buy credits: Razorpay Checkout in-page (UPI, cards, netbanking) or a redirect to Stripe
 * Checkout. Credits are granted server-side once the payment is verified.
 * Resolves "paid" | "redirected" | "dismissed".
 */
export async function checkout(credits: number, prefill: { name?: string; email?: string } = {}): Promise<"paid" | "redirected" | "dismissed"> {
  const r = await post<{ provider: "razorpay" | "stripe"; url?: string; orderId?: string; keyId?: string; amount?: number; currency?: string }>("/billing/checkout", { credits });
  if (r.provider === "stripe") {
    window.location.assign(r.url!);
    return "redirected";
  }
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay!({
      key: r.keyId,
      order_id: r.orderId,
      amount: r.amount,
      currency: r.currency,
      name: "Anvita AI",
      description: `${credits.toLocaleString("en-IN")} credits`,
      prefill,
      theme: { color: "#5B4CF0" },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          await post("/billing/razorpay/verify", { orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
          await load.workspace();
          resolve("paid");
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => resolve("dismissed") },
    });
    rz.on("payment.failed", (f) => reject(new Error(f.error.description)));
    rz.open();
  });
}
