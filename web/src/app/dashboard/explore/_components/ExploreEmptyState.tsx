import { UserRound } from "lucide-react";

export default function ExploreEmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-90 flex-col items-center justify-center rounded-md border border-dashed border-border text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <UserRound size={24} />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
