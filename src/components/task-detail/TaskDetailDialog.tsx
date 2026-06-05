import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DueDateBadge } from "@/components/DueDateBadge";
import { getDueDateStatus } from "@/lib/due-date-utils";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckSquare,
  ChevronRight,
  Clock,
  FileText,
  GitBranch,
  GitPullRequest,
  Image as ImageIcon,
  Link as LinkIcon,
  ListChecks,
  ListTree,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  Pencil,
  Layers,
  RotateCcw,
  Share2,
  Smile,
  Target,
  Maximize2,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PersonAvatar } from "@/components/PersonAvatar";
import { cn } from "@/lib/utils";
import {
  DIRECTORY,
  ISSUE_TYPE_META,
  LINK_TYPE_META,
  PRIORITY_META,
  useWorkspaceStore,
  DEFAULT_ACCEPTANCE_CRITERIA_TEXTS,
  type BacklogItem,
  type IssueType,
  type LinkType,
  type Priority,
} from "@/lib/workspace-store";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TABS = [
  { id: "overview", label: "Overview", icon: Target },
  { id: "acceptance", label: "Acceptance", icon: CheckSquare },
  { id: "dependencies", label: "Dependency/ Risk", icon: AlertTriangle },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "activity", label: "Activity", icon: ActivityIcon },
  { id: "attachments", label: "Attachments", icon: Paperclip },
  { id: "time", label: "Time tracking", icon: Clock },
] as const;

type TabId = (typeof TABS)[number]["id"];

const CURRENT_USER_ID = "u1"; // mock signed-in user

interface Props {
  openId: string | null;
  onClose: () => void;
  onOpenOther: (id: string) => void;
}

