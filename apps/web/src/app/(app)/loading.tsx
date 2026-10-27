function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8" aria-busy="true" aria-label="Loading">
      <Block className="h-7 w-56" />
      <Block className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Block key={i} className="h-24" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Block className="h-72 lg:col-span-2" />
        <Block className="h-72" />
      </div>
    </div>
  );
}
