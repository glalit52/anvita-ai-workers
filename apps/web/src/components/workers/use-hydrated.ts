"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

/** True once the persisted store has been restored from localStorage. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(useApp.persist.hasHydrated());
    return useApp.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
