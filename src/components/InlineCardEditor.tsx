import * as React from "react";
import { useState, useMemo } from "react";
import {
  Pencil,
  Check,
  Calendar as CalendarIcon,
  Plus,
  Info,
} from "lucide-react";
import {
  useWorkspaceStore,
  type BacklogItem,
  ISSUE_TYPE_META,
} from "@/lib/workspace-store";
import { parseLocalDate, getDueDateStatus } from "@/lib/due-date-utils";
import { DueDateBadge } from "@/components/DueDateBadge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";

interface InlineEpicFeaturePickerProps {
  item: BacklogItem;
  className?: string;
}

export function InlineEpicFeaturePicker({
  item,
  className,
}: InlineEpicFeaturePickerProps) {
  const { store, updateItem } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Retrieve current parent item
  const currentParent = useMemo(() => {
    if (!item.parentId) return null;
    return store.items.find((x) => x.id === item.parentId) || null;
  }, [item.parentId, store.items]);

  // Retrieve possible Epics and Features in this workspace
  const options = useMemo(() => {
    return store.items.filter(
      (x) =>
        x.workspaceCode === item.workspaceCode &&
        (x.type === "epic" || x.type === "feature") &&
        x.id !== item.id,
    );
  }, [item.workspaceCode, item.id, store.items]);

  const handleSelect = (parentId: string | undefined) => {
    updateItem(item.id, { parentId });
    setOpen(false);
    setShowSuccess(true);
    toast.success(
      parentId ? "Associated Epic/Feature updated" : "Association cleared",
    );
    setTimeout(() => {
      setShowSuccess(false);
    }, 1500);
  };

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {currentParent ? (
            <button
              data-no-open="true"
              className={cn(
                "group/picker relative inline-flex shrink-0 items-center justify-between gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer leading-none font-semibold",
                currentParent.type === "epic"
                  ? "bg-purple-50/70 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-950/40"
                  : "bg-blue-50/70 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-950/40",
                showSuccess &&
                  "ring-2 ring-emerald-500 border-emerald-500 scale-102",
              )}
            >
              <span>{currentParent.type === "epic" ? "◆" : "★"}</span>
              <span className="max-w-[120px] truncate">
                {currentParent.title}
              </span>
              <span className="opacity-0 group-hover/picker:opacity-100 transition-opacity ml-1 text-muted-foreground/80">
                <Pencil className="h-2.5 w-2.5" />
              </span>
              {showSuccess && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm animate-bounce">
                  <Check className="h-2 w-2" />
                </span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                data-no-open="true"
                className={cn(
                  "opacity-35 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[4px] border border-dashed border-muted-foreground/35 bg-transparent text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-solid transition-all cursor-pointer",
                  showSuccess &&
                    "ring-2 ring-emerald-500 border-emerald-500 scale-102",
                )}
              >
                <Plus className="h-2.5 w-2.5" />
                <span>Add Epic / Feature</span>
              </button>
            </div>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search Epic or Feature..." />
            <CommandList>
              <CommandEmpty>No Epics or Features found.</CommandEmpty>
              {options.length > 0 && (
                <CommandGroup heading="Epics & Features">
                  {options.map((opt) => (
                    <CommandItem
                      key={opt.id}
                      value={`${opt.type} ${opt.title} ${opt.id}`}
                      onSelect={() => handleSelect(opt.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={cn(
                            "inline-flex h-4.5 w-4.5 items-center justify-center rounded text-[9px] font-bold shrink-0",
                            opt.type === "epic"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
                          )}
                        >
                          {opt.type === "epic" ? "◆" : "★"}
                        </span>
                        <div className="flex flex-col truncate">
                          <span className="font-medium text-xs leading-none">
                            {opt.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground/75 leading-tight">
                            {opt.id}
                          </span>
                        </div>
                      </div>
                      {item.parentId === opt.id && (
                        <Check className="h-3 w-3 text-primary shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {item.parentId && (
                <>
                  <div className="p-1 border-t">
                    <button
                      className="w-full text-left px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors"
                      onClick={() => handleSelect(undefined)}
                    >
                      Clear association
                    </button>
                  </div>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface InlineDatePickerProps {
  item: BacklogItem;
  className?: string;
  showAlways?: boolean;
}

export function InlineDatePicker({
  item,
  className,
  showAlways = false,
}: InlineDatePickerProps) {
  const { updateItem } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedDate = useMemo(() => {
    if (!item.dueDate) return undefined;
    return parseLocalDate(item.dueDate);
  }, [item.dueDate]);

  const handleSelectDate = (date: Date | undefined) => {
    let formatted: string | undefined = undefined;
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      formatted = `${y}-${m}-${d}`;
    }

    updateItem(item.id, { dueDate: formatted });
    setOpen(false);
    setShowSuccess(true);
    toast.success(formatted ? "Due date updated" : "Due date cleared");
    setTimeout(() => {
      setShowSuccess(false);
    }, 1500);
  };

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {item.dueDate ? (
            <button
              data-no-open="true"
              className={cn(
                "group/date-picker relative inline-flex items-center transition-all cursor-pointer",
                showSuccess && "ring-2 ring-emerald-500 rounded-md scale-102",
              )}
            >
              <DueDateBadge
                dueDate={item.dueDate}
                isCompleted={item.status === "Completed"}
              />
              <span className="absolute right-1 opacity-0 group-hover/date-picker:opacity-100 transition-opacity bg-background p-0.5 rounded border shadow-xs text-muted-foreground">
                <Pencil className="h-2.5 w-2.5" />
              </span>
              {showSuccess && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm animate-bounce">
                  <Check className="h-2 w-2" />
                </span>
              )}
            </button>
          ) : (
            <button
              data-no-open="true"
              className={cn(
                "opacity-35 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] border border-dashed border-muted-foreground/35 bg-transparent text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-solid transition-all cursor-pointer",
                showSuccess &&
                  "ring-2 ring-emerald-500 border-emerald-500 scale-102",
              )}
            >
              <CalendarIcon className="h-2.5 w-2.5" />
              <span>Add Due Date</span>
            </button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelectDate}
              initialFocus
            />
            {item.dueDate && (
              <div className="p-1.5 border-t text-center bg-muted/20">
                <button
                  className="w-full text-xs py-1 text-destructive hover:bg-destructive/10 rounded transition-colors font-medium"
                  onClick={() => handleSelectDate(undefined)}
                >
                  Clear Due Date
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
