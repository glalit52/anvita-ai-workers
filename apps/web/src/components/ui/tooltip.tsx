"use client";
import * as TP from "@radix-ui/react-tooltip";

export const TooltipProvider = TP.Provider;

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <TP.Root delayDuration={200}>
      <TP.Trigger asChild>{children}</TP.Trigger>
      <TP.Portal>
        <TP.Content side={side} sideOffset={6} className="z-50 rounded-md bg-foreground px-2 py-1 text-[12px] text-background shadow-pop animate-fade-in">
          {content}
        </TP.Content>
      </TP.Portal>
    </TP.Root>
  );
}
