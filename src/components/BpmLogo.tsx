import { cn } from "@/lib/utils";

interface BpmLogoProps {
  className?: string;
  showText?: boolean;
}

export function BpmLogo({ className, showText = true }: BpmLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-primary-foreground"
        >
          <path
            d="M4 6h10a4 4 0 0 1 0 8H8v6H4V6Zm4 4v0Zm0 0h6a0 0 0 1 0 0 0H8Z"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="18" r="3" fill="currentColor" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Beinex
          </span>
          <span className="text-[11px] font-medium text-muted-foreground -mt-0.5">
            Project Mate
          </span>
        </div>
      )}
    </div>
  );
}
