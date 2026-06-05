import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import { DueDateBadge } from "@/components/DueDateBadge";
import { getDueDateStatus } from "@/lib/due-date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { PersonAvatar } from "@/components/PersonAvatar";
import { useTaskDetail } from "@/components/task-detail/TaskDetailProvider";
import { KanbanSquare } from "lucide-react";
import {
  InlineEpicFeaturePicker,
  InlineDatePicker,
} from "@/components/InlineCardEditor";
import {
  ISSUE_TYPE_META,
  PRIORITY_META,
  useWorkspace,
  useWorkspaceStore,
  type BacklogItem,
} from "@/lib/workspace-store";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/workspaces/$code/board")({
  component: BoardPage,
});

function BoardPage() {
  const { code } = Route.useParams();
  const workspace = useWorkspace(code);
  const { store, updateItem } = useWorkspaceStore();
  const [dragId, setDragId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterEpicId, setFilterEpicId] = useState<string>("all");
  const [filterFeatureId, setFilterFeatureId] = useState<string>("all");
  const [filterDueDate, setFilterDueDate] = useState<
    "all" | "overdue" | "today" | "week" | "none"
  >("all");
  const [sortBy, setSortBy] = useState<
    "default" | "dueDateAsc" | "dueDateDesc"
  >("default");

  const activeSprint = store.sprints.find(
    (s) => s.workspaceCode === code && s.state === "active",
  );

  const allItems = useMemo(
    () => store.items.filter((i) => i.workspaceCode === code),
    [store.items, code],
  );

  const workspaceEpics = useMemo(
    () => allItems.filter((i) => i.type === "epic"),
    [allItems],
  );

  const workspaceFeatures = useMemo(
    () => allItems.filter((i) => i.type === "feature"),
    [allItems],
  );

  const filteredItems = useMemo(() => {
    if (!activeSprint) return [];
    let itemsResult = allItems.filter((i) => {
      // Must belong to active sprint
      if (i.sprintId !== activeSprint.id) return false;

      // Filter by Epic selection
      if (filterEpicId !== "all") {
        let belongsToEpic = i.id === filterEpicId;
        const parent = allItems.find((p) => p.id === i.parentId);
        if (parent) {
          if (parent.type === "epic" && parent.id === filterEpicId) {
            belongsToEpic = true;
          } else if (parent.type === "feature" && parent.parentId) {
            const gp = allItems.find((gp) => gp.id === parent.parentId);
            if (gp && gp.type === "epic" && gp.id === filterEpicId) {
              belongsToEpic = true;
            }
          }
        }
        if (!belongsToEpic) return false;
      }

      // Filter by Feature selection
      if (filterFeatureId !== "all") {
        let belongsToFeature = i.id === filterFeatureId;
        const parent = allItems.find((p) => p.id === i.parentId);
        if (
          parent &&
          parent.type === "feature" &&
          parent.id === filterFeatureId
        ) {
          belongsToFeature = true;
        }
        if (!belongsToFeature) return false;
      }

      // Filter by Due Date
      if (filterDueDate !== "all") {
        if (filterDueDate === "none") {
          if (i.dueDate) return false;
        } else {
          if (!i.dueDate) return false;
          const status = getDueDateStatus(i.dueDate, i.status === "Completed");
          if (filterDueDate === "overdue" && !status.isOverdue) return false;
          if (filterDueDate === "today" && !status.isToday) return false;
          if (filterDueDate === "week") {
            const withinNext7Days =
              status.daysDiff >= 0 && status.daysDiff <= 7;
            if (!withinNext7Days) return false;
          }
        }
      }

      // Search matching (Title, ID, Epic name, Feature name)
      if (search) {
        const query = search.toLowerCase();
        let matchesSearch = `${i.id} ${i.title}`.toLowerCase().includes(query);

        const parent = allItems.find((p) => p.id === i.parentId);
        if (parent) {
          if (parent.title.toLowerCase().includes(query)) {
            matchesSearch = true;
          }
          if (parent.type === "feature") {
            const grandParent = parent.parentId
              ? allItems.find((gp) => gp.id === parent.parentId)
              : null;
            if (
              grandParent &&
              grandParent.title.toLowerCase().includes(query)
            ) {
              matchesSearch = true;
            }
          }
        }
        if (!matchesSearch) return false;
      }

      return true;
    });

    if (sortBy === "dueDateAsc" || sortBy === "dueDateDesc") {
      itemsResult = [...itemsResult].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const timeA = new Date(a.dueDate).getTime();
        const timeB = new Date(b.dueDate).getTime();
        return sortBy === "dueDateAsc" ? timeA - timeB : timeB - timeA;
      });
    }

    return itemsResult;
  }, [
    allItems,
    activeSprint,
    filterEpicId,
    filterFeatureId,
    filterDueDate,
    sortBy,
    search,
  ]);

  if (!workspace) return null;

  if (!activeSprint) {
    return (
      <div className="mx-auto w-full max-w-3xl p-8">
        <EmptyState
          icon={KanbanSquare}
          title="No active sprint"
          description="Start a sprint from the Backlog tab to see your team's board come to life."
          actionLabel="Go to backlog"
          onAction={() =>
            (window.location.href = `/workspaces/${code}/backlog`)
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {activeSprint.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {activeSprint.startDate} → {activeSprint.endDate}
          </p>
        </div>

        {/* Board Controls Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, Epic, Feature…"
              className="pl-9 h-9"
            />
          </div>

          <Select value={filterEpicId} onValueChange={setFilterEpicId}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All Epics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Epics</SelectItem>
              {workspaceEpics.map((epic) => (
                <SelectItem key={epic.id} value={epic.id}>
                  {epic.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterFeatureId} onValueChange={setFilterFeatureId}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All Features" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Features</SelectItem>
              {workspaceFeatures.map((feature) => (
                <SelectItem key={feature.id} value={feature.id}>
                  {feature.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterDueDate}
            onValueChange={(v) =>
              setFilterDueDate(
                v as "all" | "overdue" | "today" | "week" | "none",
              )
            }
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Deadline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All deadlines</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Due Today</SelectItem>
              <SelectItem value="week">Due This Week</SelectItem>
              <SelectItem value="none">No due date</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(v) =>
              setSortBy(v as "default" | "dueDateAsc" | "dueDateDesc")
            }
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default order</SelectItem>
              <SelectItem value="dueDateAsc">Due Date (Earliest)</SelectItem>
              <SelectItem value="dueDateDesc">Due Date (Latest)</SelectItem>
            </SelectContent>
          </Select>

          {(filterEpicId !== "all" ||
            filterFeatureId !== "all" ||
            filterDueDate !== "all" ||
            sortBy !== "default" ||
            search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterEpicId("all");
                setFilterFeatureId("all");
                setFilterDueDate("all");
                setSortBy("default");
                setSearch("");
              }}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${workspace.statuses.length}, minmax(260px, 1fr))`,
        }}
      >
        {workspace.statuses.map((status) => {
          const colItems = filteredItems.filter((i) => i.status === status);
          return (
            <div
              key={status}
              className="rounded-2xl border border-border bg-card/50 flex flex-col min-h-[400px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!dragId) return;
                const ok = updateItem(dragId, { status });
                if (ok) {
                  toast.success(`Moved to ${status}`);
                }
                setDragId(null);
              }}
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {status}
                  </span>
                  <Badge variant="outline" className="h-5 font-mono">
                    {colItems.length}
                  </Badge>
                </div>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {colItems.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-6">
                    Drop items here
                  </p>
                )}
                {colItems.map((i) => (
                  <BoardCard
                    key={i.id}
                    item={i}
                    isDragging={dragId === i.id}
                    onDragStart={() => setDragId(i.id)}
                    onDragEnd={() => setDragId(null)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({
  item,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  item: BacklogItem;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const meta = ISSUE_TYPE_META[item.type];
  const { openTask } = useTaskDetail();
  const { store } = useWorkspaceStore();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => openTask(item.id)}
      className={cn(
        "group rounded-lg border border-border bg-background p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/40 transition-all space-y-2",
        isDragging && "opacity-50",
      )}
    >
      <p className="text-xs font-medium text-foreground line-clamp-2">
        {item.title}
      </p>

      <div
        className="flex flex-wrap gap-1 leading-none"
        onClick={(e) => e.stopPropagation()}
      >
        <InlineEpicFeaturePicker item={item} />
      </div>

      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
        <InlineDatePicker item={item} />
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold",
              meta.bg,
              meta.color,
            )}
          >
            {meta.icon}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {item.id}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-[10px] font-semibold",
              PRIORITY_META[item.priority].color,
            )}
          >
            {PRIORITY_META[item.priority].label}
          </span>
          <span className="inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
            {item.points}
          </span>
          {item.assigneeId && (
            <PersonAvatar userId={item.assigneeId} size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}
