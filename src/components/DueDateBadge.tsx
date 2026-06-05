import { Calendar } from "lucide-react";
import { getDueDateStatus } from "@/lib/due-date-utils";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface DueDateBadgeProps {
  dueDate?: string;
  className?: string;
  showAlways?: boolean;
  isCompleted?: boolean;
}

export function DueDateBadge({
  dueDate,
  className,
  showAlways = false,
  isCompleted = false,
}: DueDateBadgeProps) {
  if (!dueDate) {
    if (showAlways) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border border-dashed text-muted-foreground/50 border-input bg-transparent",
            className,
          )}
        >
          <Calendar className="h-3.5 w-3.5 opacity-40" />
          <span>No due date</span>
        </span>
      );
    }
    return null;
  }

  const status = getDueDateStatus(dueDate, isCompleted);

  let badgeColor =
    "bg-muted/35 text-muted-foreground border-transparent hover:bg-muted/50";
  let iconColor = "text-muted-foreground/75";

  if (status.isOverdue) {
    badgeColor =
      "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-950/35 font-semibold";
    iconColor = "text-red-500 dark:text-red-400";
  } else if (status.isToday) {
    badgeColor =
      "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-950/35 font-medium";
    iconColor = "text-amber-500 dark:text-amber-400";
  } else if (status.isTomorrow) {
    badgeColor =
      "bg-blue-50/70 dark:bg-blue-950/15 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/15 hover:bg-blue-100/50 dark:hover:bg-blue-950/25";
    iconColor = "text-blue-500 dark:text-blue-400";
  }

  const tooltipLines = status.longLabelText.split("\n");

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all cursor-pointer select-none",
              badgeColor,
              className,
            )}
          >
            <Calendar className={cn("h-3 w-3", iconColor)} />
            <span>{status.labelText}</span>
            {status.isOverdue && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400 shrink-0 ml-0.5 animate-pulse" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs max-w-[220px]">
          {tooltipLines.map((line, idx) => {
            const isHeader = line.startsWith("Due Date:");
            return (
              <p
                key={idx}
                className={cn(
                  "m-0",
                  isHeader
                    ? "font-semibold text-foreground mb-0.5"
                    : "text-muted-foreground",
                )}
              >
                {line}
              </p>
            );
          })}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
