import { ThreadList } from "@/components/chat/thread-list";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <div className="hidden w-72 shrink-0 border-r border-border xl:block">
        <ThreadList />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
