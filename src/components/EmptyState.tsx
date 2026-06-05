import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border bg-card/40 p-10",
        className,
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-2xl rounded-full" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Icon className="h-7 w-7" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-5 gap-2 bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-glow"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
