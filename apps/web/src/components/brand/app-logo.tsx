import { appById } from "@/lib/mock/apps";
import { cn } from "@/lib/utils";

export function AppLogo({ appId, size = 24, className }: { appId: string; size?: number; className?: string }) {
  const app = appById[appId];
  const color = app?.color ?? "#6B7280";
  const glyph = app?.glyph ?? appId.slice(0, 1).toUpperCase();
  const light = ["#FFE01B", "#FBBC04", "#25D366", "#25C16F"].includes(color);
  return (
    <span
      title={app?.name ?? appId}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[28%] font-bold leading-none ring-1 ring-black/5", className)}
      style={{ width: size, height: size, background: color, color: light ? "#111" : "#fff", fontSize: glyph.length > 1 ? size * 0.36 : size * 0.5 }}
    >
      {glyph}
    </span>
  );
}

export function AppStack({ apps, size = 20, max = 4 }: { apps: string[]; size?: number; max?: number }) {
  const shown = apps.slice(0, max);
  const rest = apps.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((a, i) => (
        <AppLogo key={a} appId={a} size={size} className={cn("ring-2 ring-card", i > 0 && "-ml-1.5")} />
      ))}
      {rest > 0 && (
        <span className="-ml-1.5 inline-flex items-center justify-center rounded-[28%] bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card" style={{ width: size, height: size }}>
          +{rest}
        </span>
      )}
    </span>
  );
}
