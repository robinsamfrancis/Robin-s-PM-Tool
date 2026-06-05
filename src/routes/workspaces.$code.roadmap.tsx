import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import {
  Map as MapIcon,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  TrendingUp,
  BarChart2,
  Loader2,
  ChevronRight,
  Info,
  Search,
  Download,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useTaskDetail } from "@/components/task-detail/TaskDetailProvider";
import {
  ISSUE_TYPE_META,
  PRIORITY_META,
  useWorkspace,
  useWorkspaceStore,
  type BacklogItem,
} from "@/lib/workspace-store";
import { parseLocalDate, getDueDateStatus } from "@/lib/due-date-utils";
import { cn } from "@/lib/utils";
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

export const Route = createFileRoute("/workspaces/$code/roadmap")({
  component: RoadmapPage,
});

type DeliverableFilter =
  | "all"
  | "current"
  | "upcoming"
  | "completed"
  | "overdue";
type RangeType = "week" | "month" | "quarter" | "year" | "custom";

const TODAY = new Date(2026, 5, 3); // June 3, 2026

function RoadmapPage() {
  const { code } = Route.useParams();
  const workspace = useWorkspace(code);
  const { store } = useWorkspaceStore();
  const { openTask } = useTaskDetail();

  // Filter States - declared immediately
  const [statusFilter, setStatusFilter] = useState<DeliverableFilter>("all");
  const [rangeType, setRangeType] = useState<RangeType>("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [customStart, setCustomStart] = useState("2026-06-01");
  const [customEnd, setCustomEnd] = useState("2026-07-15");

  // Retrieve All Deliverables (Epics and Features) - unconditional hook
  const deliverables = useMemo(() => {
    return store.items.filter(
      (i) =>
        i.workspaceCode === code && (i.type === "epic" || i.type === "feature"),
    );
  }, [code, store.items]);

  // Expanded items state map
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );

  // TypeScript representation of a hierarchical tree node
  interface TreeNode {
    item: BacklogItem;
    id: string;
    type: string;
    depth: number;
    parentId?: string;
    hasChildren: boolean;
    children: TreeNode[];
    isCompleted: boolean;
    isOverdue: boolean;
    isUpcoming: boolean;
    isCurrent: boolean;
    progress: number;
    parsedStartDate: Date | null;
    parsedDueDate: Date | null;
  }

  // Construct Tree and map properties for each item in the workspace
  const { allRootNodes, allFlatNodes } = useMemo(() => {
    const workspaceItems = store.items.filter((i) => i.workspaceCode === code);

    const getMappedProps = (item: BacklogItem) => {
      const statusLower = item.status?.toLowerCase() || "";
      const isCompleted = statusLower === "completed" || statusLower === "done";

      const parsedStartDate = item.startDate
        ? parseLocalDate(item.startDate)
        : null;
      const parsedDueDate = item.dueDate ? parseLocalDate(item.dueDate) : null;

      const todayMidnight = new Date(TODAY);
      todayMidnight.setHours(0, 0, 0, 0);

      const isOverdue =
        !isCompleted && parsedDueDate && parsedDueDate < todayMidnight;
      const isUpcoming =
        !isCompleted && parsedStartDate && parsedStartDate > todayMidnight;

      const isCurrent =
        !isCompleted &&
        !isOverdue &&
        ((parsedStartDate &&
          parsedStartDate <= todayMidnight &&
          parsedDueDate &&
          parsedDueDate >= todayMidnight) ||
          (parsedStartDate &&
            parsedStartDate <= todayMidnight &&
            !parsedDueDate) ||
          (!parsedStartDate &&
            parsedDueDate &&
            parsedDueDate >= todayMidnight));

      // Progress is based on direct children completion in the workspace
      const directChildren = workspaceItems.filter(
        (sub) => sub.parentId === item.id,
      );
      const completedChildren = directChildren.filter((sub) => {
        const s = sub.status?.toLowerCase() || "";
        return s === "completed" || s === "done";
      });
      const progress =
        directChildren.length > 0
          ? Math.round((completedChildren.length / directChildren.length) * 100)
          : isCompleted
            ? 100
            : 0;

      return {
        isCompleted,
        isOverdue,
        isUpcoming,
        isCurrent,
        progress,
        parsedStartDate,
        parsedDueDate,
      };
    };

    const getChildrenFor = (item: BacklogItem): BacklogItem[] => {
      if (item.type === "epic") {
        return workspaceItems.filter(
          (i) => i.parentId === item.id && i.type === "feature",
        );
      } else if (item.type === "feature") {
        return workspaceItems.filter(
          (i) =>
            i.parentId === item.id && (i.type === "story" || i.type === "task"),
        );
      } else if (item.type === "story") {
        return workspaceItems.filter(
          (i) => i.parentId === item.id && i.type === "task",
        );
      }
      return [];
    };

    const buildNode = (item: BacklogItem, depth: number): TreeNode => {
      const childrenItems = getChildrenFor(item);
      const mapped = getMappedProps(item);
      const childrenNodes = childrenItems.map((child) =>
        buildNode(child, depth + 1),
      );

      return {
        item,
        id: item.id,
        type: item.type,
        depth,
        parentId: item.parentId,
        hasChildren: childrenItems.length > 0,
        children: childrenNodes,
        ...mapped,
      };
    };

    // Find root deliverables: Epics, plus Features that don't belong to an Epic
    const topLevelEpicAndFeatures = workspaceItems.filter((item) => {
      if (item.type === "epic") return true;
      if (item.type === "feature") {
        if (!item.parentId) return true;
        const parent = workspaceItems.find((p) => p.id === item.parentId);
        return !parent || parent.type !== "epic";
      }
      return false;
    });

    const rootNodes = topLevelEpicAndFeatures.map((item) => buildNode(item, 0));

    // Flatten to list all potential roadmap tree items
    const flatList: TreeNode[] = [];
    const traverse = (n: TreeNode) => {
      flatList.push(n);
      n.children.forEach(traverse);
    };
    rootNodes.forEach(traverse);

    return { allRootNodes: rootNodes, allFlatNodes: flatList };
  }, [code, store.items]);

  // Timeline Date Boundaries - unconditional hook
  const timelineBounds = useMemo(() => {
    let min: Date;
    let max: Date;

    if (rangeType === "week") {
      const startOfWeek = new Date(TODAY);
      const day = startOfWeek.getDay() || 7;
      startOfWeek.setDate(startOfWeek.getDate() - (day - 1));
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      min = startOfWeek;
      max = endOfWeek;
    } else if (rangeType === "month") {
      min = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
      max = new Date(
        TODAY.getFullYear(),
        TODAY.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    } else if (rangeType === "quarter") {
      const qStartMonth = Math.floor(TODAY.getMonth() / 3) * 3;
      min = new Date(TODAY.getFullYear(), qStartMonth, 1);
      max = new Date(TODAY.getFullYear(), qStartMonth + 3, 0, 23, 59, 59, 999);
    } else if (rangeType === "year") {
      min = new Date(TODAY.getFullYear(), 0, 1);
      max = new Date(TODAY.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else {
      min = customStart
        ? parseLocalDate(customStart)
        : new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
      max = customEnd
        ? parseLocalDate(customEnd)
        : new Date(
            TODAY.getFullYear(),
            TODAY.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
    }

    return { min, max, span: Math.max(1, max.getTime() - min.getTime()) };
  }, [rangeType, customStart, customEnd]);

  // Generate Timeline Columns / Ticks - unconditional hook
  const timelineTicks = useMemo(() => {
    const { min, max, span } = timelineBounds;
    const ticks: { label: string; pct: number; date: Date }[] = [];

    if (rangeType === "week") {
      for (let i = 0; i < 7; i++) {
        const d = new Date(min);
        d.setDate(d.getDate() + i);
        ticks.push({
          label: d.toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
          }),
          pct: (i / 7) * 100,
          date: d,
        });
      }
    } else if (rangeType === "month") {
      const start = new Date(min);
      let idx = 1;
      while (start <= max) {
        ticks.push({
          label: `Wk ${idx} (${start.getDate()}/${start.getMonth() + 1})`,
          pct: ((start.getTime() - min.getTime()) / span) * 100,
          date: new Date(start),
        });
        start.setDate(start.getDate() + 7);
        idx++;
      }
    } else if (rangeType === "quarter") {
      const start = new Date(min);
      while (start <= max) {
        ticks.push({
          label: start.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          }),
          pct: ((start.getTime() - min.getTime()) / span) * 100,
          date: new Date(start),
        });
        start.setMonth(start.getMonth() + 1);
      }
    } else if (rangeType === "year") {
      const start = new Date(min);
      while (start <= max) {
        ticks.push({
          label: start.toLocaleDateString("en-US", { month: "short" }),
          pct: ((start.getTime() - min.getTime()) / span) * 100,
          date: new Date(start),
        });
        start.setMonth(start.getMonth() + 1);
      }
    } else {
      // Dynamic intervals for Custom Range
      const dayCount = span / (1000 * 60 * 60 * 24);
      if (dayCount <= 15) {
        for (let i = 0; i <= dayCount; i++) {
          const d = new Date(min);
          d.setDate(d.getDate() + i);
          ticks.push({
            label: d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            pct: ((d.getTime() - min.getTime()) / span) * 100,
            date: d,
          });
        }
      } else if (dayCount <= 60) {
        const d = new Date(min);
        while (d <= max) {
          ticks.push({
            label: d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            pct: ((d.getTime() - min.getTime()) / span) * 100,
            date: new Date(d),
          });
          d.setDate(d.getDate() + 7);
        }
      } else {
        const d = new Date(min.getFullYear(), min.getMonth(), 1);
        while (d <= max) {
          if (d >= min) {
            ticks.push({
              label: d.toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              }),
              pct: ((d.getTime() - min.getTime()) / span) * 100,
              date: new Date(d),
            });
          }
          d.setMonth(d.getMonth() + 1);
        }
      }
    }
    return ticks;
  }, [timelineBounds, rangeType]);

  // Aggregate stats counts from full hierarchy
  const stats = useMemo(() => {
    let currentCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let overdueCount = 0;

    allFlatNodes.forEach((d) => {
      if (d.isCompleted) completedCount++;
      else if (d.isOverdue) overdueCount++;
      else if (d.isUpcoming) upcomingCount++;
      else if (d.isCurrent) currentCount++;
    });

    return {
      all: allFlatNodes.length,
      current: currentCount,
      upcoming: upcomingCount,
      completed: completedCount,
      overdue: overdueCount,
    };
  }, [allFlatNodes]);

  // Pruning function and matches criteria filters
  const prunedRootNodes = useMemo(() => {
    const nodeMatchesFilters = (node: TreeNode): boolean => {
      let matchesStatus = true;
      if (statusFilter === "current") matchesStatus = node.isCurrent;
      else if (statusFilter === "upcoming") matchesStatus = node.isUpcoming;
      else if (statusFilter === "completed") matchesStatus = node.isCompleted;
      else if (statusFilter === "overdue") matchesStatus = node.isOverdue;

      const matchesSearch = node.item.title
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    };

    const pruneNodeList = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((node) => {
          const filteredChildren = pruneNodeList(node.children);
          const selfMatches = nodeMatchesFilters(node);

          if (selfMatches || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren,
              hasChildren: node.children.length > 0, // original child count availability
            };
          }
          return null;
        })
        .filter((node): node is TreeNode => node !== null);
    };

    return pruneNodeList(allRootNodes);
  }, [allRootNodes, statusFilter, searchQuery]);

  // Auto-expand any parent node if its child matches filters or search query
  const autoExpandedIds = useMemo(() => {
    if (!searchQuery && statusFilter === "all") return new Set<string>();
    const ids = new Set<string>();

    const nodeMatchesFilters = (node: TreeNode): boolean => {
      let matchesStatus = true;
      if (statusFilter === "current") matchesStatus = node.isCurrent;
      else if (statusFilter === "upcoming") matchesStatus = node.isUpcoming;
      else if (statusFilter === "completed") matchesStatus = node.isCompleted;
      else if (statusFilter === "overdue") matchesStatus = node.isOverdue;

      const matchesSearch = node.item.title
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    };

    const findMatchingAndAddAncestors = (
      nodes: TreeNode[],
      ancestors: string[],
    ) => {
      nodes.forEach((node) => {
        const matches = nodeMatchesFilters(node);
        if (matches && ancestors.length > 0) {
          ancestors.forEach((id) => ids.add(id));
        }
        findMatchingAndAddAncestors(node.children, [...ancestors, node.id]);
      });
    };

    findMatchingAndAddAncestors(allRootNodes, []);
    return ids;
  }, [allRootNodes, searchQuery, statusFilter]);

  const isExpanded = useCallback(
    (id: string) => {
      if ((searchQuery || statusFilter !== "all") && autoExpandedIds.has(id))
        return true;
      return !!expandedItems[id];
    },
    [searchQuery, statusFilter, autoExpandedIds, expandedItems],
  );

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Flatten currently visible / expanded rows
  const visibleRows = useMemo(() => {
    const list: TreeNode[] = [];
    const recurse = (n: TreeNode) => {
      list.push(n);
      if (isExpanded(n.id) && n.children.length > 0) {
        n.children.forEach(recurse);
      }
    };
    prunedRootNodes.forEach(recurse);
    return list;
  }, [prunedRootNodes, isExpanded]);

  // ------------------------------------------------------------------------
  // CONDITIONAL EARLY RETURNS ONLY *AFTER* UNCONDITIONAL HOOK DECLARATIONS
  // ------------------------------------------------------------------------
  if (!workspace) return null;

  if (deliverables.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl p-8">
        <EmptyState
          icon={MapIcon}
          title="No epics or features yet"
          description="Create epics or features on the backlog page, then add start and due dates so they appear on the roadmap timeline."
          actionLabel="Go to backlog"
          onAction={() =>
            (window.location.href = `/workspaces/${code}/backlog`)
          }
        />
      </div>
    );
  }

  const handleExportExcel = () => {
    const headers = [
      "ID",
      "Title (Hierarchical)",
      "Type",
      "Status",
      "Start Date",
      "Due Date",
      "Progress (%)",
    ];

    // Flatten prunedRootNodes completely to retain hierarchical sorted list regardless of expand state during export
    const exportList: TreeNode[] = [];
    const flattenPruned = (n: TreeNode) => {
      exportList.push(n);
      n.children.forEach(flattenPruned);
    };
    prunedRootNodes.forEach(flattenPruned);

    const rows = exportList.map((node) => {
      const { item, progress, depth } = node;
      // Indent title in Excel/CSV using spaces
      const indentation = "    ".repeat(depth);
      const formattedTitle = `${indentation}${item.title || ""}`;

      return [
        item.id,
        // Escape commas, quotes, and newlines in text
        `"${formattedTitle.replace(/"/g, '""')}"`,
        item.type.toUpperCase(),
        item.status,
        item.startDate || "N/A",
        item.dueDate || "N/A",
        `${progress}%`,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${workspace?.name || "Workspace"}_Roadmap_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 lg:px-8 py-8 space-y-8 animate-fade-in font-sans">
      {/* Interactive Toolbar without container box styling */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            {/* Search Input */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Search className="h-3 w-3" /> Search Deliverables
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Filter by deliverable name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {/* Deliverable Status Select Dropdown */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-xs font-semibold text-muted-foreground">
                Deliverable Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as DeliverableFilter)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <BarChart2 className="h-3.5 w-3.5" />
                      All Deliverables ({stats.all})
                    </span>
                  </SelectItem>
                  <SelectItem value="current">
                    <span className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Active ({stats.current})
                    </span>
                  </SelectItem>
                  <SelectItem value="upcoming">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Upcoming ({stats.upcoming})
                    </span>
                  </SelectItem>
                  <SelectItem value="completed">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Completed ({stats.completed})
                    </span>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      Overdue ({stats.overdue})
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timeline View Dropdown */}
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-xs font-semibold text-muted-foreground">
                Timeline View
              </label>
              <Select
                value={rangeType}
                onValueChange={(v) => setRangeType(v as RangeType)}
              >
                <SelectTrigger className="h-9 text-xs capitalize">
                  <SelectValue placeholder="Select Timeline View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Button Container */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <span className="hidden md:block text-xs font-semibold text-transparent select-none">
              Export
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-9 gap-2 text-xs border-dashed"
              title="Export Roadmap details to Excel/CSV"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              <span>Export as Excel</span>
            </Button>
          </div>
        </div>

        {/* Custom date range settings row */}
        {rangeType === "custom" && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/80 animate-fade-in">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Start date:
              </label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-xs py-0 w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">
                End date:
              </label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 text-xs py-0 w-36"
              />
            </div>
            <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              <Info className="h-3 w-3" /> Adjust the dates to crop your roadmap
              viewport.
            </span>
          </div>
        )}
      </div>

      {/* Main Roadmap Area */}
      <div className="space-y-4">
        {/* List Header */}
        <div className="flex items-center justify-end border-b pb-2">
          <span className="text-xs text-muted-foreground">
            Showing {visibleRows.length} item{visibleRows.length !== 1 && "s"}
          </span>
        </div>

        {visibleRows.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            {/* Grid Layout containing Left details column & right Gantt Timeline wrapper */}
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Deliverables details sidebar panel with List item headings */}
              <div className="bg-muted/10">
                <div className="h-11 border-b border-border bg-muted/40 flex items-center px-4">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Deliverable / Progress
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {visibleRows.map((node) => {
                    const {
                      item,
                      progress,
                      isCompleted,
                      isOverdue,
                      depth,
                      hasChildren,
                    } = node;
                    const expanded = isExpanded(node.id);
                    const meta = ISSUE_TYPE_META[item.type];
                    const isUnscheduled = !item.startDate || !item.dueDate;

                    return (
                      <div
                        key={node.id}
                        className="h-16 hover:bg-muted/30 transition-colors flex flex-col justify-center select-none"
                      >
                        <div
                          className="flex items-center justify-between gap-2 px-4 cursor-pointer"
                          style={{ paddingLeft: `${16 + depth * 16}px` }}
                          onClick={() => openTask(item.id)}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {/* Expand/Collapse Toggle Button */}
                            {hasChildren ? (
                              <button
                                onClick={(e) => toggleExpand(node.id, e)}
                                className="p-1 rounded hover:bg-muted/80 cursor-pointer shrink-0 transition-colors"
                              >
                                <ChevronRight
                                  className={cn(
                                    "h-3.5 w-3.5 text-muted-foreground/80 transition-transform duration-200",
                                    expanded && "transform rotate-90",
                                  )}
                                />
                              </button>
                            ) : (
                              <div className="w-[22px] h-[22px] shrink-0" />
                            )}

                            <span
                              className={cn(
                                "inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold shrink-0",
                                meta.bg,
                                meta.color,
                              )}
                              title={meta.label}
                            >
                              {meta.icon}
                            </span>
                            <span
                              className="text-xs font-semibold text-foreground truncate max-w-[140px]"
                              title={item.title}
                            >
                              {item.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 font-sans">
                            {isCompleted ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-55 text-emerald-700 border-emerald-200 dark:bg-emerald-950/10 dark:text-emerald-400 text-[9px] h-4 px-1.5"
                              >
                                Done
                              </Badge>
                            ) : isOverdue ? (
                              <Badge
                                variant="destructive"
                                className="text-[9px] h-4 px-1.5"
                              >
                                Overdue
                              </Badge>
                            ) : isUnscheduled ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/10 dark:text-amber-400 text-[9px] h-4 px-1.5"
                              >
                                Undated
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        {/* Progress Bar under title with correct hierarchical alignment */}
                        <div
                          className="flex items-center gap-2 mt-1 px-4"
                          style={{
                            paddingLeft: `${16 + depth * 16 + 22 + 8}px`,
                          }}
                        >
                          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                isCompleted
                                  ? "bg-emerald-500"
                                  : "bg-purple-500",
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground/80 shrink-0 select-none">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Scrollable Gantt Timeline Area */}
              <div className="overflow-x-auto">
                <div className="min-w-[640px] relative">
                  {/* Gantt Chart Header Container showing timeline header */}
                  <div className="relative h-11 border-b border-border bg-muted/30 flex items-center select-none font-sans">
                    {timelineTicks.map((tick, idx) => (
                      <div
                        key={idx}
                        className="absolute h-full border-l border-border pl-2.5 pt-3.5 text-[9px] uppercase tracking-wider text-muted-foreground font-bold font-sans"
                        style={{ left: `${tick.pct}%` }}
                      >
                        {tick.label}
                      </div>
                    ))}
                  </div>

                  {/* Vertical Grid Alignment guidelines background */}
                  <div className="absolute inset-0 pointer-events-none top-11">
                    {timelineTicks.map((tick, idx) => (
                      <div
                        key={idx}
                        className="absolute top-0 bottom-0 border-l border-dashed border-muted-foreground/10"
                        style={{ left: `${tick.pct}%` }}
                      />
                    ))}
                  </div>

                  {/* High fidelity timeline rows */}
                  <div className="divide-y divide-border relative">
                    {visibleRows.map((node) => {
                      const {
                        item,
                        progress,
                        isCompleted,
                        parsedStartDate,
                        parsedDueDate,
                      } = node;
                      const isUnscheduled = !item.startDate || !item.dueDate;

                      if (isUnscheduled) {
                        return (
                          <div
                            key={node.id}
                            className="h-16 relative flex items-center hover:bg-muted/10 transition-colors px-4"
                          >
                            <div
                              className="flex items-center gap-2 h-7 rounded-lg text-[10px] cursor-pointer shadow-xs border border-dashed border-amber-300 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 transition-colors"
                              onClick={() => openTask(item.id)}
                              title="No calendar dates assigned. Click to configure timeline."
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="font-semibold truncate">
                                Unscheduled — click to configure dates
                              </span>
                            </div>
                          </div>
                        );
                      }

                      const { min, max, span } = timelineBounds;

                      const startT = parsedStartDate ? parsedStartDate : min;
                      const endT = parsedDueDate ? parsedDueDate : max;

                      // Clamp values inside visible viewport bounding range
                      const viewStart = Math.max(
                        startT.getTime(),
                        min.getTime(),
                      );
                      const viewEnd = Math.min(endT.getTime(), max.getTime());

                      // Skip rendering if completely outside current viewport range
                      if (viewStart > viewEnd) {
                        return (
                          <div
                            key={node.id}
                            className="h-16 flex items-center justify-start pl-4 text-[10px] text-muted-foreground/55 italic bg-muted/5 cursor-pointer hover:bg-muted/10 transition-colors"
                            onClick={() => openTask(item.id)}
                          >
                            Scheduled outside bounds ({item.startDate} to{" "}
                            {item.dueDate})
                          </div>
                        );
                      }

                      const leftPct =
                        ((viewStart - min.getTime()) / span) * 100;
                      const widthPct = Math.max(
                        3,
                        ((viewEnd - viewStart) / span) * 100,
                      );

                      let barThemeClass =
                        "bg-purple-500/10 border-purple-300 text-purple-800 dark:text-purple-300 shadow-purple-500/5";
                      let progColorClass = "bg-purple-600";

                      if (isCompleted) {
                        barThemeClass =
                          "bg-emerald-500/10 border-emerald-300 text-emerald-800 dark:text-emerald-300 shadow-emerald-500/5";
                        progColorClass = "bg-emerald-600";
                      } else {
                        if (item.type === "epic") {
                          barThemeClass =
                            "bg-purple-500/10 border-purple-300 text-purple-800 dark:text-purple-300 shadow-purple-500/5";
                          progColorClass = "bg-purple-600";
                        } else if (item.type === "feature") {
                          barThemeClass =
                            "bg-indigo-500/10 border-indigo-300 text-indigo-800 dark:text-indigo-300 shadow-indigo-500/5";
                          progColorClass = "bg-indigo-600";
                        } else if (item.type === "story") {
                          barThemeClass =
                            "bg-sky-500/10 border-sky-300 text-sky-800 dark:text-sky-300 shadow-sky-500/5";
                          progColorClass = "bg-sky-600";
                        } else {
                          // task
                          barThemeClass =
                            "bg-teal-500/10 border-teal-300 text-teal-800 dark:text-teal-300 shadow-teal-500/5";
                          progColorClass = "bg-teal-600";
                        }
                      }

                      return (
                        <div
                          key={node.id}
                          className="h-16 relative flex items-center hover:bg-muted/10 transition-colors"
                        >
                          <div
                            className={cn(
                              "absolute h-7 rounded-lg text-[10px] cursor-pointer shadow-sm group flex items-center justify-between px-3 border select-none transition-all hover:brightness-105 active:scale-98",
                              barThemeClass,
                            )}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                            }}
                            onClick={() => openTask(item.id)}
                            title={`${item.title}\nSchedule: ${item.startDate} to ${item.dueDate}\nProgress: ${progress}%`}
                          >
                            <span className="truncate font-semibold z-10 font-sans text-foreground">
                              {item.title}
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[9px] font-mono z-10 bg-background/90 px-1 py-0.5 rounded border ml-1.5 shadow-xs text-foreground">
                              {item.startDate} → {item.dueDate}
                            </span>

                            {/* Internal timeline block progress filling */}
                            <div
                              className={cn(
                                "absolute left-0 top-0 bottom-0 rounded-l-md transition-all pointer-events-none opacity-20",
                                progColorClass,
                                progress === 100 && "rounded-r-md",
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/5 py-12 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground font-medium">
              No deliverables match the current filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