export function TaskDetailDialog({ openId, onClose, onOpenOther }: Props) {
  const { store } = useWorkspaceStore();
  const item = openId ? store.items.find((i) => i.id === openId) : null;
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    if (openId) setTab("overview");
  }, [openId]);

  return (
    <Dialog open={!!openId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1280px] w-[96vw] h-[92vh] p-0 overflow-hidden gap-0 flex flex-col">
        <DialogTitle className="sr-only">
          {item?.title ?? "Task details"}
        </DialogTitle>
        {item ? (
          <TaskBody
            item={item}
            tab={tab}
            setTab={setTab}
            onOpenOther={onOpenOther}
            onClose={onClose}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface DrawerProps {
  openId: string | null;
  onClose: () => void;
  onOpenOther: (id: string, initialTab?: string) => void;
  onExpand?: (id: string) => void;
  initialTab?: string;
}

export function TaskDetailDrawer({
  openId,
  onClose,
  onOpenOther,
  onExpand,
  initialTab,
}: DrawerProps) {
  const { store } = useWorkspaceStore();
  const item = openId ? store.items.find((i) => i.id === openId) : null;
  const [tab, setTab] = useState<TabId>((initialTab as TabId) || "overview");

  useEffect(() => {
    if (openId) {
      setTab((initialTab as TabId) || "overview");
    }
  }, [openId, initialTab]);

  return (
    <Sheet open={!!openId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="fixed inset-y-0 right-0 z-50 h-full w-full border-l bg-background shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-[750px] md:max-w-[850px] lg:max-w-[1000px] xl:max-w-[1100px] p-0 flex flex-col gap-0 overflow-hidden [&>button]:hidden"
      >
        <SheetTitle className="sr-only">
          {item?.title ?? "Task details"}
        </SheetTitle>
        {item ? (
          <TaskBody
            item={item}
            tab={tab}
            setTab={setTab}
            onOpenOther={onOpenOther}
            onClose={onClose}
            onExpand={onExpand ? () => onExpand(item.id) : undefined}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskBody({
  item,
  tab,
  setTab,
  onOpenOther,
  onClose,
  onExpand,
}: {
  item: BacklogItem;
  tab: TabId;
  setTab: (t: TabId) => void;
  onOpenOther: (id: string, initialTab?: string) => void;
  onClose: () => void;
  onExpand?: () => void;
}) {
  const { store, updateItem } = useWorkspaceStore();
  const workspace = store.workspaces.find((w) => w.code === item.workspaceCode);
  const meta = ISSUE_TYPE_META[item.type];
  const sprint = store.sprints.find((s) => s.id === item.sprintId);

  const statuses = workspace?.statuses ?? [
    "Todo",
    "In Progress",
    "In Review",
    "Completed",
  ];
  const idx = statuses.indexOf(item.status);
  const nextStatus =
    idx >= 0 && idx < statuses.length - 1 ? statuses[idx + 1] : null;

  return (
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur px-5 py-3 flex items-start gap-3 shrink-0">
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold shrink-0 mt-0.5",
            meta.bg,
            meta.color,
          )}
          title={meta.label}
        >
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <span>{workspace?.name ?? item.workspaceCode}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{meta.label}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{item.id}</span>
          </div>
          <InlineTitle
            value={item.title}
            onChange={(v) => updateItem(item.id, { title: v })}
          />
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="secondary"
              className="bg-info/15 text-info border-0"
            >
              {item.status}
            </Badge>
            <Badge
              variant="outline"
              className={cn(PRIORITY_META[item.priority].color)}
            >
              {PRIORITY_META[item.priority].label} priority
            </Badge>
            {sprint && (
              <Badge variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                {sprint.name}
              </Badge>
            )}
            <Badge variant="outline">{item.points} pts</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {nextStatus && (
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-primary text-primary-foreground"
              onClick={() => {
                const ok = updateItem(item.id, { status: nextStatus });
                if (ok) {
                  toast.success(`Moved to ${nextStatus}`);
                }
              }}
            >
              {nextStatus === "In Progress" ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
              {nextStatus === "In Progress"
                ? "Start progress"
                : nextStatus === "In Review"
                  ? "Move to review"
                  : nextStatus === "Completed"
                    ? "Complete task"
                    : `Move to ${nextStatus}`}
            </Button>
          )}
          {item.status === "Completed" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                updateItem(item.id, { status: statuses[0] });
                toast.success("Reopened");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reopen
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => {
              navigator.clipboard?.writeText(`${item.id} · ${item.title}`);
              toast.success("Link copied");
            }}
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          {onExpand && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-primary/20 hover:border-primary/50 text-foreground"
              onClick={onExpand}
            >
              <Maximize2 className="h-3.5 w-3.5" /> Open Full View
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_320px] min-h-0 overflow-y-auto overflow-x-hidden md:overflow-hidden">
        {/* Center */}
        <div className="flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-border min-h-0 shrink-0 md:h-full md:overflow-hidden overflow-x-hidden">
          <nav className="shrink-0 bg-card/80 border-b border-border px-2 flex items-center gap-0 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 h-10 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </nav>
          <div className="overflow-y-auto p-6 min-h-0 md:flex-1">
            {tab === "overview" && (
              <OverviewTab item={item} onOpenOther={onOpenOther} />
            )}
            {tab === "acceptance" && <AcceptanceTab item={item} />}
            {tab === "dependencies" && (
              <DependenciesTab item={item} onOpenOther={onOpenOther} />
            )}
            {tab === "comments" && <CommentsTab item={item} />}
            {tab === "activity" && <ActivityTab item={item} />}
            {tab === "attachments" && <AttachmentsTab item={item} />}
            {tab === "time" && <TimeTrackingTab item={item} />}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="bg-muted/20 md:h-full md:overflow-y-auto shrink-0">
          <PropertiesSidebar item={item} />
        </aside>
      </div>
    </div>
  );
}

/* ---------- Header inline title ---------- */
function InlineTitle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== value) onChange(draft.trim());
  };
  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="text-xl font-semibold h-9 mt-1"
      />
    );
  }
  return (
    <h1
      className="text-xl font-semibold tracking-tight text-foreground mt-1 cursor-text hover:bg-muted/40 rounded px-1 -mx-1 inline-block"
      onClick={() => setEditing(true)}
    >
      {value}
    </h1>
  );
}

/* ---------- Sidebar ---------- */
function PropertiesSidebar({ item }: { item: BacklogItem }) {
  const { store, updateItem } = useWorkspaceStore();
  const workspace = store.workspaces.find((w) => w.code === item.workspaceCode);
  const sprints = store.sprints.filter(
    (s) => s.workspaceCode === item.workspaceCode,
  );
  const epics = store.items.filter(
    (i) =>
      i.workspaceCode === item.workspaceCode &&
      (i.type === "epic" || i.type === "feature") &&
      i.id !== item.id,
  );
  const memberIds = Array.from(
    new Set([...(workspace?.ownerIds ?? []), ...(workspace?.memberIds ?? [])]),
  );

  return (
    <div className="p-5 space-y-5 text-sm">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Details
        </h3>
        <div className="space-y-3">
          <Row label="Assignee">
            <PersonSelect
              value={item.assigneeId}
              onChange={(v) => updateItem(item.id, { assigneeId: v })}
              memberIds={memberIds}
            />
          </Row>
          <Row label="Reporter">
            <PersonSelect
              value={item.reporterId}
              onChange={(v) => updateItem(item.id, { reporterId: v })}
              memberIds={memberIds}
            />
          </Row>
          <Row label="Status">
            <Select
              value={item.status}
              onValueChange={(v) => updateItem(item.id, { status: v })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(workspace?.statuses ?? []).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Type">
            <Select
              value={item.type}
              onValueChange={(v) =>
                updateItem(item.id, { type: v as IssueType })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ISSUE_TYPE_META) as IssueType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-1.5">
                      <span>{ISSUE_TYPE_META[t].icon}</span>
                      <span>{ISSUE_TYPE_META[t].label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Priority">
            <Select
              value={item.priority}
              onValueChange={(v) =>
                updateItem(item.id, { priority: v as Priority })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Budget hours">
            <Input
              type="number"
              min={0}
              value={item.budgetHours ?? ""}
              onChange={(e) =>
                updateItem(item.id, {
                  budgetHours:
                    e.target.value === ""
                      ? undefined
                      : Number(e.target.value) || 0,
                })
              }
              className="h-7 text-xs"
              placeholder="—"
            />
          </Row>
          <Row label="Story points">
            <Input
              type="number"
              min={0}
              value={item.points}
              onChange={(e) =>
                updateItem(item.id, { points: Number(e.target.value) || 0 })
              }
              className="h-7 text-xs"
            />
          </Row>
          <Row label="Sprint">
            <Select
              value={item.sprintId ?? "__b"}
              onValueChange={(v) =>
                updateItem(item.id, { sprintId: v === "__b" ? undefined : v })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__b">Backlog</SelectItem>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Epic / Parent">
            <Select
              value={item.parentId ?? "__n"}
              onValueChange={(v) =>
                updateItem(item.id, { parentId: v === "__n" ? undefined : v })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__n">None</SelectItem>
                {epics.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    [{ISSUE_TYPE_META[e.type].label}] {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Team">
            <Input
              value={item.team ?? ""}
              onChange={(e) => updateItem(item.id, { team: e.target.value })}
              className="h-7 text-xs"
            />
          </Row>
          <Row label="Release">
            <Input
              value={item.releaseVersion ?? ""}
              onChange={(e) =>
                updateItem(item.id, { releaseVersion: e.target.value })
              }
              className="h-7 text-xs"
            />
          </Row>
          <Row label="Start date">
            <Input
              type="date"
              value={item.startDate ?? ""}
              onChange={(e) =>
                updateItem(item.id, { startDate: e.target.value || undefined })
              }
              className="h-7 text-xs"
            />
          </Row>
          <Row label="Due date">
            <Input
              type="date"
              value={item.dueDate ?? ""}
              onChange={(e) =>
                updateItem(item.id, { dueDate: e.target.value || undefined })
              }
              className="h-7 text-xs"
            />
          </Row>
          <Row label="Created">
            <span className="text-xs text-foreground/80 font-medium pl-1">
              {item.activity?.[0]?.at
                ? new Date(item.activity[0].at).toLocaleDateString()
                : "—"}
            </span>
          </Row>
          <Row label="Last updated">
            <span className="text-xs text-foreground/80 font-medium pl-1">
              {item.activity?.[item.activity.length - 1]?.at
                ? new Date(
                    item.activity[item.activity.length - 1].at,
                  ).toLocaleString()
                : "—"}
            </span>
          </Row>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function PersonSelect({
  value,
  onChange,
  memberIds,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  memberIds: string[];
}) {
  return (
    <Select
      value={value ?? "__n"}
      onValueChange={(v) => onChange(v === "__n" ? undefined : v)}
    >
      <SelectTrigger className="h-7 text-xs">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__n">Unassigned</SelectItem>
        {(memberIds.length ? memberIds : DIRECTORY.map((d) => d.id)).map(
          (id) => {
            const p = DIRECTORY.find((d) => d.id === id);
            return (
              <SelectItem key={id} value={id}>
                {p?.name ?? id}
              </SelectItem>
            );
          },
        )}
      </SelectContent>
    </Select>
  );
}

/* ---------- OVERVIEW ---------- */
function getAncestryChain(
  item: BacklogItem,
  items: BacklogItem[],
): BacklogItem[] {
  const chain: BacklogItem[] = [];
  let current: BacklogItem | undefined = item;
  while (current && current.parentId) {
    const parent: BacklogItem | undefined = items.find(
      (i) => i.id === current?.parentId,
    );
    if (parent) {
      chain.unshift(parent);
      current = parent;
    } else {
      break;
    }
  }
  return chain;
}

function OverviewTab({
  item,
  onOpenOther,
}: {
  item: BacklogItem;
  onOpenOther: (id: string) => void;
}) {
  const { store, createItem, updateItem, deleteItem } = useWorkspaceStore();
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(
    item.description ?? "",
  );

  useEffect(() => {
    setDescriptionDraft(item.description ?? "");
    setEditingDescription(false);
  }, [item.id, item.description]);

  // Subtask Edit Inline State
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [subDraftTitle, setSubDraftTitle] = useState("");
  const [subDraftAssigneeId, setSubDraftAssigneeId] = useState<
    string | undefined
  >(undefined);
  const [subDraftStatus, setSubDraftStatus] = useState("");
  const [subDraftPriority, setSubDraftPriority] = useState<Priority>("medium");
  const [subDraftDueDate, setSubDraftDueDate] = useState("");
  const [subDraftPoints, setSubDraftPoints] = useState<number>(1);

  // Subtask Add Inline State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState("");
  const [newSubAssigneeId, setNewSubAssigneeId] = useState<string | undefined>(
    undefined,
  );
  const [newSubStatus, setNewSubStatus] = useState("");
  const [newSubPriority, setNewSubPriority] = useState<Priority>("medium");
  const [newSubDueDate, setNewSubDueDate] = useState("");
  const [newSubPoints, setNewSubPoints] = useState<number>(1);

  useEffect(() => {
    setEditingSubtaskId(null);
    setShowAddForm(false);
  }, [item.id]);

  const workspace = store.workspaces.find((w) => w.code === item.workspaceCode);
  const statuses = workspace?.statuses ?? [
    "Todo",
    "In Progress",
    "In Review",
    "Completed",
  ];

  const subtasks = store.items.filter((i) => i.parentId === item.id);
  const sprint = store.sprints.find((s) => s.id === item.sprintId);
  const assignee = DIRECTORY.find((d) => d.id === item.assigneeId);
  const loggedHours = (item.worklogs ?? []).reduce((a, b) => a + b.hours, 0);
  const est = item.budgetHours ?? 0;
  const acDone = (item.acceptanceCriteria ?? []).filter((a) => a.done).length;
  const acTotal = (item.acceptanceCriteria ?? []).length;
  const subDone = subtasks.filter((s) => s.status === "Completed").length;
  const completion =
    acTotal === 0 && subtasks.length === 0
      ? item.status === "Completed"
        ? 100
        : item.status === "In Review"
          ? 75
          : item.status === "In Progress"
            ? 40
            : 10
      : Math.round(
          ((acDone + subDone) / Math.max(1, acTotal + subtasks.length)) * 100,
        );

  let ancestors = getAncestryChain(item, store.items);
  if (item.epicId && !ancestors.some((a) => a.id === item.epicId)) {
    const maybeEpic = store.items.find((i) => i.id === item.epicId);
    if (maybeEpic) {
      ancestors = [maybeEpic, ...ancestors];
    }
  }

  const parentEpic = ancestors.find((a) => a.type === "epic");
  const parentFeature = ancestors.find((a) => a.type === "feature");
  const parentStory = ancestors.find((a) => a.type === "story");
  const meta = ISSUE_TYPE_META[item.type] || {
    icon: "▪",
    bg: "bg-muted",
    color: "text-foreground",
    label: item.type,
  };

  const startEditing = (s: BacklogItem) => {
    setEditingSubtaskId(s.id);
    setSubDraftTitle(s.title);
    setSubDraftAssigneeId(s.assigneeId);
    setSubDraftStatus(s.status);
    setSubDraftPriority(s.priority);
    setSubDraftDueDate(s.dueDate || "");
    setSubDraftPoints(s.points || 0);
  };

  return (
    <div className="space-y-6">
      {/* 1. Task Information Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <SummaryCard label="Status" value={item.status} />
        <SummaryCard label="Story points" value={String(item.points)} />
        <SummaryCard label="Sprint" value={sprint?.name ?? "Backlog"} />
        <SummaryCard
          label="Assignee"
          value={assignee?.name ?? "Unassigned"}
          icon={
            item.assigneeId ? (
              <PersonAvatar userId={item.assigneeId} size="sm" />
            ) : null
          }
        />
        <SummaryCard
          label="Due date"
          value={
            item.dueDate ? (
              <DueDateBadge
                dueDate={item.dueDate}
                isCompleted={item.status === "Completed"}
                className="h-6"
              />
            ) : (
              "—"
            )
          }
        />
        <SummaryCard label="Progress" value={`${completion}%`} />
        <SummaryCard label="Time logged" value={`${loggedHours}h / ${est}h`} />
        <SummaryCard
          label="Priority"
          value={PRIORITY_META[item.priority].label}
        />
      </div>

      {/* 2. Progress Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Progress</h3>
          <span className="text-xs text-muted-foreground">
            {completion}% complete
          </span>
        </div>
        <Progress value={completion} className="h-2" />
        <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
          <Stat label="Acceptance criteria" value={`${acDone}/${acTotal}`} />
          <Stat label="Subtasks done" value={`${subDone}/${subtasks.length}`} />
          <Stat label="Story points" value={`${item.points} pts`} />
        </div>
      </div>

      {/* 3. Description */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Description</h3>
          {!editingDescription && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setEditingDescription(true)}
            >
              Edit
            </Button>
          )}
        </div>
        {editingDescription ? (
          <div className="space-y-2">
            <div className="flex gap-1 border border-border rounded-md p-1 bg-card">
              {["B", "I", "{ }", "•", "—", "🔗"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className="px-2 h-7 text-xs rounded hover:bg-muted cursor-pointer"
                >
                  {t}
                </button>
              ))}
            </div>
            <Textarea
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              rows={6}
              placeholder="Add context, links, design references…"
              className="font-mono text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs cursor-pointer"
                onClick={() => {
                  setEditingDescription(false);
                  setDescriptionDraft(item.description ?? "");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-gradient-primary text-primary-foreground cursor-pointer"
                onClick={() => {
                  updateItem(item.id, { description: descriptionDraft });
                  setEditingDescription(false);
                  toast.success("Description saved");
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="text-sm text-foreground/90 whitespace-pre-wrap cursor-text min-h-[80px]"
            onClick={() => setEditingDescription(true)}
          >
            {item.description?.trim() || (
              <span className="text-muted-foreground text-sm italic">
                No description provided yet. Click to add context…
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. Subtasks Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden space-y-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/10">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              Subtasks
            </h3>
            <Badge
              variant="secondary"
              className="px-1.5 py-0.5 text-xs text-muted-foreground bg-muted font-normal"
            >
              {subDone}/{subtasks.length} Done
            </Badge>
          </div>
          {!showAddForm && (
            <Button
              size="sm"
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 flex items-center cursor-pointer"
              onClick={() => {
                setShowAddForm(true);
                setNewSubTitle("");
                setNewSubAssigneeId(undefined);
                setNewSubStatus(workspace?.statuses[0] || "Todo");
                setNewSubPriority("medium");
                setNewSubPoints(1);
                setNewSubDueDate("");
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add Subtask
            </Button>
          )}
        </div>

        {/* Table Headers */}
        {subtasks.length > 0 && (
          <div className="hidden md:grid grid-cols-[80px_1fr_120px_110px_110px_90px_60px_70px] items-center px-4 py-2 border-b border-border bg-muted/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div>ID</div>
            <div>Title</div>
            <div>Assignee</div>
            <div>Status</div>
            <div>Priority</div>
            <div>Due Date</div>
            <div>Points</div>
            <div className="text-right">Actions</div>
          </div>
        )}

        {/* Empty State */}
        {subtasks.length === 0 && !showAddForm ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <span className="text-3xl">📂</span>
            <p className="text-sm text-muted-foreground font-medium">
              No subtasks have been created.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setShowAddForm(true);
                setNewSubTitle("");
                setNewSubAssigneeId(undefined);
                setNewSubStatus(workspace?.statuses[0] || "Todo");
                setNewSubPriority("medium");
                setNewSubPoints(1);
                setNewSubDueDate("");
              }}
              className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 cursor-pointer"
            >
              ➕ Add Subtask
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* ADD SUBTASK FORM */}
            {showAddForm && (
              <div className="p-4 bg-muted/10 space-y-4 border-b border-border">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                  New Subtask Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Subtask Title *
                    </label>
                    <Input
                      value={newSubTitle}
                      onChange={(e) => setNewSubTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Assignee
                    </label>
                    <Select
                      value={newSubAssigneeId || "unassigned"}
                      onValueChange={(v) =>
                        setNewSubAssigneeId(v === "unassigned" ? undefined : v)
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {DIRECTORY.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            <div className="flex items-center gap-1.5">
                              <PersonAvatar userId={person.id} size="xs" />
                              <span>{person.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Status
                    </label>
                    <Select
                      value={newSubStatus}
                      onValueChange={(v) => setNewSubStatus(v)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Priority
                    </label>
                    <Select
                      value={newSubPriority}
                      onValueChange={(v) => setNewSubPriority(v as Priority)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_META).map(([p, m]) => (
                          <SelectItem key={p} value={p}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Story Points
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={newSubPoints}
                      onChange={(e) =>
                        setNewSubPoints(parseInt(e.target.value) || 0)
                      }
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Due Date
                    </label>
                    <Input
                      type="date"
                      value={newSubDueDate}
                      onChange={(e) => setNewSubDueDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs cursor-pointer"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    onClick={() => {
                      if (!newSubTitle.trim()) {
                        toast.error("Subtask title is required");
                        return;
                      }
                      createItem({
                        workspaceCode: item.workspaceCode,
                        type: "task",
                        title: newSubTitle.trim(),
                        priority: newSubPriority,
                        points: newSubPoints,
                        parentId: item.id,
                        sprintId: item.sprintId,
                        status:
                          newSubStatus || (workspace?.statuses[0] ?? "Todo"),
                        assigneeId: newSubAssigneeId,
                        dueDate: newSubDueDate || undefined,
                      });
                      setNewSubTitle("");
                      setShowAddForm(false);
                      toast.success("Subtask added successfully");
                    }}
                  >
                    Save Subtask
                  </Button>
                </div>
              </div>
            )}

            {/* SUBTASK ROWS */}
            {subtasks.map((s) => {
              const isEditing = editingSubtaskId === s.id;
              const subAssignee = DIRECTORY.find((d) => d.id === s.assigneeId);
              return (
                <div key={s.id} className="p-3 md:p-0">
                  {isEditing ? (
                    <div className="p-4 bg-muted/20 border border-indigo-500/20 rounded-md space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                            Title
                          </label>
                          <Input
                            value={subDraftTitle}
                            onChange={(e) => setSubDraftTitle(e.target.value)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                            Assignee
                          </label>
                          <Select
                            value={subDraftAssigneeId || "unassigned"}
                            onValueChange={(v) =>
                              setSubDraftAssigneeId(
                                v === "unassigned" ? undefined : v,
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                Unassigned
                              </SelectItem>
                              {DIRECTORY.map((person) => (
                                <SelectItem key={person.id} value={person.id}>
                                  <div className="flex items-center gap-1.5">
                                    <PersonAvatar
                                      userId={person.id}
                                      size="xs"
                                    />
                                    <span>{person.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                            Status
                          </label>
                          <Select
                            value={subDraftStatus}
                            onValueChange={(v) => setSubDraftStatus(v)}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((st) => (
                                <SelectItem key={st} value={st}>
                                  {st}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                            Priority
                          </label>
                          <Select
                            value={subDraftPriority}
                            onValueChange={(v) =>
                              setSubDraftPriority(v as Priority)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PRIORITY_META).map(([p, m]) => (
                                <SelectItem key={p} value={p}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                            Story Points
                          </label>
                          <Input
                            type="number"
                            min={0}
                            value={subDraftPoints}
                            onChange={(e) =>
                              setSubDraftPoints(parseInt(e.target.value) || 0)
                            }
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                            Due Date
                          </label>
                          <Input
                            type="date"
                            value={subDraftDueDate}
                            onChange={(e) => setSubDraftDueDate(e.target.value)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs cursor-pointer"
                          onClick={() => setEditingSubtaskId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                          onClick={() => {
                            if (!subDraftTitle.trim()) {
                              toast.error("Subtask title is required");
                              return;
                            }
                            updateItem(s.id, {
                              title: subDraftTitle.trim(),
                              assigneeId: subDraftAssigneeId || undefined,
                              status: subDraftStatus,
                              priority: subDraftPriority,
                              dueDate: subDraftDueDate || undefined,
                              points: subDraftPoints,
                            });
                            setEditingSubtaskId(null);
                            toast.success("Subtask updated");
                          }}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="md:grid grid-cols-[80px_1fr_120px_110px_110px_90px_60px_70px] items-center md:px-4 py-2.5 hover:bg-muted/30 transition-all text-xs flex flex-col md:flex-row space-y-2 md:space-y-0 gap-2 md:gap-0">
                      {/* ID */}
                      <button
                        onClick={() => onOpenOther(s.id)}
                        className="font-mono text-[10px] text-primary text-left truncate font-bold w-full md:w-auto tracking-tight cursor-pointer hover:underline"
                      >
                        {s.id}
                      </button>

                      {/* Title */}
                      <button
                        onClick={() => onOpenOther(s.id)}
                        className="text-left font-medium truncate w-full md:w-auto md:pr-3 cursor-pointer hover:underline text-foreground"
                        title={s.title}
                      >
                        {s.title}
                      </button>

                      {/* Assignee Selection */}
                      <div className="w-full md:w-auto">
                        <Select
                          value={s.assigneeId || "unassigned"}
                          onValueChange={(val) => {
                            updateItem(s.id, {
                              assigneeId:
                                val === "unassigned" ? undefined : val,
                            });
                            toast.success("Assignee updated");
                          }}
                        >
                          <SelectTrigger className="h-7 text-[11px] max-w-[110px] border-none bg-transparent shadow-none hover:bg-muted/80 py-0 px-2 cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">
                              <span className="text-muted-foreground italic">
                                Unassigned
                              </span>
                            </SelectItem>
                            {DIRECTORY.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center gap-1.5">
                                  <PersonAvatar userId={p.id} size="xs" />
                                  <span className="truncate">
                                    {p.name.split(" ")[0]}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Status Selection */}
                      <div className="w-full md:w-auto">
                        <Select
                          value={s.status}
                          onValueChange={(val) => {
                            updateItem(s.id, { status: val });
                            toast.success("Status updated");
                          }}
                        >
                          <SelectTrigger className="h-7 text-[11px] max-w-[100px] border border-border/60 bg-background/50 py-0 px-2 cursor-pointer shadow-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((st) => (
                              <SelectItem key={st} value={st}>
                                {st}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Priority Selection */}
                      <div className="w-full md:w-auto">
                        <Select
                          value={s.priority}
                          onValueChange={(val) => {
                            updateItem(s.id, { priority: val as Priority });
                            toast.success("Priority updated");
                          }}
                        >
                          <SelectTrigger className="h-7 text-[11px] max-w-[100px] border-none bg-transparent shadow-none hover:bg-muted/80 py-0 px-2 cursor-pointer">
                            <span
                              className={cn(
                                "text-[11px] font-semibold",
                                PRIORITY_META[s.priority].color,
                              )}
                            >
                              {PRIORITY_META[s.priority].label}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRIORITY_META).map(([p, m]) => (
                              <SelectItem key={p} value={p}>
                                <span
                                  className={cn(
                                    "text-xs font-semibold",
                                    m.color,
                                  )}
                                >
                                  {m.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Due Date Display */}
                      <div className="w-full md:w-auto">
                        {s.dueDate ? (
                          <DueDateBadge
                            dueDate={s.dueDate}
                            isCompleted={s.status === "Completed"}
                            className="h-6"
                          />
                        ) : (
                          <span className="text-muted-foreground/50 text-[11px]">
                            —
                          </span>
                        )}
                      </div>

                      {/* Story Points */}
                      <div className="w-full md:w-auto font-mono text-xs pl-1">
                        {s.points} pts
                      </div>

                      {/* Actions (Edit / Delete) */}
                      <div className="flex items-center justify-end gap-1 w-full md:w-auto text-right pr-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => startEditing(s)}
                          title="Edit subtask"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={() => {
                            if (
                              confirm(
                                "Are you sure you want to delete this subtask?",
                              )
                            ) {
                              deleteItem(s.id);
                              toast.success("Subtask deleted");
                            }
                          }}
                          title="Delete subtask"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Hierarchy Context */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-500" /> Hierarchy Context
        </h3>
        <div className="space-y-2.5 text-xs text-muted-foreground">
          {/* Parent Epic */}
          <div className="flex items-center justify-between py-1 border-b border-border/40 pb-1.5">
            <span className="font-medium text-muted-foreground">
              Parent Epic
            </span>
            {parentEpic ? (
              <button
                onClick={() => onOpenOther(parentEpic.id)}
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0 truncate max-w-[240px] md:max-w-[400px] cursor-pointer"
              >
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 pointer-events-none text-[10px] scale-90 border-0">
                  {parentEpic.id}
                </Badge>
                <span className="truncate">{parentEpic.title}</span>
              </button>
            ) : (
              <span className="text-muted-foreground/50 italic">—</span>
            )}
          </div>

          {/* Parent Feature */}
          <div className="flex items-center justify-between py-1 border-b border-border/40 pb-1.5">
            <span className="font-medium text-muted-foreground">
              Parent Feature
            </span>
            {parentFeature ? (
              <button
                onClick={() => onOpenOther(parentFeature.id)}
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0 truncate max-w-[240px] md:max-w-[400px] cursor-pointer"
              >
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 pointer-events-none text-[10px] scale-90 border-0">
                  {parentFeature.id}
                </Badge>
                <span className="truncate">{parentFeature.title}</span>
              </button>
            ) : (
              <span className="text-muted-foreground/50 italic">—</span>
            )}
          </div>

          {/* Parent Story */}
          <div className="flex items-center justify-between py-1 border-b border-border/40 pb-1.5">
            <span className="font-medium text-muted-foreground">
              Parent Story
            </span>
            {parentStory ? (
              <button
                onClick={() => onOpenOther(parentStory.id)}
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0 truncate max-w-[240px] md:max-w-[400px] cursor-pointer"
              >
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 pointer-events-none text-[10px] scale-90 border-0">
                  {parentStory.id}
                </Badge>
                <span className="truncate">{parentStory.title}</span>
              </button>
            ) : (
              <span className="text-muted-foreground/50 italic">—</span>
            )}
          </div>

          {/* Current Task */}
          <div className="flex items-center justify-between py-1 pt-1.5">
            <span className="font-semibold text-foreground capitalize">
              Current {item.type}
            </span>
            <div className="inline-flex items-center gap-1.5 font-semibold text-foreground shrink-0 truncate max-w-[240px] md:max-w-[400px]">
              <Badge
                className={cn(
                  "px-1.5 leading-none h-5 border-0 hover:bg-current font-bold font-mono tracking-tight uppercase scale-90",
                  meta.bg,
                  meta.color,
                )}
              >
                {item.id}
              </Badge>
              <span className="truncate">{item.title}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground truncate">
        {icon}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

/* ---------- DESCRIPTION ---------- */
function DescriptionTab({ item }: { item: BacklogItem }) {
  const { updateItem } = useWorkspaceStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.description ?? "");
  useEffect(() => setDraft(item.description ?? ""), [item.description]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Description</h2>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <div className="flex gap-1 border border-border rounded-md p-1 bg-card">
            {["B", "I", "{ }", "•", "—", "🔗"].map((t) => (
              <button
                key={t}
                className="px-2 h-7 text-xs rounded hover:bg-muted"
              >
                {t}
              </button>
            ))}
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            placeholder="Add context, links, design references…"
            className="font-mono text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setDraft(item.description ?? "");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-gradient-primary text-primary-foreground"
              onClick={() => {
                updateItem(item.id, { description: draft });
                setEditing(false);
                toast.success("Description saved");
              }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="rounded-lg border border-border bg-card p-5 min-h-[200px] text-sm whitespace-pre-wrap text-foreground/90 cursor-text"
          onClick={() => setEditing(true)}
        >
          {item.description?.trim() || (
            <span className="text-muted-foreground">
              Click to add a description…
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- ACCEPTANCE ---------- */
function AcceptanceTab({ item }: { item: BacklogItem }) {
  const {
    addAcceptance,
    toggleAcceptance,
    removeAcceptance,
    updateAcceptance,
  } = useWorkspaceStore();
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraftText, setEditDraftText] = useState("");
  const list = item.acceptanceCriteria ?? [];
  const done = list.filter((a) => a.done).length;

  const startEditing = (id: string, initialText: string) => {
    setEditingId(id);
    setEditDraftText(initialText);
  };

  const saveEditing = (id: string) => {
    if (editDraftText.trim()) {
      updateAcceptance(item.id, id, editDraftText.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Acceptance criteria</h2>
        <span className="text-xs text-muted-foreground">
          {done}/{list.length} complete
        </span>
      </div>
      <Progress
        value={list.length ? (done / list.length) * 100 : 0}
        className="h-1.5"
      />
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {list.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No acceptance criteria yet. Add the first one below.
          </div>
        )}
        {list.map((a) => {
          const isDefault =
            a.isDefault || DEFAULT_ACCEPTANCE_CRITERIA_TEXTS.includes(a.text);
          const isEditing = editingId === a.id;

          return (
            <div
              key={a.id}
              className="flex items-center gap-3 px-4 py-2.5 group min-h-[48px]"
            >
              <button
                onClick={() => toggleAcceptance(item.id, a.id)}
                className={cn(
                  "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5",
                  a.done
                    ? "bg-success border-success text-white"
                    : "border-border",
                )}
              >
                {a.done && <Check className="h-3 w-3" />}
              </button>

              {isEditing ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    className="h-7 text-xs flex-1"
                    value={editDraftText}
                    onChange={(e) => setEditDraftText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveEditing(a.id);
                      } else if (e.key === "Escape") {
                        cancelEditing();
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-success"
                    onClick={() => saveEditing(a.id)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={cancelEditing}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span
                    className={cn(
                      "text-sm flex-1 break-all",
                      a.done && "line-through text-muted-foreground",
                    )}
                  >
                    {a.text}
                    {isDefault && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground select-none">
                        Locked
                      </span>
                    )}
                  </span>
                  {!isDefault && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => startEditing(a.id, a.text)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => removeAcceptance(item.id, a.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add criterion and press Enter"
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              addAcceptance(item.id, text.trim());
              setText("");
            }
          }}
        />
        <Button
          onClick={() => {
            if (text.trim()) {
              addAcceptance(item.id, text.trim());
              setText("");
            }
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}

/* ---------- DEPENDENCIES & RISKS ---------- */
function DependenciesTab({
  item,
  onOpenOther,
}: {
  item: BacklogItem;
  onOpenOther: (id: string, initialTab?: string) => void;
}) {
  const { addDependencyRisk, updateDependencyRisk, removeDependencyRisk } =
    useWorkspaceStore();

  const [filterType, setFilterType] = useState<string>("all");
  const [filterImpact, setFilterImpact] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");

  const [sortField, setSortField] = useState<string>("loggedDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal setup
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [type, setType] = useState<"Dependency" | "Risk">("Dependency");
  const [description, setDescription] = useState("");
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [impactLevel, setImpactLevel] = useState<
    "Blocker" | "Critical" | "High" | "Medium" | "Low"
  >("Medium");
  const [mitigationNote, setMitigationNote] = useState("");
  const [status, setStatus] = useState<"Open" | "In Progress" | "Closed">(
    "Open",
  );
  const [ownerSearch, setOwnerSearch] = useState("");
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);

  const resetForm = () => {
    setType("Dependency");
    setDescription("");
    setSelectedOwnerIds([]);
    setImpactLevel("Medium");
    setMitigationNote("");
    setStatus("Open");
    setEditingId(null);
    setOwnerSearch("");
    setShowOwnerDropdown(false);
  };

  const populateForm = (dr: DependencyRisk) => {
    setType(dr.type);
    setDescription(dr.description);
    setSelectedOwnerIds(dr.ownerIds ?? []);
    setImpactLevel(dr.impactLevel);
    setMitigationNote(dr.mitigationNote ?? "");
    setStatus(dr.status);
    setEditingId(dr.id);
    setOwnerSearch("");
  };

  const currentRecords = item.dependencyRisks ?? [];

  // Filter records
  const filteredRecords = currentRecords.filter((dr) => {
    if (filterType !== "all" && dr.type !== filterType) return false;
    if (filterImpact !== "all" && dr.impactLevel !== filterImpact) return false;
    if (filterStatus !== "all" && dr.status !== filterStatus) return false;
    if (filterOwner !== "all" && !dr.ownerIds?.includes(filterOwner))
      return false;
    return true;
  });

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let comp = 0;
    if (sortField === "type") {
      comp = a.type.localeCompare(b.type);
    } else if (sortField === "description") {
      comp = a.description.localeCompare(b.description);
    } else if (sortField === "impactLevel") {
      const getImpactWeight = (impact: string) => {
        switch (impact) {
          case "Blocker":
            return 5;
          case "Critical":
            return 4;
          case "High":
            return 3;
          case "Medium":
            return 2;
          case "Low":
            return 1;
          default:
            return 0;
        }
      };
      comp = getImpactWeight(a.impactLevel) - getImpactWeight(b.impactLevel);
    } else if (sortField === "status") {
      const getStatusWeight = (stat: string) => {
        switch (stat) {
          case "Open":
            return 3;
          case "In Progress":
            return 2;
          case "Closed":
            return 1;
          default:
            return 0;
        }
      };
      comp = getStatusWeight(a.status) - getStatusWeight(b.status);
    } else if (sortField === "loggedDate") {
      comp = a.loggedDate.localeCompare(b.loggedDate);
    } else if (sortField === "closureDate") {
      comp = (a.closureDate ?? "").localeCompare(b.closureDate ?? "");
    }

    return sortOrder === "asc" ? comp : -comp;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (selectedOwnerIds.length === 0) {
      toast.error("At least one Owner is required");
      return;
    }

    const payload = {
      type,
      description,
      ownerIds: selectedOwnerIds,
      impactLevel,
      mitigationNote: mitigationNote || undefined,
      status,
    };

    if (formMode === "add") {
      addDependencyRisk(item.id, payload);
      toast.success("Added successfully");
    } else if (formMode === "edit" && editingId) {
      updateDependencyRisk(item.id, editingId, payload);
      toast.success("Updated successfully");
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (drId: string) => {
    if (confirm("Are you sure you want to delete this record?")) {
      removeDependencyRisk(item.id, drId);
      toast.success("Deleted successfully");
    }
  };

  const filteredMembers = DIRECTORY.filter(
    (member) =>
      member.name.toLowerCase().includes(ownerSearch.toLowerCase()) ||
      member.designation.toLowerCase().includes(ownerSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end justify-between bg-muted/40 p-4 rounded-xl border border-border/60">
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <span className="block text-[10px] text-muted-foreground font-semibold uppercase mb-1">
              Type
            </span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer w-32"
            >
              <option value="all">All Types</option>
              <option value="Dependency">Dependency</option>
              <option value="Risk">Risk</option>
            </select>
          </div>

          <div>
            <span className="block text-[10px] text-muted-foreground font-semibold uppercase mb-1">
              Impact
            </span>
            <select
              value={filterImpact}
              onChange={(e) => setFilterImpact(e.target.value)}
              className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer w-32"
            >
              <option value="all">All Impacts</option>
              <option value="Blocker">Blocker</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <span className="block text-[10px] text-muted-foreground font-semibold uppercase mb-1">
              Status
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer w-32"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <span className="block text-[10px] text-muted-foreground font-semibold uppercase mb-1">
              Owner
            </span>
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer w-36"
            >
              <option value="all">All Owners</option>
              {DIRECTORY.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          size="sm"
          className="gap-1.5 cursor-pointer"
          onClick={() => {
            setFormMode("add");
            resetForm();
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          <span>Add</span>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground select-none">
                <th
                  onClick={() => handleSort("description")}
                  className="p-3 cursor-pointer hover:bg-muted transition-colors min-w-[180px]"
                >
                  <div className="flex items-center gap-1">
                    Description
                    {sortField === "description" &&
                      (sortOrder === "asc" ? "▲" : "▼")}
                  </div>
                </th>
                <th className="p-3 w-40">Owner(s)</th>
                <th
                  onClick={() => handleSort("impactLevel")}
                  className="p-3 cursor-pointer hover:bg-muted transition-colors w-28"
                >
                  <div className="flex items-center gap-1">
                    Impact Level
                    {sortField === "impactLevel" &&
                      (sortOrder === "asc" ? "▲" : "▼")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="p-3 cursor-pointer hover:bg-muted transition-colors w-28"
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === "status" &&
                      (sortOrder === "asc" ? "▲" : "▼")}
                  </div>
                </th>
                <th className="p-3 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedRecords.map((dr) => (
                <tr
                  key={dr.id}
                  className="hover:bg-muted/30 text-sm transition-colors group"
                >
                  <td className="p-3 font-normal max-w-[240px] truncate-none">
                    <p className="text-foreground break-words leading-relaxed font-normal">
                      {dr.description}
                    </p>
                    {dr.mitigationNote && (
                      <div className="mt-1 text-xs text-muted-foreground bg-muted/45 rounded p-1.5 border border-border/40">
                        <span className="font-semibold text-[10px] text-muted-foreground uppercase block">
                          Mitigation Notes
                        </span>
                        <p className="break-words font-normal">
                          {dr.mitigationNote}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {dr.ownerIds && dr.ownerIds.length > 0 ? (
                        <>
                          {(() => {
                            const firstOwner = DIRECTORY.find(
                              (d) => d.id === dr.ownerIds![0],
                            );
                            if (!firstOwner) return null;
                            return (
                              <div
                                key={dr.ownerIds![0]}
                                className="inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-full text-[11px] font-medium text-foreground border border-border/30"
                              >
                                <PersonAvatar
                                  userId={dr.ownerIds![0]}
                                  size="xs"
                                />
                                <span className="truncate max-w-[70px]">
                                  {firstOwner.name.split(" ")[0]}
                                </span>
                              </div>
                            );
                          })()}
                          {dr.ownerIds.length > 1 && (
                            <TooltipProvider>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex items-center justify-center bg-muted px-1.5 py-0.5 rounded-full text-[11px] font-medium text-foreground border border-border/30 cursor-pointer">
                                    <Plus className="h-3 w-3 mr-0.5" />
                                    {dr.ownerIds.length - 1}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                                      All Owners
                                    </span>
                                    {dr.ownerIds.map((id) => {
                                      const owner = DIRECTORY.find(
                                        (d) => d.id === id,
                                      );
                                      if (!owner) return null;
                                      return (
                                        <div
                                          key={id}
                                          className="flex items-center gap-1.5 whitespace-nowrap"
                                        >
                                          <PersonAvatar userId={id} size="xs" />
                                          <span className="text-xs">
                                            {owner.name}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    {dr.impactLevel === "Blocker" && (
                      <Badge className="bg-red-200 text-red-900 border border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                        Blocker
                      </Badge>
                    )}
                    {dr.impactLevel === "Critical" && (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
                        Critical
                      </Badge>
                    )}
                    {dr.impactLevel === "High" && (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900">
                        High
                      </Badge>
                    )}
                    {dr.impactLevel === "Medium" && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900">
                        Medium
                      </Badge>
                    )}
                    {dr.impactLevel === "Low" && (
                      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900">
                        Low
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    {dr.status === "Open" && (
                      <Badge className="bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                        Open
                      </Badge>
                    )}
                    {dr.status === "In Progress" && (
                      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                        In Progress
                      </Badge>
                    )}
                    {dr.status === "Closed" && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                        Closed
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          populateForm(dr);
                          setFormMode("edit");
                          setIsModalOpen(true);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit Record"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(dr.id)}
                        className="p-1 rounded text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground text-sm"
                  >
                    No dependency or risk records found matching the active
                    filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FIXED PORTAL BACKDROP MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl p-6 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-semibold text-foreground">
                {formMode === "add"
                  ? "Add Dependency / Risk"
                  : "Edit Dependency / Risk"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Record Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Record Type <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={cn(
                      "py-2 px-4 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
                      type === "Dependency"
                        ? "bg-blue-500/10 border-blue-500/60 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                    onClick={() => setType("Dependency")}
                  >
                    Dependency
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "py-2 px-4 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
                      type === "Risk"
                        ? "bg-amber-500/10 border-amber-500/60 text-amber-600 dark:text-amber-400 font-bold shadow-xs"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                    onClick={() => setType("Risk")}
                  >
                    Risk
                  </button>
                </div>
              </div>

              {/* Logged Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Logged Date
                </label>
                <Input
                  disabled
                  value={
                    formMode === "edit" && editingId
                      ? (currentRecords.find((r) => r.id === editingId)
                          ?.loggedDate ??
                        new Date().toISOString().split("T")[0])
                      : new Date().toISOString().split("T")[0]
                  }
                  className="bg-muted text-muted-foreground cursor-not-allowed opacity-80"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Description <span className="text-destructive">*</span>
                </label>
                <Textarea
                  required
                  placeholder="Enter detailed description of the dependency or risk..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-20"
                />
              </div>

              {/* Searchable Multi-Select Owners */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Owner(s) <span className="text-destructive">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedOwnerIds.map((id) => {
                    const owner = DIRECTORY.find((d) => d.id === id);
                    if (!owner) return null;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="gap-1 px-1.5 py-0.5 border border-border/40"
                      >
                        <PersonAvatar userId={id} size="xs" />
                        <span>{owner.name}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground ml-1 font-bold"
                          onClick={() =>
                            setSelectedOwnerIds((ids) =>
                              ids.filter((x) => x !== id),
                            )
                          }
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    );
                  })}
                  {selectedOwnerIds.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Select one or more owners below
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Input
                    placeholder="Search teammates..."
                    value={ownerSearch}
                    onChange={(e) => {
                      setOwnerSearch(e.target.value);
                      setShowOwnerDropdown(true);
                    }}
                    onFocus={() => setShowOwnerDropdown(true)}
                  />
                  {showOwnerDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-[210]"
                        onClick={() => setShowOwnerDropdown(false)}
                      />
                      <div className="absolute top-full left-0 z-[220] mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
                        {filteredMembers.map((member) => {
                          const isSelected = selectedOwnerIds.includes(
                            member.id,
                          );
                          return (
                            <button
                              key={member.id}
                              type="button"
                              className={cn(
                                "w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between transition-colors cursor-pointer",
                                isSelected
                                  ? "bg-muted font-medium"
                                  : "hover:bg-muted",
                              )}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedOwnerIds((ids) =>
                                    ids.filter((id) => id !== member.id),
                                  );
                                } else {
                                  setSelectedOwnerIds((ids) => [
                                    ...ids,
                                    member.id,
                                  ]);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <PersonAvatar userId={member.id} size="xs" />
                                <div>
                                  <p className="font-semibold">{member.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {member.designation}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-primary" />
                              )}
                            </button>
                          );
                        })}
                        {filteredMembers.length === 0 && (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            No teammates found
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Impact Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Impact Level <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  value={impactLevel}
                  onChange={(e) =>
                    setImpactLevel(
                      e.target.value as
                        | "Blocker"
                        | "Critical"
                        | "High"
                        | "Medium"
                        | "Low",
                    )
                  }
                  className="text-xs bg-card border border-border rounded-lg w-full px-2.5 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  <option value="Blocker">
                    Blocker (Immediate work blockage)
                  </option>
                  <option value="Critical">
                    Critical (Severe risk to milestone)
                  </option>
                  <option value="High">High (Major delay expected)</option>
                  <option value="Medium">Medium (Manageable impact)</option>
                  <option value="Low">Low (Negligible impact)</option>
                </select>
              </div>

              {/* Mitigation Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Mitigation Note
                </label>
                <Textarea
                  placeholder="Describe plans on how to mitigate or handle this risk/dependency..."
                  value={mitigationNote}
                  onChange={(e) => setMitigationNote(e.target.value)}
                  className="min-h-16"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as "Open" | "In Progress" | "Closed",
                    )
                  }
                  className="text-xs bg-card border border-border rounded-lg w-full px-2.5 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Closure Date description when Closed */}
              {status === "Closed" && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs leading-relaxed">
                  <span className="font-semibold">Closure Date:</span> Today (
                  {new Date().toISOString().split("T")[0]}) - automatically
                  managed upon closing this item.
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {formMode === "add" ? "Create Record" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- COMMENTS ---------- */
const EMOJIS = ["👍", "🎉", "🚀", "❤️", "👀", "🤔"];
function CommentsTab({ item }: { item: BacklogItem }) {
  const { addComment, toggleReaction } = useWorkspaceStore();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const comments = item.comments ?? [];

  // Mentions (@user tagging)
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionSearch, setMentionSearch] = useState<{
    query: string;
    index: number;
  } | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);

  // Attachment Upload
  const commentFileRef = useRef<HTMLInputElement>(null);
  const [temporaryAttachments, setTemporaryAttachments] = useState<
    Attachment[]
  >([]);

  const searchResults = useMemo(() => {
    if (!mentionSearch) return [];
    return DIRECTORY.filter(
      (member) =>
        member.name.toLowerCase().includes(mentionSearch.query.toLowerCase()) ||
        member.id.toLowerCase().includes(mentionSearch.query.toLowerCase()),
    );
  }, [mentionSearch]);

  const getActiveMentionSearch = (text: string, selectionEnd: number) => {
    const textBeforeCursor = text.substring(0, selectionEnd);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");
    if (lastAtIdx === -1) return null;

    // Check if there's a space or newline after the last '@'
    const textAfterAt = textBeforeCursor.substring(lastAtIdx + 1);
    if (textAfterAt.includes(" ") || textAfterAt.includes("\n")) return null;

    // Must be preceded by space, newline, or be at the start
    if (
      lastAtIdx > 0 &&
      textBeforeCursor[lastAtIdx - 1] !== " " &&
      textBeforeCursor[lastAtIdx - 1] !== "\n"
    ) {
      return null;
    }

    return {
      query: textAfterAt,
      index: lastAtIdx,
    };
  };

  const selectMention = (member: (typeof DIRECTORY)[0]) => {
    if (!mentionSearch) return;
    const before = body.substring(0, mentionSearch.index);
    const after = body.substring(
      mentionSearch.index + 1 + mentionSearch.query.length,
    );
    const newBody = `${before}@${member.id} ${after}`;
    setBody(newBody);
    setMentionSearch(null);

    // Refocus the textarea and position the cursor after the inserted tag
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = before.length + member.id.length + 2; // +2 for @ and trailing space
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);

    const selStart = e.target.selectionStart || 0;
    const search = getActiveMentionSearch(val, selStart);
    if (search) {
      setMentionSearch(search);
      setActiveMentionIndex(0);
    } else {
      setMentionSearch(null);
    }
  };

  const handleTextareaSelect = (
    e: React.SyntheticEvent<HTMLTextAreaElement>,
  ) => {
    const selStart =
      (e.currentTarget as HTMLTextAreaElement).selectionStart || 0;
    const search = getActiveMentionSearch(body, selStart);
    if (search) {
      setMentionSearch(search);
    } else {
      setMentionSearch(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSearch && searchResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveMentionIndex((prev) => (prev + 1) % searchResults.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveMentionIndex(
          (prev) => (prev - 1 + searchResults.length) % searchResults.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectMention(searchResults[activeMentionIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMentionSearch(null);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newAttachments = files.map((f) => {
      const url = URL.createObjectURL(f);
      return {
        id: `att-cmt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: f.name,
        mime: f.type || "application/octet-stream",
        size: f.size,
        url,
        uploadedBy: CURRENT_USER_ID,
        uploadedAt: new Date().toISOString(),
        version: 1,
      };
    });
    setTemporaryAttachments((prev) => [...prev, ...newAttachments]);
    toast.success(`${files.length} file(s) attached to comment draft`);
    if (commentFileRef.current) {
      commentFileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">Comments ({comments.length})</h2>
      <div className="space-y-4">
        {comments.map((c) => {
          const author = DIRECTORY.find((d) => d.id === c.authorId);
          return (
            <div
              key={c.id}
              className={cn(
                "rounded-lg border p-4",
                c.internal
                  ? "border-warning/40 bg-warning/5"
                  : "border-border bg-card",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <PersonAvatar userId={c.authorId} size="sm" />
                <span className="text-sm font-semibold">
                  {author?.name ?? c.authorId}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
                {c.internal && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-warning border-warning/40"
                  >
                    Internal
                  </Badge>
                )}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {c.body.split(/(@u\d+)/).map((part, i) =>
                  part.startsWith("@u") ? (
                    <span key={i} className="text-primary font-medium">
                      @
                      {DIRECTORY.find(
                        (d) => d.id === part.slice(1),
                      )?.name.split(" ")[0] ?? part.slice(1)}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </p>
              {c.attachments && c.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-border/40">
                  {c.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={att.name}
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-muted/60 hover:bg-muted text-xs rounded-md border border-border transition-colors group/att cursor-pointer"
                    >
                      <Paperclip className="h-3 w-3 text-muted-foreground group-hover/att:text-foreground" />
                      <span className="text-foreground max-w-[150px] truncate font-medium">
                        {att.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({(att.size / 1024).toFixed(1)} KB)
                      </span>
                    </a>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-2">
                {c.reactions.map((r) => (
                  <button
                    key={r.emoji}
                    onClick={() =>
                      toggleReaction(item.id, c.id, r.emoji, CURRENT_USER_ID)
                    }
                    className={cn(
                      "inline-flex items-center gap-1 h-6 px-2 rounded-full border text-xs",
                      r.userIds.includes(CURRENT_USER_ID)
                        ? "bg-primary/10 border-primary/40"
                        : "border-border",
                    )}
                  >
                    <span>{r.emoji}</span>
                    <span className="text-[10px]">{r.userIds.length}</span>
                  </button>
                ))}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <Smile className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1" align="start">
                    <div className="flex gap-1">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          className="h-8 w-8 hover:bg-muted rounded text-base cursor-pointer"
                          onClick={() =>
                            toggleReaction(item.id, c.id, e, CURRENT_USER_ID)
                          }
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 -mx-6 -mb-6 mt-4 px-6 py-4 bg-background/80 backdrop-blur border-t border-border">
        <div className="rounded-lg border border-border bg-card p-3 relative">
          {mentionSearch && searchResults.length > 0 && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-64 max-h-48 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
              {searchResults.map((member, index) => (
                <button
                  key={member.id}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs rounded flex items-center gap-2 cursor-pointer transition-colors",
                    index === activeMentionIndex
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-foreground",
                  )}
                  onClick={() => selectMention(member)}
                >
                  <PersonAvatar userId={member.id} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold">{member.name}</p>
                    <p
                      className={cn(
                        "text-[9px] truncate",
                        index === activeMentionIndex
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground",
                      )}
                    >
                      {member.designation}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {temporaryAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-muted/20 border border-dashed border-border rounded-md">
              {temporaryAttachments.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-card rounded border text-xs text-foreground"
                >
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate max-w-[120px] font-medium">
                    {f.name}
                  </span>
                  <button
                    onClick={() =>
                      setTemporaryAttachments((prev) =>
                        prev.filter((x) => x.id !== f.id),
                      )
                    }
                    className="text-muted-foreground hover:text-foreground hover:bg-muted p-0.5 rounded cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Textarea
            ref={textareaRef}
            value={body}
            onChange={handleTextareaChange}
            onSelect={handleTextareaSelect}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment… Use @ to mention teammates (try @u2, @u3)"
            rows={2}
            className="border-0 focus-visible:ring-0 resize-none p-0"
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                />
                Internal note
              </label>

              <input
                type="file"
                ref={commentFileRef}
                className="hidden"
                multiple
                onChange={handleFileChange}
              />

              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => commentFileRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <Smile className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1.5" align="start">
                  <div className="grid grid-cols-6 gap-1 p-1">
                    {[
                      "👍",
                      "🎉",
                      "🚀",
                      "❤️",
                      "👀",
                      "🤔",
                      "😀",
                      "💡",
                      "🔥",
                      "✅",
                      "👏",
                      "🎈",
                    ].map((e) => (
                      <button
                        key={e}
                        className="h-8 w-8 hover:bg-muted rounded text-lg flex items-center justify-center cursor-pointer"
                        onClick={() => {
                          const start =
                            textareaRef.current?.selectionStart ?? body.length;
                          const end =
                            textareaRef.current?.selectionEnd ?? body.length;
                          const newBody =
                            body.substring(0, start) + e + body.substring(end);
                          setBody(newBody);
                          setTimeout(() => {
                            if (textareaRef.current) {
                              textareaRef.current.focus();
                              textareaRef.current.setSelectionRange(
                                start + e.length,
                                start + e.length,
                              );
                            }
                          }, 0);
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Button
              size="sm"
              className="bg-gradient-primary text-primary-foreground"
              disabled={!body.trim() && temporaryAttachments.length === 0}
              onClick={() => {
                addComment(item.id, {
                  authorId: CURRENT_USER_ID,
                  body: body.trim(),
                  internal,
                  attachments: temporaryAttachments,
                });
                setBody("");
                setInternal(false);
                setTemporaryAttachments([]);
                toast.success("Comment posted");
              }}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- ACTIVITY ---------- */
function ActivityTab({ item }: { item: BacklogItem }) {
  const [filter, setFilter] = useState<
    "all" | "comment" | "history" | "worklog"
  >("all");
  const all = (item.activity ?? []).filter((a) => a.type !== "automation");
  const filtered = all.filter((a) => {
    if (filter === "all") return true;
    if (filter === "comment") return a.type === "comment";
    if (filter === "worklog") return a.type === "worklog";
    return a.type !== "comment" && a.type !== "worklog";
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold mr-2">Activity</h2>
        {[
          { v: "all", l: "All" },
          { v: "comment", l: "Comments" },
          { v: "history", l: "History" },
          { v: "worklog", l: "Worklogs" },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() =>
              setFilter(f.v as "all" | "comment" | "history" | "worklog")
            }
            className={cn(
              "h-7 px-3 rounded-full text-xs border transition-colors cursor-pointer",
              filter === f.v
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.l}
          </button>
        ))}
      </div>
      <div className="space-y-5">
        {filtered
          .slice()
          .reverse()
          .map((a, idx, arr) => {
            const actor = DIRECTORY.find((d) => d.id === a.actorId);
            const showLine = idx < arr.length - 1;
            return (
              <div key={a.id} className="relative flex gap-4 items-start">
                {showLine && (
                  <div className="absolute left-2.5 top-6 bottom-[-20px] w-px bg-border/50" />
                )}

                <div className="relative z-10 shrink-0">
                  <PersonAvatar
                    userId={a.actorId}
                    size="sm"
                    className="border-0 shadow-sm"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-sm text-foreground break-words leading-relaxed">
                    <span className="font-semibold text-foreground mr-1.5">
                      {actor?.name ?? a.actorId}
                    </span>
                    <span className="text-muted-foreground">{a.text}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(a.at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No activity for this filter.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- ATTACHMENTS ---------- */
function AttachmentsTab({ item }: { item: BacklogItem }) {
  const { addAttachment, removeAttachment } = useWorkspaceStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const atts = item.attachments ?? [];

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const url = URL.createObjectURL(f);
      addAttachment(item.id, {
        name: f.name,
        mime: f.type || "application/octet-stream",
        size: f.size,
        url,
        uploadedBy: CURRENT_USER_ID,
      });
    });
    toast.success(`${files.length} file(s) attached`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Attachments ({atts.length})</h2>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" /> Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      <div
        className="rounded-lg border-2 border-dashed border-border bg-card/50 p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Drag and drop files here, or click Upload
        </p>
      </div>

      {atts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {atts.map((a) => {
            const uploader = DIRECTORY.find((d) => d.id === a.uploadedBy);
            const isImg = a.mime.startsWith("image/");
            return (
              <div
                key={a.id}
                className="rounded-lg border border-border bg-card overflow-hidden group"
              >
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {isImg ? (
                    <img
                      src={a.url}
                      alt={a.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(a.size / 1024).toFixed(1)} KB · v{a.version}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => removeAttachment(item.id, a.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <PersonAvatar userId={a.uploadedBy} size="sm" />
                    <span className="truncate">
                      {uploader?.name.split(" ")[0]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- TIME TRACKING ---------- */
function TimeTrackingTab({ item }: { item: BacklogItem }) {
  const { updateItem, addWorklog } = useWorkspaceStore();
  const wlogs = item.worklogs ?? [];
  const logged = wlogs.reduce((a, b) => a + b.hours, 0);
  const est = item.budgetHours ?? 0;
  const remaining = item.remainingHours ?? Math.max(0, est - logged);
  const pct = est ? Math.min(100, (logged / est) * 100) : 0;

  const [hours, setHours] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Original estimate" value={`${est}h`} />
        <SummaryCard label="Time spent" value={`${logged}h`} />
        <SummaryCard label="Remaining" value={`${remaining}h`} />
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span>Burn rate</span>
          <span className="text-muted-foreground">
            {pct.toFixed(0)}% of estimate
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full",
              pct > 100 ? "bg-destructive" : "bg-gradient-primary",
            )}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Log work
        </h3>
        <div className="grid grid-cols-[100px_140px_1fr_100px] gap-2">
          <Input
            type="number"
            step="0.25"
            placeholder="Hours"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            placeholder="What did you work on?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button
            disabled={!hours}
            onClick={() => {
              const h = Number(hours);
              if (!h) return;
              addWorklog(item.id, {
                userId: CURRENT_USER_ID,
                hours: h,
                date,
                comment,
              });
              setHours("");
              setComment("");
              toast.success("Work logged");
            }}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[110px_180px_80px_1fr] px-3 py-2 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Date</div>
          <div>User</div>
          <div>Hours</div>
          <div>Comment</div>
        </div>
        {wlogs.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">
            No work logged yet.
          </div>
        ) : (
          wlogs.map((w) => (
            <div
              key={w.id}
              className="grid grid-cols-[110px_180px_80px_1fr] px-3 py-2 border-b border-border last:border-b-0 text-sm"
            >
              <div>{w.date}</div>
              <div className="flex items-center gap-1.5">
                <PersonAvatar userId={w.userId} size="sm" />
                <span className="text-xs">
                  {DIRECTORY.find((d) => d.id === w.userId)?.name}
                </span>
              </div>
              <div className="font-semibold">{w.hours}h</div>
              <div className="text-muted-foreground truncate">
                {w.comment ?? "—"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------- DEVELOPMENT ---------- */
function DevelopmentTab({ item }: { item: BacklogItem }) {
  const branch = `feature/${item.id.toLowerCase()}-${item.title.toLowerCase().split(" ").slice(0, 3).join("-")}`;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <GitBranch className="h-4 w-4" /> Branches
        </h3>
        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40">
          <code className="text-xs font-mono">{branch}</code>
          <Badge variant="outline" className="text-success border-success/40">
            ahead 4
          </Badge>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <GitPullRequest className="h-4 w-4" /> Pull requests
        </h3>
        {[
          {
            id: 482,
            title: `${item.title} — initial implementation`,
            state: "Open",
            reviews: 1,
          },
          {
            id: 471,
            title: `Refactor types for ${item.id}`,
            state: "Merged",
            reviews: 2,
          },
        ].map((pr) => (
          <div
            key={pr.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
          >
            <div>
              <p className="text-sm font-medium">
                #{pr.id} {pr.title}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Reviews: {pr.reviews}
              </p>
            </div>
            <Badge variant={pr.state === "Merged" ? "secondary" : "outline"}>
              {pr.state}
            </Badge>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Recent commits</h3>
        {[
          "8f3a2b — Wire props",
          "c91e44 — Add tests",
          "1a2bcd — Initial scaffold",
        ].map((c) => (
          <div
            key={c}
            className="text-xs font-mono py-1.5 border-b border-border last:border-b-0"
          >
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- TESTING ---------- */
function TestingTab({ item }: { item: BacklogItem }) {
  const tests = [
    { id: "TC-101", name: "Renders default state", status: "Pass" },
    { id: "TC-102", name: "Handles empty data", status: "Pass" },
    { id: "TC-103", name: "Validates required inputs", status: "Fail" },
    { id: "TC-104", name: "Accessible via keyboard", status: "Untested" },
  ];
  const pass = tests.filter((t) => t.status === "Pass").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total" value={String(tests.length)} />
        <SummaryCard label="Passing" value={`${pass}/${tests.length}`} />
        <SummaryCard label="Coverage" value="78%" />
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {tests.map((t) => (
          <div
            key={t.id}
            className="flex items-center px-4 py-2.5 border-b border-border last:border-b-0"
          >
            <span className="font-mono text-[11px] text-muted-foreground w-20">
              {t.id}
            </span>
            <span className="text-sm flex-1">{t.name}</span>
            <Badge
              variant="outline"
              className={cn(
                t.status === "Pass" && "text-success border-success/40",
                t.status === "Fail" && "text-destructive border-destructive/40",
                t.status === "Untested" && "text-muted-foreground",
              )}
            >
              {t.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
