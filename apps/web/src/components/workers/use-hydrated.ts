"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { isLive } from "@/lib/api";

/** True once the store is ready: restored from localStorage (demo) and loaded from the API (live). */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  const liveReady = useApp((s) => s.liveReady);
  useEffect(() => {
    setHydrated(useApp.persist.hasHydrated());
    return useApp.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated && (!isLive() || liveReady);
}
