"use client";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useApp } from "@/lib/store";
import { LiveSync } from "@/components/live-sync";

function Hydrate() {
  const lang = useApp((s) => s.profile.language);
  useEffect(() => {
    useApp.persist.rehydrate();
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Hydrate />
        <LiveSync />
        {children}
        <Toaster position="bottom-right" richColors closeButton toastOptions={{ className: "!rounded-xl" }} />
      </TooltipProvider>
    </ThemeProvider>
  );
}
