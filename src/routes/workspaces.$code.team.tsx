import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Star,
  Users2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Search,
  User,
  Palmtree,
  Activity,
  Layers,
  Sparkles,
  Filter,
  Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonAvatar } from "@/components/PersonAvatar";
import { EmptyState } from "@/components/EmptyState";
import { useTaskDetail } from "@/components/task-detail/TaskDetailProvider";
import {
  DIRECTORY,
  useWorkspace,
  useWorkspaceStore,
  BacklogItem,
  Sprint,
  IssueType,
} from "@/lib/workspace-store";

export const Route = createFileRoute("/workspaces/$code/team")({
  component: TeamPage,
});

// List of Standard Company Holidays inside sprint ranges
const COMPANY_HOLIDAYS = [
  "2026-06-19", // Juneteenth
  "2026-07-04", // Independence Day
  "2026-05-25", // Memorial Day
  "2026-09-07", // Labor Day
  "2026-11-26", // Thanksgiving
  "2026-12-25", // Christmas
  "2026-01-01", // New Year
];

// Local-Safe date parsing to prevent day-shifting bugs
const parseLocalDate = (dateStr: string): Date => {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    );
  }
  return new Date(dateStr);
};

// Generates an array of YYYY-MM-DD date strings within bounds
function generateSprintDays(startStr: string, endStr: string): string[] {
  const days: string[] = [];
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  const curr = new Date(start);

  let safeguard = 100;
  while (curr <= end && safeguard > 0) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, "0");
    const dd = String(curr.getDate()).padStart(2, "0");
    days.push(`${yyyy}-${mm}-${dd}`);
    curr.setDate(curr.getDate() + 1);
    safeguard--;
  }
  return days;
}

