import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { DIRECTORY, type Person } from "@/lib/workspace-store";
import { PersonAvatar } from "@/components/PersonAvatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function MultiSelectPeople({
  value = [],
  onChange,
  placeholder = "Search people…",
  pool = DIRECTORY,
}: {
  value?: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  pool?: Person[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () =>
      pool.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.designation.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, pool],
  );

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const p = DIRECTORY.find((x) => x.id === id);
            if (!p) return null;
            return (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1.5 py-1 pl-1 pr-2"
              >
                <PersonAvatar userId={id} size="sm" />
                <span className="text-xs font-medium">{p.name}</span>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="ml-0.5 hover:text-destructive"
                  aria-label={`Remove ${p.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9"
        />
        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-64 overflow-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <span>{filtered.length} people</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="hover:text-foreground"
              >
                Close
              </button>
            </div>
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                No matches
              </p>
            )}
            {filtered.map((p) => {
              const selected = value.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-accent/50",
                    selected && "bg-accent/30",
                  )}
                >
                  <PersonAvatar userId={p.id} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.designation}
                    </p>
                  </div>
                  {selected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
