"use client";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * First-run product tour: spotlights the main areas in the sidebar one by one. Starts after
 * onboarding (/home?tour=1) or from Help → "Take the product tour", and remembers when it was
 * finished or skipped. Steps whose target isn't visible (e.g. the sidebar on a phone) are skipped.
 */

const STEPS: { target: string; title: string; body: string }[] = [
  { target: "/chat", title: "Ask Anvita", body: "Ask questions across your connected apps, get reports and files, and take actions — anything that changes data waits for approval." },
  { target: "/workers", title: "AI Workers", body: "Turn a repeated task into a Worker: start from a template, describe it in plain language, or build the workflow step by step in the Studio." },
  { target: "/approvals", title: "Approvals", body: "Actions your policies flag land here (and in Slack, WhatsApp or email). Approve, edit or reject — Workers continue from where they paused." },
  { target: "/integrations", title: "Integrations", body: "Connect Gmail, Shopify, HubSpot, Tally and more. Each app has a setup guide; until you connect, Anvita can use sample data." },
  { target: "/settings/members", title: "Settings", body: "Invite your team, set roles and security policies, add channels like a website chat, and manage billing and API keys." },
];

const DONE_KEY = "anvita-tour-done-v1";
const done = () => {
  try {
    return localStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
};

function visibleTarget(href: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${href}"]`))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function ProductTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Start on ?tour=1 (after onboarding, or from Help).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tour") !== "1") return;
    q.delete("tour");
    window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
    setStep(0);
  }, [pathname]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {
      /* private mode */
    }
    setStep(null);
  }, []);

  // Find the next step with a visible target.
  const go = useCallback(
    (from: number, dir: 1 | -1) => {
      for (let i = from; i >= 0 && i < STEPS.length; i += dir) {
        if (visibleTarget(STEPS[i].target)) return setStep(i);
      }
      if (dir === 1) finish();
    },
    [finish],
  );

  useLayoutEffect(() => {
    if (step === null) return;
    const el = visibleTarget(STEPS[step].target);
    if (!el) return go(step + 1, 1);
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [step, go]);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") go(step + 1, 1);
      if (e.key === "ArrowLeft" && step > 0) go(step - 1, -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, go, finish]);

  if (step === null || !rect) return null;
  const s = STEPS[step];
  const last = !STEPS.slice(step + 1).some((x) => visibleTarget(x.target));
  const top = Math.min(Math.max(12, rect.top - 8), window.innerHeight - 220);
  const left = Math.min(rect.right + 16, window.innerWidth - 336);
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Spotlight: the target stays visible, everything else dims. */}
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-200"
        style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: "0 0 0 9999px rgba(15,16,32,0.55)" }}
      />
      <div className="absolute w-80 rounded-2xl border border-border bg-card p-4 shadow-pop animate-fade-in" style={{ top, left }}>
        <p className="text-[11.5px] font-medium text-muted-foreground">
          {step + 1} of {STEPS.length}
        </p>
        <h2 id="tour-title" className="mt-1 text-[15px] font-semibold">
          {s.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={finish}>
            Skip tour
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button size="sm" variant="outline" onClick={() => go(step - 1, -1)}>
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (!last) return go(step + 1, 1);
                finish();
                if (pathname !== "/chat") router.push("/chat");
              }}
            >
              {last ? "Start with Ask Anvita" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Whether the first-run tour has been completed or skipped on this device. */
export const tourDone = done;
