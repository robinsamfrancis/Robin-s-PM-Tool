import { avatarColor, initials, DIRECTORY } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export function PersonAvatar({
  userId,
  size = "md",
  className,
}: {
  userId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const person = DIRECTORY.find((p) => p.id === userId);
  const name = person?.name ?? "Unknown";
  const sz =
    size === "sm"
      ? "h-5 w-5 text-[9px]"
      : size === "lg"
        ? "h-9 w-9 text-xs"
        : "h-7 w-7 text-[10px]";
  return (
    <div
      title={name}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white border border-background",
        sz,
        className,
      )}
      style={{ background: avatarColor(userId) }}
    >
      {initials(name)}
    </div>
  );
}

export function AvatarStack({
  userIds,
  max = 4,
}: {
  userIds: string[];
  max?: number;
}) {
  const visible = userIds.slice(0, max);
  const remaining = userIds.length - visible.length;
  return (
    <div className="flex -space-x-1.5">
      {visible.map((id) => (
        <PersonAvatar key={id} userId={id} size="sm" />
      ))}
      {remaining > 0 && (
        <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground border border-background">
          +{remaining}
        </div>
      )}
    </div>
  );
}
