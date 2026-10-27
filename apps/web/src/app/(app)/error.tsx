"use client";
import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="mt-5 text-[22px] font-semibold tracking-tight">Something went wrong on this page</h1>
      <p className="mt-2 max-w-md text-[14px] text-muted-foreground">Your data is safe — nothing was sent or changed. Try again, or go back home.</p>
      {error.digest && <p className="mt-2 font-mono text-[11.5px] text-muted-foreground">Error ID: {error.digest}</p>}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RotateCcw /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/home">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