// Helpers for checking day types
function isWeekend(dateStr: string): boolean {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

function isHoliday(dateStr: string): boolean {
  return COMPANY_HOLIDAYS.includes(dateStr);
}

// Parses leaves containing half-day notation e.g. "2026-06-10 (half)" or "2026-06-10:half"
interface ParsedLeave {
  dateStr: string;
  isHalfDay: boolean;
}
function parseLeaveItem(rawItem: string): ParsedLeave {
  const trimmed = rawItem.trim();
  const isHalfDay =
    trimmed.toLowerCase().includes("half") ||
    trimmed.includes(".5") ||
    trimmed.toLowerCase().includes("0.5");
  const match = trimmed.match(/\d{4}-\d{2}-\d{2}/);
  const dateStr = match ? match[0] : trimmed;
  return { dateStr, isHalfDay };
}

function getLeaveOnDate(
  leavesList: string[],
  dateStr: string,
): "none" | "full" | "half" {
  for (const leave of leavesList) {
    const parsed = parseLeaveItem(leave);
    if (parsed.dateStr === dateStr) {
      return parsed.isHalfDay ? "half" : "full";
    }
  }
  return "none";
}

// Format date short name, e.g. "Jun 5"
function formatShortDate(dateStr: string): string {
  try {
    const d = parseLocalDate(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

// Gets weekday character e.g. "M", "T"
function getWeekdayLabel(dateStr: string): string {
  try {
    const d = parseLocalDate(dateStr);
    const day = d.getDay();
    const labels = ["S", "M", "T", "W", "T", "F", "S"];
    return labels[day];
  } catch {
    return "";
  }
}

function getTaskBudgetHours(task: BacklogItem): number {
  return task.budgetHours ?? task.estimateHours ?? (task.points || 1) * 4;
}

function getRoleBadge(designation: string) {
  const des = designation.toLowerCase();
  if (des.includes("frontend")) {
    return {
      label: "Frontend",
      className:
        "bg-[#e0f2fe] dark:bg-sky-950/40 text-[#0369a1] dark:text-sky-450 border border-[#bae6fd] dark:border-sky-800/50 rounded-full text-[11px] font-semibold px-2.5 py-0.5",
    };
  }
  if (des.includes("backend")) {
    return {
      label: "Backend",
      className:
        "bg-[#faf5ff] dark:bg-purple-950/40 text-[#7e22ce] dark:text-purple-400 border border-[#f3e8ff] dark:border-purple-800/50 rounded-full text-[11px] font-semibold px-2.5 py-0.5",
    };
  }
  if (des.includes("qa") || des.includes("quality") || des.includes("test")) {
    return {
      label: "QA",
      className:
        "bg-[#fffbeb] dark:bg-amber-950/40 text-[#b45309] dark:text-amber-400 border border-[#fef3c7] dark:border-amber-800/50 rounded-full text-[11px] font-semibold px-2.5 py-0.5",
    };
  }
  return {
    label: designation,
    className:
      "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full text-[11px] font-semibold px-2.5 py-0.5",
  };
}

function TeamPage() {
  const { code } = Route.useParams();
  const workspace = useWorkspace(code);
  const { store, createSprint, updateSprint, startSprint, updateItem } =
    useWorkspaceStore();
  const { openTask } = useTaskDetail();

  // All team members
  const memberIds = useMemo(() => {
    if (!workspace) return [];
    return Array.from(new Set([...workspace.ownerIds, ...workspace.memberIds]));
  }, [workspace]);

  // All sprints in workspace
  const workspaceSprints = useMemo(() => {
    return store.sprints.filter((s) => s.workspaceCode === code);
  }, [store.sprints, code]);

  // Selected Sprint Hook / State
  const [selectedSprintId, setSelectedSprintId] = useState<string>("active");

  const activeSprint = useMemo(() => {
    return workspaceSprints.find((s) => s.state === "active");
  }, [workspaceSprints]);

  // Resolve selected sprint object
  const currentSprint = useMemo(() => {
    if (selectedSprintId === "active") {
      return activeSprint || workspaceSprints[0] || null;
    }
    return workspaceSprints.find((s) => s.id === selectedSprintId) || null;
  }, [selectedSprintId, activeSprint, workspaceSprints]);

  // Seed interactive sample data if there are no sprints
  const handleSeedSampleSprint = () => {
    const today = new Date();
    const startIso = today.toISOString().split("T")[0];
    const end = new Date(today);
    end.setDate(end.getDate() + 11); // spans 11 days (approx 2 weeks)
    const endIso = end.toISOString().split("T")[0];

    const newSp = createSprint({
      workspaceCode: code,
      name: "Sprint 1 (Delivery Phase)",
      goal: "Finalize authentication and construct the resource allocation views.",
      durationWeeks: 2,
      startDate: startIso,
      endDate: endIso,
    });

    // Setup some interesting planned leaves for Alex and Priya
    const updatedLeaves: Record<string, string[]> = {};
    if (memberIds.length > 0) {
      // Alex Morgan (u1) taking 1 full day of leave on working day 3
      const days = generateSprintDays(startIso, endIso).filter(
        (day) => !isWeekend(day) && !isHoliday(day),
      );
      if (days.length > 3) {
        updatedLeaves[memberIds[0]] = [days[2]]; // Full Leave
        if (memberIds.length > 1) {
          updatedLeaves[memberIds[1]] = [`${days[3]} (half)`]; // Priya half leave
        }
      }
    }

    updateSprint(newSp.id, { leaves: updatedLeaves });

    // Assign stories & task items to the new sprint with realistic budget hours!
    const wsItems = store.items.filter((i) => i.workspaceCode === code);
    wsItems.forEach((item, idx) => {
      const assignedUser = memberIds[idx % memberIds.length] || "u1";
      updateItem(item.id, {
        sprintId: newSp.id,
        assigneeId: assignedUser,
        budgetHours:
          item.budgetHours || (idx % 3 === 0 ? 16 : idx % 3 === 1 ? 24 : 8),
        points: item.points || (idx % 3 === 0 ? 5 : idx % 3 === 1 ? 8 : 2),
      });
    });

    startSprint(newSp.id);
    setSelectedSprintId(newSp.id);
  };

  // State Filters
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [resourceIdFilter, setResourceIdFilter] = useState<string>("all");
  const [occupancyFilter, setOccupancyFilter] = useState<string>("all");
  const [leaveFilter, setLeaveFilter] = useState<string>("all");

  // Track expand/collapse dictionary of items
  const [expandedMembers, setExpandedMembers] = useState<
    Record<string, boolean>
  >({});

  const toggleMemberExpand = (uid: string) => {
    setExpandedMembers((prev) => ({
      ...prev,
      [uid]: !prev[uid],
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    memberIds.forEach((id) => (next[id] = true));
    setExpandedMembers(next);
  };

  const handleCollapseAll = () => {
    setExpandedMembers({});
  };

  // Early return if workspace not loaded
  if (!workspace) return null;

  // Return Empty State wrapper if no sprints exist to map resource calendar
  if (workspaceSprints.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl p-8 space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground font-sans">
            Capacity planning & Timeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Plan team workload, schedule deliverables, and allocate sprint hours
            visually.
          </p>
        </div>
        <div className="border border-dashed border-border rounded-2xl bg-card p-12 text-center flex flex-col items-center justify-center gap-4">
          <Palmtree className="h-12 w-12 text-muted-foreground/60 stroke-1" />
          <h3 className="font-semibold text-lg text-foreground">
            No Sprints Configured
          </h3>
          <p className="text-sm text-muted-foreground max-w-md antialiased inline">
            To view or configure team resources workload, availability slots,
            and visual task Gantt allocation schedules, you must have an active
            or planned sprint in this workspace.
          </p>
          <div className="flex gap-3 justify-center mt-3">
            <Button
              className="bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-xs"
              onClick={handleSeedSampleSprint}
            >
              <Sparkles className="h-4 w-4 mr-1.5" /> Initialize Sample Capacity
              Board
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Active dates calculated based on starting index bounds
  const sprintDays = currentSprint
    ? generateSprintDays(currentSprint.startDate, currentSprint.endDate)
    : [];

  const sprintWorkingDaysCount = sprintDays.filter(
    (d) => !isWeekend(d) && !isHoliday(d),
  ).length;

  // Render resource details list
  const memberAllocationDetailsList = memberIds.map((userId) => {
    const person = DIRECTORY.find((p) => p.id === userId);
    const leavesList = currentSprint?.leaves[userId] || [];

    // Calculate Availability hours based on weekdays and leaves
    let totalAvailability = 0;
    const dailyAvailability: Record<string, number> = {};
    let fullLeaveDays = 0;
    let halfLeaveDays = 0;

    sprintDays.forEach((day) => {
      if (isWeekend(day) || isHoliday(day)) {
        dailyAvailability[day] = 0;
      } else {
        const leave = getLeaveOnDate(leavesList, day);
        if (leave === "full") {
          dailyAvailability[day] = 0;
          fullLeaveDays++;
        } else if (leave === "half") {
          dailyAvailability[day] = 4;
          totalAvailability += 4;
          halfLeaveDays++;
        } else {
          dailyAvailability[day] = 8;
          totalAvailability += 8;
        }
      }
    });

    // Associated tasks for the specific user in the current sprint
    const userTasks = store.items.filter(
      (item) =>
        item.workspaceCode === code &&
        item.sprintId === currentSprint?.id &&
        item.assigneeId === userId,
    );

    const totalStoryPoints = userTasks.reduce(
      (sum, item) => sum + (item.points || 0),
      0,
    );
    const totalAllocatedHours = userTasks.reduce(
      (sum, item) => sum + getTaskBudgetHours(item),
      0,
    );

    // Compute occupancy calculations
    const utilizationPct =
      totalAvailability > 0
        ? Math.round((totalAllocatedHours / totalAvailability) * 100)
        : totalAllocatedHours > 0
          ? 999
          : 0;

    let occupancyStatus: "under" | "balanced" | "warning" | "over" = "under";
    let occupancyLabel = "Under Utilized";
    let statusColorClass =
      "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400";

    if (utilizationPct > 110) {
      occupancyStatus = "over";
      occupancyLabel = "Over Allocated";
      statusColorClass =
        "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-400";
    } else if (utilizationPct > 100) {
      occupancyStatus = "warning";
      occupancyLabel = "Slightly Over Allocated";
      statusColorClass =
        "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400";
    } else if (utilizationPct >= 80) {
      occupancyStatus = "balanced";
      occupancyLabel = "Balanced";
      statusColorClass =
        "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400";
    }

    const hasLeave = fullLeaveDays > 0 || halfLeaveDays > 0;

    // Daily distribution engine calculations
    const dailyAllocationSum: Record<string, number> = {};
    sprintDays.forEach((d) => {
      dailyAllocationSum[d] = 0;
    });

    const taskAllocationsByDay: Record<string, Record<string, number>> = {};

    // Sort scheduled tasks to lay down first
    const scheduled = userTasks.filter((t) => t.startDate && t.dueDate);
    const unscheduled = userTasks.filter((t) => !t.startDate || !t.dueDate);

    scheduled.forEach((task) => {
      const budget = getTaskBudgetHours(task);
      taskAllocationsByDay[task.id] = {};

      // Clamp target schedule borders within active sprint
      const taskStart =
        task.startDate! > currentSprint!.startDate
          ? task.startDate!
          : currentSprint!.startDate;
      const taskDue =
        task.dueDate! < currentSprint!.endDate
          ? task.dueDate!
          : currentSprint!.endDate;

      const overlappingDaysIncluded = generateSprintDays(taskStart, taskDue);
      const activeSprintWeekdays = overlappingDaysIncluded.filter(
        (day) => sprintDays.includes(day) && dailyAvailability[day] > 0,
      );

      if (activeSprintWeekdays.length > 0) {
        const dailyAllocationValue = budget / activeSprintWeekdays.length;
        activeSprintWeekdays.forEach((day) => {
          taskAllocationsByDay[task.id][day] = dailyAllocationValue;
          dailyAllocationSum[day] += dailyAllocationValue;
        });
      } else {
        // Fallback allocation if scheduled limits are invalid
        const validWeekdaysInSprint = sprintDays.filter(
          (d) => dailyAvailability[d] > 0,
        );
        if (validWeekdaysInSprint.length > 0) {
          const fallbackCellVal = budget / validWeekdaysInSprint.length;
          validWeekdaysInSprint.forEach((day) => {
            taskAllocationsByDay[task.id][day] = fallbackCellVal;
            dailyAllocationSum[day] += fallbackCellVal;
          });
        }
      }
    });

    // Handle chronological sequential distribution of unscheduled task hours
    let scheduleCursorIdx = 0;
    const weekdaysOnlyList = sprintDays.filter((d) => dailyAvailability[d] > 0);

    unscheduled.forEach((task) => {
      const budget = getTaskBudgetHours(task);
      taskAllocationsByDay[task.id] = {};

      let remainingBudgetToDistribute = budget;
      let failsafeLoopCounter = 100;

      while (remainingBudgetToDistribute > 0 && failsafeLoopCounter > 0) {
        failsafeLoopCounter--;
        if (scheduleCursorIdx >= weekdaysOnlyList.length) {
          scheduleCursorIdx = 0; // Wrap back to beginning
        }

        const currentDayOfChoice = weekdaysOnlyList[scheduleCursorIdx];
        const capacityLimitOfChoice = dailyAvailability[currentDayOfChoice];
        const currentSumAllocatedOnDay =
          dailyAllocationSum[currentDayOfChoice] || 0;
        const availableAmountToday = Math.max(
          0,
          capacityLimitOfChoice - currentSumAllocatedOnDay,
        );

        if (availableAmountToday > 0) {
          const portionToAssign = Math.min(
            remainingBudgetToDistribute,
            availableAmountToday,
          );
          taskAllocationsByDay[task.id][currentDayOfChoice] =
            (taskAllocationsByDay[task.id][currentDayOfChoice] || 0) +
            portionToAssign;
          dailyAllocationSum[currentDayOfChoice] += portionToAssign;
          remainingBudgetToDistribute -= portionToAssign;

          if (portionToAssign >= availableAmountToday) {
            scheduleCursorIdx++; // Move cursor since day capacity was met
          }
        } else {
          scheduleCursorIdx++; // Day is already saturated, look elsewhere
        }

        // Failsafe calculations if all days are saturated but budget leftovers remain
        const totalWorkspaceLeftoverCapacitySum = weekdaysOnlyList.reduce(
          (tot, d) =>
            tot +
            Math.max(0, dailyAvailability[d] - (dailyAllocationSum[d] || 0)),
          0,
        );

        if (
          totalWorkspaceLeftoverCapacitySum <= 0 &&
          remainingBudgetToDistribute > 0
        ) {
          const distributedPortionFallback =
            remainingBudgetToDistribute / weekdaysOnlyList.length;
          weekdaysOnlyList.forEach((day) => {
            taskAllocationsByDay[task.id][day] =
              (taskAllocationsByDay[task.id][day] || 0) +
              distributedPortionFallback;
            dailyAllocationSum[day] += distributedPortionFallback;
          });
          remainingBudgetToDistribute = 0;
        }
      }
    });

    return {
      person,
      userId,
      leavesList,
      totalAvailability,
      dailyAvailability,
      fullLeaveDays,
      halfLeaveDays,
      userTasks,
      totalStoryPoints,
      totalAllocatedHours,
      utilizationPct,
      occupancyStatus,
      occupancyLabel,
      statusColorClass,
      hasLeave,
      dailyAllocationSum,
      taskAllocationsByDay,
    };
  });

  // Calculate Global dashboard summaries
  const totalTeamAvailableHours = memberAllocationDetailsList.reduce(
    (sum, m) => sum + m.totalAvailability,
    0,
  );
  const totalTeamAssignedHours = memberAllocationDetailsList.reduce(
    (sum, m) => sum + m.totalAllocatedHours,
    0,
  );
  const overallTeamUtilizationPct =
    totalTeamAvailableHours > 0
      ? Math.round((totalTeamAssignedHours / totalTeamAvailableHours) * 100)
      : 0;

  const countOverallocated = memberAllocationDetailsList.filter(
    (m) => m.utilizationPct > 110,
  ).length;
  const countUnderutilized = memberAllocationDetailsList.filter(
    (m) => m.utilizationPct < 80,
  ).length;
  const correctedCountUnderutilized = countUnderutilized;
  const countOnLeave = memberAllocationDetailsList.filter(
    (m) => m.hasLeave,
  ).length;

  // Filter the list of records shown according to selected panel values
  const filteredAllocationList = memberAllocationDetailsList.filter((m) => {
    if (!m.person) return false;

    // Resource search query filter (Case insensitive search by name)
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      if (!m.person.name.toLowerCase().includes(q)) return false;
    }

    // Individual resource filter
    if (resourceIdFilter !== "all" && m.userId !== resourceIdFilter) {
      return false;
    }

    // Role / Designation filter
    if (roleFilter !== "all" && m.person.designation !== roleFilter) {
      return false;
    }

    // Occupancy Status filter
    if (occupancyFilter !== "all") {
      if (occupancyFilter === "under" && m.occupancyStatus !== "under")
        return false;
      if (occupancyFilter === "balanced" && m.occupancyStatus !== "balanced")
        return false;
      if (occupancyFilter === "warning" && m.occupancyStatus !== "warning")
        return false;
      if (occupancyFilter === "over" && m.occupancyStatus !== "over")
        return false;
    }

    // Leave Status filter
    if (leaveFilter !== "all") {
      if (leaveFilter === "has_leave" && !m.hasLeave) return false;
      if (leaveFilter === "no_leave" && m.hasLeave) return false;
    }

    return true;
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 lg:px-8 py-6 space-y-6 animate-fade-in font-sans">
      {/* Top Unified Dashboard Card */}
      {currentSprint && (
        <div
          id="sprint-dashboard"
          className="border border-border rounded-xl bg-card p-6 space-y-6 shadow-xs"
        >
          {/* Header Row: Title & Specs left, dropdowns right */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            {/* Left Side: Title & Dynamic Meta Row */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  id="sprint-title"
                  className="text-xl font-semibold tracking-tight text-foreground"
                >
                  {currentSprint.name}
                </h1>
                <Badge
                  id="badge-active"
                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none text-[10px] font-bold h-5 px-2"
                  variant="outline"
                >
                  Active
                </Badge>
              </div>

              <div
                id="sprint-specs"
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-medium"
              >
                <div className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <span>
                    {currentSprint.startDate} → {currentSprint.endDate}
                  </span>
                </div>
                <span>·</span>
                <div>
                  Duration:{" "}
                  <strong className="font-medium text-foreground">
                    {sprintDays.length} days
                  </strong>
                </div>
                <span>·</span>
                <div>
                  Working days:{" "}
                  <strong className="font-medium text-foreground">
                    {sprintWorkingDaysCount}
                  </strong>
                </div>
                <span>·</span>
                <div>
                  Members:{" "}
                  <strong className="font-medium text-foreground">
                    {memberIds.length}
                  </strong>
                </div>
              </div>
            </div>

            {/* Right Side: Responsive Dropdowns Filter Bar */}
            <div
              id="filter-controls"
              className="flex flex-wrap items-center gap-2 xl:justify-end w-full xl:w-auto"
            >
              {/* Search resources name input */}
              <div className="relative w-full sm:w-[200px] shrink-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background border-border text-foreground placeholder-muted-foreground rounded-lg select-text"
                />
              </div>

              {/* Sprint Select */}
              <Select
                value={selectedSprintId}
                onValueChange={setSelectedSprintId}
              >
                <SelectTrigger
                  id="select-sprint"
                  className="w-[160px] h-9 text-xs font-medium bg-background border-border text-foreground rounded-lg"
                >
                  <SelectValue placeholder="Select sprint">
                    {currentSprint
                      ? `${currentSprint.name} · ${currentSprint.state}`
                      : "Select sprint"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {workspaceSprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Role/Team Select */}
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger
                  id="select-team"
                  className="w-[130px] h-9 text-xs font-medium bg-background border-border text-foreground rounded-lg"
                >
                  <SelectValue>
                    {roleFilter === "all" ? "All teams" : roleFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All teams</SelectItem>
                  <SelectItem value="Frontend Developer">
                    Frontend Developers
                  </SelectItem>
                  <SelectItem value="Backend Developer">
                    Backend Developers
                  </SelectItem>
                  <SelectItem value="QA Engineer">QA Engineers</SelectItem>
                  <SelectItem value="UI/UX Designer">
                    UI/UX Designers
                  </SelectItem>
                  <SelectItem value="Product Analyst">
                    Product Analysts
                  </SelectItem>
                  <SelectItem value="DevOps Engineer">
                    DevOps Engineers
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Resource Select */}
              <Select
                value={resourceIdFilter}
                onValueChange={setResourceIdFilter}
              >
                <SelectTrigger
                  id="select-resources"
                  className="w-[140px] h-9 text-xs font-medium bg-background border-border text-foreground rounded-lg"
                >
                  <SelectValue>
                    {resourceIdFilter === "all"
                      ? "All resources"
                      : DIRECTORY.find((p) => p.id === resourceIdFilter)
                          ?.name || "All resources"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All resources</SelectItem>
                  {memberIds.map((id) => {
                    const p = DIRECTORY.find((m) => m.id === id);
                    return (
                      <SelectItem key={id} value={id}>
                        {p?.name || id}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Occupancy Select */}
              <Select
                value={occupancyFilter}
                onValueChange={setOccupancyFilter}
              >
                <SelectTrigger
                  id="select-occupancy"
                  className="w-[140px] h-9 text-xs font-medium bg-background border-border text-foreground rounded-lg"
                >
                  <SelectValue>
                    {occupancyFilter === "all"
                      ? "All occupancy"
                      : occupancyFilter === "under"
                        ? "Underutilized"
                        : occupancyFilter === "balanced"
                          ? "Balanced"
                          : occupancyFilter === "warning"
                            ? "Slightly Over"
                            : "Overallocated"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All occupancy</SelectItem>
                  <SelectItem value="under">Underutilized</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="warning">Slightly Over</SelectItem>
                  <SelectItem value="over">Overallocated</SelectItem>
                </SelectContent>
              </Select>

              {/* Leave Select */}
              <Select value={leaveFilter} onValueChange={setLeaveFilter}>
                <SelectTrigger
                  id="select-leave"
                  className="w-[130px] h-9 text-xs font-medium bg-background border-[#4f46e5]/30 dark:border-[#4f46e5]/40 border text-foreground rounded-lg"
                >
                  <SelectValue>
                    {leaveFilter === "all"
                      ? "Any leave"
                      : leaveFilter === "has_leave"
                        ? "With planned leave"
                        : "No planned leave"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">Any leave</SelectItem>
                  <SelectItem value="has_leave">With planned leaves</SelectItem>
                  <SelectItem value="no_leave">
                    No leaves this sprint
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Option button */}
              {(roleFilter !== "all" ||
                resourceIdFilter !== "all" ||
                occupancyFilter !== "all" ||
                leaveFilter !== "all") && (
                <Button
                  id="btn-clear-filters"
                  size="sm"
                  variant="ghost"
                  className="h-9 px-3 text-xs text-primary hover:bg-muted select-none font-medium"
                  onClick={() => {
                    setRoleFilter("all");
                    setResourceIdFilter("all");
                    setOccupancyFilter("all");
                    setLeaveFilter("all");
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Row of 6 Metric Cards inside the main card */}
          <div
            id="metrics-grid"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {/* Card 1: TEAM CAPACITY */}
            <div
              id="metric-capacity"
              className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-[96px] shadow-xs hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Team Capacity
                </span>
                <Clock className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-1">
                {totalTeamAvailableHours}h
              </p>
            </div>

            {/* Card 2: HOURS ALLOCATED */}
            <div
              id="metric-allocated"
              className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-[96px] shadow-xs hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Allocated
                </span>
                <Layers className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 mt-1">
                {totalTeamAssignedHours}h
              </p>
            </div>

            {/* Card 3: TEAM UTILIZATION */}
            <div
              id="metric-utilization"
              className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-[96px] shadow-xs hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Utilization
                </span>
                <Activity className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-1">
                {overallTeamUtilizationPct}%
              </p>
            </div>

            {/* Card 4: OVERALLOCATED */}
            <div
              id="metric-overallocated"
              className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-[96px] shadow-xs hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Over-allocated
                </span>
                <AlertTriangle className="h-4 w-4 text-red-500 stroke-[1.5]" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-1">
                {countOverallocated}
              </p>
            </div>

            {/* Card 5: UNDERUTILIZED */}
            <div
              id="metric-underutilized"
              className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-[96px] shadow-xs hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Underutilized
                </span>
                <TrendingDown className="h-4 w-4 text-amber-500 stroke-[1.5]" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-1">
                {correctedCountUnderutilized}
              </p>
            </div>

            {/* Card 6: ON LEAVE */}
            <div
              id="metric-onleave"
              className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-[96px] shadow-xs hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  On Leave
                </span>
                <Plane className="h-4 w-4 text-purple-500 stroke-[1.5]" />
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-1">
                {countOnLeave}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Allocation List Section Header & Expand controls */}
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 py-2 select-none text-[13px]">
        <div>
          Showing{" "}
          <strong className="font-bold text-slate-800 dark:text-neutral-100">
            {filteredAllocationList.length}
          </strong>{" "}
          of {memberAllocationDetailsList.length} resources
        </div>
        <div className="flex items-center gap-6 font-semibold">
          <button
            onClick={handleExpandAll}
            className="text-slate-800 dark:text-neutral-150 hover:text-indigo-500 transition cursor-pointer"
          >
            Expand all
          </button>
          <button
            onClick={handleCollapseAll}
            className="text-slate-800 dark:text-neutral-150 hover:text-indigo-500 transition cursor-pointer"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Allocation List Section */}
      <div className="space-y-4">
        {filteredAllocationList.length > 0 ? (
          filteredAllocationList.map((m) => {
            if (!m.person) return null;
            const expanded = !!expandedMembers[m.userId];

            return (
              <div
                key={m.userId}
                className={`rounded-xl border bg-card overflow-hidden shadow-xs transition-colors duration-200 ${
                  expanded
                    ? "border-primary/40 dark:border-primary/40"
                    : "border-border hover:border-border/80"
                }`}
              >
                {/* Visual Accordion Header */}
                <div
                  className="p-5 pb-3 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 cursor-pointer hover:bg-muted/30 transition-all select-none"
                  onClick={() => toggleMemberExpand(m.userId)}
                >
                  {/* Left: User Profiles */}
                  <div className="flex items-center gap-3">
                    <button className="p-1 rounded shrink-0 text-muted-foreground select-none">
                      <ChevronRight
                        className={`h-4.5 w-4.5 transition-transform duration-200 ${
                          expanded ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                    <PersonAvatar
                      userId={m.userId}
                      size="lg"
                      className="font-semibold border-none shrink-0"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[14px] font-semibold text-foreground leading-snug">
                          {m.person.name}
                        </h4>

                        {/* Custom Designations role Badge */}
                        {(() => {
                          const rb = getRoleBadge(m.person.designation);
                          return (
                            <span className={rb.className}>{rb.label}</span>
                          );
                        })()}

                        {/* Leave badge with 45deg rotated plane icon */}
                        {m.hasLeave && (
                          <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30 rounded-full text-[10px] font-semibold px-2 py-0.5 select-none leading-none">
                            <Plane className="h-3 w-3 rotate-45 text-purple-600 shrink-0" />
                            <span>
                              {m.fullLeaveDays + m.halfLeaveDays * 0.5} leave
                              {m.fullLeaveDays + m.halfLeaveDays * 0.5 !== 1 &&
                                "s"}
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {m.person.designation}
                      </p>
                    </div>
                  </div>

                  {/* Right: Spreadsheet Columns */}
                  <div className="flex items-center gap-6 md:gap-8 justify-between w-full xl:w-auto xl:justify-end font-sans pr-2">
                    {/* AVAIL */}
                    <div className="w-14 text-right">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 select-none">
                        Avail
                      </div>
                      <div className="text-[13px] md:text-sm font-semibold text-foreground">
                        {m.totalAvailability}h
                      </div>
                    </div>

                    {/* ALLOC */}
                    <div className="w-14 text-right">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 select-none">
                        Alloc
                      </div>
                      <div className="text-[13px] md:text-sm font-semibold text-foreground">
                        {m.totalAllocatedHours}h
                      </div>
                    </div>

                    {/* REMAINING */}
                    <div className="w-20 text-right">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 select-none">
                        Remaining
                      </div>
                      <div className="text-[13px] md:text-sm font-semibold text-foreground">
                        {m.totalAvailability - m.totalAllocatedHours}h
                      </div>
                    </div>

                    {/* UTIL */}
                    <div className="w-14 text-right">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 select-none">
                        Util
                      </div>
                      <span
                        className={`text-[13px] md:text-sm font-bold ${
                          m.utilizationPct === 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : m.utilizationPct > 110
                              ? "text-red-500"
                              : m.utilizationPct > 100
                                ? "text-amber-500"
                                : "text-primary"
                        }`}
                      >
                        {m.utilizationPct}%
                      </span>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="w-32 flex justify-end">
                      {m.utilizationPct === 0 ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border text-[10px] font-medium text-muted-foreground bg-muted/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                          No Allocation
                        </div>
                      ) : m.utilizationPct < 80 ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-sky-100 dark:border-sky-950/40 text-[10px] font-semibold text-sky-700 dark:text-sky-400 bg-sky-500/10">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                          Under Utilized
                        </div>
                      ) : m.utilizationPct > 110 ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-150 dark:border-red-950/40 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                          Over Allocated
                        </div>
                      ) : m.utilizationPct > 100 ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900/40 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          Slightly Over
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-950/40 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          Balanced
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Always-on Capacity Progress Bar */}
                <div className="px-5 pb-4 space-y-1.5 select-none font-sans">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        m.utilizationPct === 0
                          ? "bg-slate-300 dark:bg-slate-700"
                          : m.utilizationPct > 110
                            ? "bg-red-500"
                            : m.utilizationPct > 100
                              ? "bg-amber-500"
                              : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.min(100, m.utilizationPct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold tracking-tight">
                    <span>0h</span>
                    <span>Capacity {m.totalAvailability}h</span>
                  </div>
                </div>

                {/* Visual Accordion Expanded Content details panel */}
                {expanded && (
                  <div className="border-t border-border bg-muted/10 p-5 space-y-6">
                    {/* Capacity Summary Dashboard banner */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-card border border-border p-4 rounded-xl shadow-2xs">
                      <div className="p-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Working availability
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-sm font-bold text-foreground">
                            {m.totalAvailability} hours
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 antialiased">
                          {sprintWorkingDaysCount} days × 8 hrs
                        </p>
                      </div>

                      <div className="p-1 border-l border-border/40 pl-4">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Allocated Tasks
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-sm font-bold text-foreground">
                            {m.totalAllocatedHours} hours
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 antialiased">
                          {m.userTasks.length} task
                          {m.userTasks.length !== 1 && "s"} assigned
                        </p>
                      </div>

                      <div className="p-1 border-l border-border/40 pl-4">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Remaining Buffer
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span
                            className={`text-sm font-bold ${
                              m.totalAvailability - m.totalAllocatedHours < 0
                                ? "text-red-500"
                                : "text-emerald-500"
                            }`}
                          >
                            {m.totalAvailability - m.totalAllocatedHours} hours
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 antialiased">
                          {m.totalAvailability - m.totalAllocatedHours < 0
                            ? "Overbooked!"
                            : "Available capacity"}
                        </p>
                      </div>

                      <div className="p-1 border-l border-border/40 pl-4">
                        <span className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider flex items-center gap-1">
                          <Palmtree className="h-3.5 w-3.5" /> Approved Leaves
                        </span>
                        <div className="flex items-baseline gap-1 mt-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {m.fullLeaveDays + m.halfLeaveDays * 0.5} days
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[130px] truncate">
                          {m.leavesList.join(", ") || "No leave list details"}
                        </p>
                      </div>

                      <div className="p-1 border-l border-border/40 pl-4 col-span-2 md:col-span-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Story points details
                        </span>
                        <div className="flex items-baseline gap-1 mt-1 text-sm font-bold text-foreground">
                          {m.totalStoryPoints} SP
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Assigned sprint points
                        </p>
                      </div>
                    </div>

                    {/* Task list details */}
                    <div className="space-y-3">
                      <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" /> Sprint Task Listing (
                        {m.userTasks.length} items)
                      </h5>

                      {m.userTasks.length > 0 ? (
                        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-2xs">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b bg-muted/30 font-semibold text-muted-foreground select-none">
                                  <th className="p-3 pl-4 w-28">Task ID</th>
                                  <th className="p-3">Task Name</th>
                                  <th className="p-3 w-28 text-center">
                                    Issue Type
                                  </th>
                                  <th className="p-3 w-28 text-center">
                                    Story Points
                                  </th>
                                  <th className="p-3 w-28 text-center">
                                    Budget Hours
                                  </th>
                                  <th className="p-3 w-32">Status</th>
                                  <th className="p-3 w-40">Timeline range</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {m.userTasks.map((t) => (
                                  <tr
                                    key={t.id}
                                    className="hover:bg-muted/20 transition-colors cursor-pointer group"
                                    onClick={() => openTask(t.id)}
                                  >
                                    <td className="p-3 pl-4 font-mono font-bold text-indigo-500 group-hover:underline">
                                      {t.id}
                                    </td>
                                    <td className="p-3 font-semibold text-foreground truncate max-w-[280px]">
                                      {t.title}
                                    </td>
                                    <td className="p-3 text-center">
                                      <Badge
                                        variant="secondary"
                                        className="capitalize text-[10px] h-5"
                                      >
                                        {t.type}
                                      </Badge>
                                    </td>
                                    <td className="p-3 text-center font-bold text-foreground">
                                      {t.points ? `${t.points} SP` : "—"}
                                    </td>
                                    <td className="p-3 text-center font-bold text-foreground">
                                      {getTaskBudgetHours(t)} hrs
                                    </td>
                                    <td className="p-3">
                                      <Badge
                                        variant="outline"
                                        className={`capitalize text-[10px] h-5 inline-flex font-semibold ${
                                          t.status === "Completed"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : t.status === "In Progress" ||
                                                t.status === "In Review"
                                              ? "bg-blue-50 text-blue-700 border-blue-200"
                                              : "bg-slate-50 text-slate-700 border-slate-200"
                                        }`}
                                      >
                                        {t.status}
                                      </Badge>
                                    </td>
                                    <td className="p-3 text-muted-foreground font-semibold text-[11px]">
                                      {t.startDate && t.dueDate ? (
                                        <span>
                                          {formatShortDate(t.startDate)} →{" "}
                                          {formatShortDate(t.dueDate)}
                                        </span>
                                      ) : (
                                        <span className="italic text-muted-foreground/60">
                                          Auto-scheduled (Seq)
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-border rounded-xl bg-card p-6 text-center select-none">
                          <p className="text-xs text-muted-foreground">
                            No tasks assigned for {m.person.name} in this
                            sprint.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Gantt timeline visualization */}
                    <div className="space-y-3">
                      <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-indigo-500" />{" "}
                          Resource Timeline Range & Capacity Allocation
                        </span>
                        <span className="text-[10px] lowercase text-muted-foreground font-medium select-none italic">
                          Weekends, holidays and leaves shaded
                        </span>
                      </h5>

                      {/* Timeline Wrapper Grid Scroll */}
                      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-2xs">
                        <div className="min-w-[700px] overflow-x-auto divide-y divide-border">
                          {/* Calendar Days Header */}
                          <div
                            className="grid bg-muted/40 text-center text-xs font-semibold select-none border-b divide-x divide-border"
                            style={{
                              gridTemplateColumns: `180px repeat(${sprintDays.length}, 1fr)`,
                            }}
                          >
                            <div className="p-3 text-left font-bold text-muted-foreground pl-4">
                              Task Item Bar
                            </div>
                            {sprintDays.map((day) => {
                              const we = isWeekend(day);
                              const hol = isHoliday(day);
                              const leave = getLeaveOnDate(m.leavesList, day);

                              let bgClass = "bg-transparent";
                              let textClass = "text-muted-foreground";
                              let labelToolTip = `${formatShortDate(day)}: Weekday`;

                              if (we) {
                                bgClass = "bg-muted/65";
                                textClass = "text-muted-foreground/40";
                                labelToolTip = `${formatShortDate(day)}: Weekend`;
                              } else if (hol) {
                                bgClass = "bg-zinc-150 dark:bg-zinc-800/40";
                                textClass = "text-amber-500 font-bold";
                                labelToolTip = `${formatShortDate(day)}: Holiday`;
                              } else if (leave === "full") {
                                bgClass = "bg-purple-500/10";
                                textClass = "text-purple-600 font-bold";
                                labelToolTip = `${formatShortDate(day)}: Full Leave`;
                              } else if (leave === "half") {
                                bgClass = "bg-purple-500/5";
                                textClass = "text-purple-500 font-bold";
                                labelToolTip = `${formatShortDate(day)}: Half Leave`;
                              }

                              return (
                                <div
                                  key={day}
                                  className={`p-2 flex flex-col justify-center items-center ${bgClass}`}
                                  title={labelToolTip}
                                >
                                  <span className={`text-[9px] ${textClass}`}>
                                    {getWeekdayLabel(day)}
                                  </span>
                                  <span
                                    className={`text-[11px] font-bold mt-0.5 ${textClass}`}
                                  >
                                    {day.slice(-2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Task Bar Rows */}
                          {m.userTasks.map((t) => {
                            const budgetHours = getTaskBudgetHours(t);
                            const tAlloc = m.taskAllocationsByDay[t.id] || {};

                            return (
                              <div
                                key={t.id}
                                className="grid text-xs hover:bg-muted/10 divide-x divide-border items-center"
                                style={{
                                  gridTemplateColumns: `180px repeat(${sprintDays.length}, 1fr)`,
                                }}
                              >
                                <div
                                  className="p-3 pl-4 font-semibold text-foreground truncate cursor-pointer hover:text-indigo-500"
                                  title={`${t.id}: ${t.title}`}
                                  onClick={() => openTask(t.id)}
                                >
                                  {t.title}
                                </div>

                                {sprintDays.map((day) => {
                                  const we = isWeekend(day);
                                  const hol = isHoliday(day);
                                  const leave = getLeaveOnDate(
                                    m.leavesList,
                                    day,
                                  );
                                  const hoursOnDay = tAlloc[day] || 0;

                                  let cellBg = "bg-transparent";
                                  if (we) cellBg = "bg-muted/30";
                                  else if (hol)
                                    cellBg =
                                      "bg-zinc-100/30 dark:bg-zinc-800/20";
                                  else if (leave === "full")
                                    cellBg = "bg-purple-500/5";

                                  let barColorClass =
                                    "bg-neutral-500/20 border-neutral-400 text-neutral-800 dark:text-neutral-300";
                                  if (t.status === "Completed") {
                                    barColorClass =
                                      "bg-emerald-500/10 border-emerald-400 text-emerald-800 dark:text-emerald-300";
                                  } else if (
                                    t.status === "In Progress" ||
                                    t.status === "In Review"
                                  ) {
                                    barColorClass =
                                      "bg-blue-500/10 border-blue-400 text-blue-800 dark:text-blue-300";
                                  } else if (
                                    t.priority === "highest" ||
                                    t.priority === "high"
                                  ) {
                                    barColorClass =
                                      "bg-red-500/10 border-red-400 text-red-800 dark:text-red-300";
                                  }

                                  const hoverDetailsToolTip = `${t.title}\nStory Points: ${
                                    t.points || "—"
                                  } SP\nBudget Hours: ${budgetHours}h\nPlanned today: ${hoursOnDay.toFixed(
                                    1,
                                  )}h\nStart Date: ${t.startDate || "N/A"}\nDue Date: ${
                                    t.dueDate || "N/A"
                                  }\nStatus: ${t.status}`;

                                  return (
                                    <div
                                      key={day}
                                      className={`h-11 p-1 flex justify-center items-center relative ${cellBg}`}
                                      title={
                                        hoursOnDay > 0
                                          ? hoverDetailsToolTip
                                          : undefined
                                      }
                                    >
                                      {hoursOnDay > 0 && (
                                        <div
                                          className={`absolute inset-y-1.5 inset-x-0.5 rounded-md border flex items-center justify-center font-mono text-[9px] font-bold ${barColorClass}`}
                                        >
                                          {hoursOnDay.toFixed(0)}h
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}

                          {/* Leave Days Rows Overlay (if user has leave, render a visual placeholder row) */}
                          {m.leavesList.length > 0 && (
                            <div
                              className="grid text-xs text-muted-foreground divide-x divide-border items-center bg-purple-500/5"
                              style={{
                                gridTemplateColumns: `180px repeat(${sprintDays.length}, 1fr)`,
                              }}
                            >
                              <div className="p-3 pl-4 font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 select-none font-sans">
                                <Palmtree className="h-3.5 w-3.5" /> Planned
                                Leave Calendar
                              </div>
                              {sprintDays.map((day) => {
                                const leave = getLeaveOnDate(m.leavesList, day);
                                return (
                                  <div
                                    key={day}
                                    className="h-11 flex justify-center items-center relative"
                                  >
                                    {leave === "full" && (
                                      <div className="absolute inset-y-1.5 inset-x-0.5 rounded-md border border-purple-300 bg-purple-500/10 text-purple-700 dark:text-purple-300 dark:border-purple-800 text-[8px] uppercase tracking-wide font-bold flex items-center justify-center">
                                        Full Leave
                                      </div>
                                    )}
                                    {leave === "half" && (
                                      <div className="absolute inset-y-1.5 inset-x-0.5 rounded-md border border-purple-300 bg-purple-500/5 text-purple-600 dark:text-purple-400 dark:border-purple-900 text-[8px] uppercase tracking-wide font-bold flex items-center justify-center">
                                        Half Leave
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Capacity Conflict Status Row */}
                          <div
                            className="grid text-xs items-center divide-x divide-border bg-amber-500/5 select-none"
                            style={{
                              gridTemplateColumns: `180px repeat(${sprintDays.length}, 1fr)`,
                            }}
                          >
                            <div className="p-3 pl-4 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 tooltip text-[10px] uppercase tracking-wider font-sans select-none">
                              Capacity & Conflict Row
                            </div>
                            {sprintDays.map((day) => {
                              const capacityLimit = m.dailyAvailability[day]; // 8, 4, 0
                              const sumAllocatedOnDay =
                                m.dailyAllocationSum[day] || 0;
                              const overbookedBy =
                                sumAllocatedOnDay - capacityLimit;

                              let cellColor = "text-slate-600";
                              let displayLabel = "";
                              let overBookTitle = "Balance Healthy Capacity";

                              if (overbookedBy > 0) {
                                cellColor =
                                  "text-red-600 font-extrabold bg-red-500/10";
                                displayLabel = `+${Math.round(overbookedBy)}h`;
                                overBookTitle = `Overbooked of daily capacity limit! Allocation exceeded day limit today! Overbooked by ${overbookedBy.toFixed(
                                  1,
                                )} Hours`;
                              } else if (sumAllocatedOnDay > 0) {
                                cellColor = "text-emerald-600 font-bold";
                                displayLabel = `${Math.round(sumAllocatedOnDay)}h`;
                                overBookTitle = `Utilized ${sumAllocatedOnDay.toFixed(
                                  1,
                                )} of ${capacityLimit} Available Hours`;
                              }

                              return (
                                <div
                                  key={day}
                                  className={`h-11 flex flex-col justify-center items-center text-[10px] ${cellColor}`}
                                  title={overBookTitle}
                                >
                                  {displayLabel && (
                                    <div className="text-center font-mono">
                                      <span className="block text-[9px] font-bold">
                                        {displayLabel}
                                      </span>
                                      {overbookedBy > 0 && (
                                        <AlertTriangle className="h-3 w-3 text-red-500 mx-auto mt-0.5 animate-pulse" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="mx-auto w-full p-12 text-center bg-card border border-border border-dashed rounded-2xl flex flex-col items-center justify-center gap-4">
            <Users2 className="h-9 w-9 text-muted-foreground/50 stroke-1" />
            <h3 className="font-semibold text-sm text-foreground">
              No matching team members found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Try adjusting your search query, designate roles, occupancy
              filters, or planned leave status to map other team resources.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
