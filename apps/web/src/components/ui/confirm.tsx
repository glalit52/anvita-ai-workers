"use client";
import { create } from "zustand";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { Button } from "./button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}

const useConfirmStore = create<{ opts: ConfirmOptions | null; resolve: ((v: boolean) => void) | null }>(() => ({ opts: null, resolve: null }));

/** Promise-based confirmation dialog: `if (await confirm({...})) doIt()`. */
export function confirm(opts: ConfirmOptions) {
  return new Promise<boolean>((resolve) => useConfirmStore.setState({ opts, resolve }));
}

export function ConfirmHost() {
  const { opts, resolve } = useConfirmStore();
  const close = (v: boolean) => {
    resolve?.(v);
    useConfirmStore.setState({ opts: null, resolve: null });
  };
  return (
    <Dialog open={!!opts} onOpenChange={(o) => !o && close(false)}>
      <DialogContent className="max-w-md">
        <DialogTitle>{opts?.title}</DialogTitle>
        {opts?.description && <DialogDescription className="mt-2">{opts.description}</DialogDescription>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button variant={opts?.danger ? "danger" : "default"} onClick={() => close(true)} autoFocus>
            {opts?.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
