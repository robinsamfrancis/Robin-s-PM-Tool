import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DueDateBadge } from "@/components/DueDateBadge";
import { getDueDateStatus } from "@/lib/due-date-utils";
import {
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Filter,
  Inbox,
  Layers,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonAvatar } from "@/components/PersonAvatar";
import { EmptyState } from "@/components/EmptyState";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { useTaskDetail } from "@/components/task-detail/TaskDetailProvider";
import { SprintFormDialog } from "@/components/SprintFormDialog";
import { SprintCompletionDialog } from "@/components/SprintCompletionDialog";
import {
  InlineEpicFeaturePicker,
  InlineDatePicker,
} from "@/components/InlineCardEditor";
import {
  DIRECTORY,
  ISSUE_TYPE_META,
  PRIORITY_META,
  useWorkspace,
  useWorkspaceStore,
  type BacklogItem,
  type IssueType,
  type Priority,
  type Sprint,
} from "@/lib/workspace-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/workspaces/$code/backlog")({
  component: BacklogPage,
});

function BacklogPage() {
  const { code } = Route.useParams();
  const workspace = useWorkspace(code);
  const {
    store,
    moveItem,
    deleteItem,
    startSprint,
    completeSprint,
    deleteSprint,
  } = useWorkspaceStore();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<IssueType | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterEpicId, setFilterEpicId] = useState<string>("all");
  const [filterFeatureId, setFilterFeatureId] = useState<string>("all");
  const [filterDueDate, setFilterDueDate] = useState<
    "all" | "overdue" | "today" | "week" | "none"
  >("all");
  const [sortBy, setSortBy] = useState<
    "default" | "dueDateAsc" | "dueDateDesc"
  >("default");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | undefined>();
  const [defaultSprintForNew, setDefaultSprintForNew] = useState<
    string | undefined
  >();
  const [showSprintDialog, setShowSprintDialog] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | undefined>();
  const [openSection, setOpenSection] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [completingSprint, setCompletingSprint] = useState<Sprint | null>(null);

  const allItems = useMemo(
    () => store.items.filter((i) => i.workspaceCode === code),
    [store.items, code],
  );
  const sprints = useMemo(
    () => store.sprints.filter((s) => s.workspaceCode === code),
    [store.sprints, code],
  );

  const workspaceEpics = useMemo(
    () => allItems.filter((i) => i.type === "epic"),
    [allItems],
  );

  const workspaceFeatures = useMemo(
    () => allItems.filter((i) => i.type === "feature"),
    [allItems],
  );

  const matches = useMemo(() => {
    return (i: BacklogItem) => {
      if (filterType !== "all" && i.type !== filterType) return false;
      if (filterPriority !== "all" && i.priority !== filterPriority)
        return false;
      if (filterAssignee !== "all" && i.assigneeId !== filterAssignee)
        return false;

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
    };
  }, [
    filterType,
    filterPriority,
    filterAssignee,
    filterEpicId,
    filterFeatureId,
    filterDueDate,
    search,
    allItems,
  ]);

  const items = useMemo(() => {
    let result = allItems.filter(matches);
    if (sortBy === "dueDateAsc" || sortBy === "dueDateDesc") {
      result = [...result].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1; // Put undated items at the bottom
        if (!b.dueDate) return -1;
        const timeA = new Date(a.dueDate).getTime();
        const timeB = new Date(b.dueDate).getTime();
        return sortBy === "dueDateAsc" ? timeA - timeB : timeB - timeA;
      });
    }
    return result;
  }, [allItems, matches, sortBy]);

  if (!workspace) return null;

  const backlogItems = items.filter((i) => !i.sprintId);

  const activeSprints = sprints.filter((s) => s.state === "active");
  const upcomingSprints = sprints.filter((s) => s.state === "planned");
  const completedSprints = sprints.filter((s) => s.state === "completed");

  const teamMemberIds = Array.from(
    new Set([...workspace.ownerIds, ...workspace.memberIds]),
  );

  const openCreate = (sprintId?: string) => {
    setEditingItem(undefined);
    setDefaultSprintForNew(sprintId);
    setShowItemDialog(true);
  };

  const handleEdit = (i: BacklogItem) => {
    setEditingItem(i);
    setDefaultSprintForNew(undefined);
    setShowItemDialog(true);
  };

  const handleDrop = (targetSprintId: string | undefined) => {
    if (!dragId) return;
    moveItem(dragId, targetSprintId);
    toast.success("Item moved");
    setDragId(null);
  };

  const noWorkspaceContent = sprints.length === 0 && allItems.length === 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 lg:px-8 py-6 space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="pl-9 h-9"
          />
        </div>
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as IssueType | "all")}
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
            <SelectItem value="story">Story</SelectItem>
            <SelectItem value="task">Task</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterPriority}
          onValueChange={(v) => setFilterPriority(v as Priority | "all")}
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_META[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {teamMemberIds.map((id) => {
              const person = DIRECTORY.find((x) => x.id === id);
              return (
                <SelectItem key={id} value={id}>
                  {(workspace.ownerIds.includes(id) ? "★ " : "") +
                    (person?.name ?? id)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select
          value={filterDueDate}
          onValueChange={(v) =>
            setFilterDueDate(v as "all" | "overdue" | "today" | "week" | "none")
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

        {(filterType !== "all" ||
          filterPriority !== "all" ||
          filterAssignee !== "all" ||
          filterEpicId !== "all" ||
          filterFeatureId !== "all" ||
          filterDueDate !== "all" ||
          sortBy !== "default" ||
          search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterType("all");
              setFilterPriority("all");
              setFilterAssignee("all");
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
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditingSprint(undefined);
              setShowSprintDialog(true);
            }}
          >
            <CalendarRange className="h-3.5 w-3.5" /> Create sprint
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-primary text-primary-foreground"
            onClick={() => openCreate()}
          >
            <Plus className="h-3.5 w-3.5" /> Create
          </Button>
        </div>
      </div>

      {noWorkspaceContent && (
        <EmptyState
          icon={Layers}
          title="Your workspace is empty"
          description="Start by creating a sprint and adding backlog items. Drag items into a sprint to plan work."
          actionLabel="Create your first sprint"
          onAction={() => {
            setEditingSprint(undefined);
            setShowSprintDialog(true);
          }}
        />
      )}

      {!noWorkspaceContent && (
        <div className="space-y-4">
          {/* Active */}
          {activeSprints.map((sp) => (
            <SprintCard
              key={sp.id}
              sprint={sp}
              items={items.filter((i) => i.sprintId === sp.id)}
              workspaceStatuses={workspace.statuses}
              tone="active"
              dragId={dragId}
              setDragId={setDragId}
              onDrop={() => handleDrop(sp.id)}
              onEdit={handleEdit}
              onEditSprint={() => {
                setEditingSprint(sp);
                setShowSprintDialog(true);
              }}
              onDelete={(id) => {
                deleteItem(id);
                toast.success("Item deleted");
              }}
              onAddItem={() => openCreate(sp.id)}
              onComplete={() => {
                const sprintItems = allItems.filter(
                  (i) => i.sprintId === sp.id,
                );
                const incomplete = sprintItems.filter(
                  (i) => i.status !== "Completed",
                );
                if (incomplete.length === 0) {
                  const completedItems = sprintItems.filter(
                    (i) => i.status === "Completed",
                  );
                  const pts = sprintItems.reduce(
                    (sum, item) => sum + (item.points || 0),
                    0,
                  );
                  const stats = {
                    plannedPoints: pts,
                    completedPoints: pts,
                    carriedPoints: 0,
                    completedItemsCount: completedItems.length,
                    carriedItemsCount: 0,
                    destinationSprintName: undefined,
                  };
                  completeSprint(sp.id, stats, undefined);
                  setCompletingSprint({
                    ...sp,
                    state: "completed",
                    ...stats,
                  });
                  toast.success("Sprint completed perfectly!");
                } else {
                  setCompletingSprint(sp);
                }
              }}
              onDeleteSprint={() => {
                deleteSprint(sp.id);
                toast.success("Sprint removed");
              }}
              open={openSection[sp.id] !== false}
              onToggle={() =>
                setOpenSection({
                  ...openSection,
                  [sp.id]: openSection[sp.id] === false,
                })
              }
            />
          ))}

          {/* Upcoming */}
          {upcomingSprints.map((sp) => (
            <SprintCard
              key={sp.id}
              sprint={sp}
              items={items.filter((i) => i.sprintId === sp.id)}
              workspaceStatuses={workspace.statuses}
              tone="upcoming"
              dragId={dragId}
              setDragId={setDragId}
              onDrop={() => handleDrop(sp.id)}
              onEdit={handleEdit}
              onEditSprint={() => {
                setEditingSprint(sp);
                setShowSprintDialog(true);
              }}
              onDelete={(id) => deleteItem(id)}
              onAddItem={() => openCreate(sp.id)}
              onStart={() => {
                startSprint(sp.id);
                toast.success("Sprint started");
              }}
              onDeleteSprint={() => {
                deleteSprint(sp.id);
                toast.success("Sprint removed");
              }}
              open={openSection[sp.id] !== false}
              onToggle={() =>
                setOpenSection({
                  ...openSection,
                  [sp.id]: openSection[sp.id] === false,
                })
              }
            />
          ))}

          {/* Completed */}
          {completedSprints.length > 0 && (
            <details className="rounded-2xl border border-border bg-card/50">
              <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
                Completed sprints ({completedSprints.length})
              </summary>
              <div className="space-y-3 p-3">
                {completedSprints.map((sp) => (
                  <SprintCard
                    key={sp.id}
                    sprint={sp}
                    items={items.filter((i) => i.sprintId === sp.id)}
                    workspaceStatuses={workspace.statuses}
                    tone="completed"
                    dragId={null}
                    setDragId={() => {}}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteItem(id)}
                    onDeleteSprint={() => deleteSprint(sp.id)}
                    open={openSection[sp.id] === true}
                    onToggle={() =>
                      setOpenSection({
                        ...openSection,
                        [sp.id]: !openSection[sp.id],
                      })
                    }
                  />
                ))}
              </div>
            </details>
          )}

          {/* Backlog */}
          <BacklogSection
            items={backlogItems}
            workspaceStatuses={workspace.statuses}
            dragId={dragId}
            setDragId={setDragId}
            onDrop={() => handleDrop(undefined)}
            onEdit={handleEdit}
            onDelete={(id) => {
              deleteItem(id);
              toast.success("Item deleted");
            }}
            onAddItem={() => openCreate()}
          />
        </div>
      )}

      <ItemFormDialog
        open={showItemDialog}
        onOpenChange={setShowItemDialog}
        workspace={workspace}
        initial={editingItem}
        defaultSprintId={defaultSprintForNew}
      />
      <SprintFormDialog
        open={showSprintDialog}
        onOpenChange={(op) => {
          setShowSprintDialog(op);
          if (!op) setEditingSprint(undefined);
        }}
        workspace={workspace}
        sprintToEdit={editingSprint}
      />
      {completingSprint && (
        <SprintCompletionDialog
          open={!!completingSprint}
          onOpenChange={(op) => {
            if (!op) setCompletingSprint(null);
          }}
          sprint={completingSprint}
          items={allItems.filter((i) => i.sprintId === completingSprint.id)}
          sprints={sprints}
          onComplete={(stats, destinationSprintId) => {
            completeSprint(completingSprint.id, stats, destinationSprintId);
          }}
          onCreateNewSprint={() => {
            setShowSprintDialog(true);
          }}
        />
      )}
    </div>
  );
}

function SprintCard({
  sprint,
  items,
  workspaceStatuses,
  tone,
  dragId,
  setDragId,
  onDrop,
  onEdit,
  onDelete,
  onAddItem,
  onStart,
  onEditSprint,
  onComplete,
  onDeleteSprint,
  open,
  onToggle,
}: {
  sprint: Sprint;
  items: BacklogItem[];
  workspaceStatuses: string[];
  tone: "active" | "upcoming" | "completed";
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onDrop?: () => void;
  onEdit: (item: BacklogItem) => void;
  onDelete: (id: string) => void;
  onAddItem?: () => void;
  onStart?: () => void;
  onEditSprint?: () => void;
  onComplete?: () => void;
  onDeleteSprint: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  const points = items.reduce((a, b) => a + b.points, 0);

  const toneStyle: Record<typeof tone, string> = {
    active: "border-success/40 bg-success/5",
    upcoming: "border-border bg-card",
    completed: "border-border bg-muted/30 opacity-90",
  };
  const toneLabel: Record<typeof tone, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-success/15 text-success" },
    upcoming: { label: "Upcoming", cls: "bg-info/15 text-info" },
    completed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
  };

  return (
    <div
      className={cn("rounded-2xl border", toneStyle[tone])}
      onDragOver={(e) => onDrop && e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {sprint.name}
            </h3>
            <Badge
              variant="secondary"
              className={cn("h-5", toneLabel[tone].cls)}
            >
              {toneLabel[tone].label}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {sprint.startDate} → {sprint.endDate}
            </span>
          </div>
          {sprint.goal && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {sprint.goal}
            </p>
          )}
          {sprint.summary && (
            <p className="text-xs text-success mt-0.5">{sprint.summary}</p>
          )}
        </div>
        <Badge variant="outline" className="font-mono">
          {items.length} items · {points} pts
        </Badge>
        <div className="flex items-center gap-1">
          {onAddItem && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={onAddItem}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
          {onStart && (
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-primary text-primary-foreground"
              onClick={onStart}
            >
              <Play className="h-3.5 w-3.5" /> Start sprint
            </Button>
          )}
          {onComplete && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={onComplete}
            >
              Complete
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEditSprint && (
                <DropdownMenuItem onClick={onEditSprint}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit sprint
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={onDeleteSprint}
                className="text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete sprint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {open && (
        <div className="divide-y divide-border">
          {items.length === 0 ? (
            <div className="px-5 py-6 text-center text-xs text-muted-foreground">
              Drop items here to add them to this sprint
            </div>
          ) : (
            items.map((i) => (
              <IssueRow
                key={i.id}
                item={i}
                statuses={workspaceStatuses}
                isDragging={dragId === i.id}
                onDragStart={() => setDragId(i.id)}
                onDragEnd={() => setDragId(null)}
                onEdit={() => onEdit(i)}
                onDelete={() => onDelete(i.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function BacklogSection({
  items,
  workspaceStatuses,
  dragId,
  setDragId,
  onDrop,
  onEdit,
  onDelete,
  onAddItem,
}: {
  items: BacklogItem[];
  workspaceStatuses: string[];
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onDrop: () => void;
  onEdit: (item: BacklogItem) => void;
  onDelete: (id: string) => void;
  onAddItem: () => void;
}) {
  const [quick, setQuick] = useState("");
  const { createItem } = useWorkspaceStore();
  const { code } = Route.useParams();

  const quickCreate = () => {
    if (!quick.trim()) return;
    createItem({
      workspaceCode: code,
      type: "task",
      title: quick.trim(),
      priority: "medium",
      points: 0,
      status: workspaceStatuses[0] ?? "Todo",
    });
    setQuick("");
    toast.success("Task added to backlog");
  };

  const points = items.reduce((a, b) => a + b.points, 0);

  return (
    <div
      className="rounded-2xl border border-border bg-card"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Inbox className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Backlog</h3>
        <Badge variant="outline" className="font-mono">
          {items.length} items · {points} pts
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={onAddItem}
        >
          <Plus className="h-3.5 w-3.5" /> Create item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={Inbox}
            title="No backlog items yet"
            description="Capture the next ideas, stories, and tasks here. You can move them into a sprint later."
            actionLabel="Create your first item"
            onAction={onAddItem}
            className="border-none bg-transparent p-0"
          />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((i) => (
            <IssueRow
              key={i.id}
              item={i}
              statuses={workspaceStatuses}
              isDragging={dragId === i.id}
              onDragStart={() => setDragId(i.id)}
              onDragEnd={() => setDragId(null)}
              onEdit={() => onEdit(i)}
              onDelete={() => onDelete(i.id)}
            />
          ))}
        </div>
      )}

      <div className="border-t border-border p-2 flex gap-2">
        <Input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder="+ Quick create a task and press Enter"
          className="h-8 text-xs border-0 bg-transparent focus-visible:ring-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              quickCreate();
            }
          }}
        />
      </div>
    </div>
  );
}

function IssueRow({
  item,
  statuses,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
}: {
  item: BacklogItem;
  statuses: string[];
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = ISSUE_TYPE_META[item.type];
  const { store, updateItem } = useWorkspaceStore();
  const { openTask } = useTaskDetail();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        // ignore clicks on interactive children
        if (
          (e.target as HTMLElement).closest(
            "button, [role='combobox'], [role='menuitem'], [role='menu'], [data-no-open]",
          )
        )
          return;
        openTask(item.id);
      }}
      className={cn(
        "group flex items-center gap-3 px-4 py-2 hover:bg-muted/40 cursor-pointer transition-colors",
        isDragging && "opacity-50",
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold",
          meta.bg,
          meta.color,
        )}
        title={meta.label}
      >
        {meta.icon}
      </span>
      <span className="font-mono text-[11px] text-muted-foreground w-24 truncate">
        {item.id}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm text-foreground truncate font-medium">
          {item.title}
        </span>
        <InlineEpicFeaturePicker item={item} />
      </div>
      <InlineDatePicker item={item} />
      <Badge
        variant="outline"
        className={cn("h-5", PRIORITY_META[item.priority].color)}
      >
        {PRIORITY_META[item.priority].label}
      </Badge>
      <Select
        value={item.status}
        onValueChange={(v) => updateItem(item.id, { status: v })}
      >
        <SelectTrigger className="h-7 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent onClick={(e) => e.stopPropagation()}>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="inline-flex h-6 w-10 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground border border-transparent">
        {item.points}
      </span>
      {item.assigneeId ? (
        <PersonAvatar userId={item.assigneeId} size="sm" />
      ) : (
        <div
          className="h-5 w-5 rounded-full border border-dashed border-border"
          title="Unassigned"
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
