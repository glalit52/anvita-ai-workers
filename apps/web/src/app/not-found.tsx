import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-subtle">
      <header className="px-6 py-5">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-20 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Compass className="size-7" />
        </span>
        <p className="mt-6 font-mono text-[13px] text-muted-foreground">404</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">This page took the day off</h1>
        <p className="mt-2 max-w-md text-[14px] text-muted-foreground">The link may be broken, or the Worker, chat or page was deleted. Try search with ⌘K once you’re back in the app.</p>
        <div className="mt-6 flex gap-2">
          <Button asChild>
            <Link href="/home">
              <ArrowLeft /> Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/help">Help & docs</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
