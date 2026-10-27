"use client";
import * as PP from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = PP.Root;
export const PopoverTrigger = PP.Trigger;

export function PopoverContent({ className, align = "end", ...props }: React.ComponentProps<typeof PP.Content>) {
  return (
    <PP.Portal>
      <PP.Content
        align={align}
        sideOffset={8}
        className={cn("z-50 w-80 rounded-xl border border-border bg-popover p-0 shadow-pop animate-fade-in", className)}
        {...props}
      />
    </PP.Portal>
  );
}
