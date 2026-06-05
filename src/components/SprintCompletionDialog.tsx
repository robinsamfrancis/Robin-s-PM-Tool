import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarRange,
  Plus,
  Play,
  ArrowRight,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRightCircle,
  Clock,
  AlertCircle,
  History as HistoryIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Edit2,
  Check,
} from "lucide-react";
import {
  ISSUE_TYPE_META,
  PRIORITY_META,
  DIRECTORY,
  useWorkspaceStore,
  type BacklogItem,
  type Sprint,
  type SprintRetrospective,
} from "@/lib/workspace-store";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/PersonAvatar";
import { Badge } from "@/components/ui/badge";

interface SprintCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprint: Sprint;
  items: BacklogItem[];
  sprints: Sprint[];
  onComplete: (
    stats: {
      plannedPoints: number;
      completedPoints: number;
      carriedPoints: number;
      completedItemsCount: number;
      carriedItemsCount: number;
      destinationSprintName?: string;
    },
    destinationSprintId?: string,
  ) => void;
  onCreateNewSprint: () => void;
}

interface CompletedSummary {
  plannedPoints: number;
  completedPoints: number;
  carriedPoints: number;
  completedItemsCount: number;
  carriedItemsCount: number;
  destinationSprintName?: string;
}

export function SprintCompletionDialog({
  open,
  onOpenChange,
  sprint,
  items,
  sprints,
  onComplete,
  onCreateNewSprint,
}: SprintCompletionDialogProps) {
  const navigate = useNavigate();
  const { store, updateSprint } = useWorkspaceStore();

  // Use latest sprint data from store if present to avoid stale props
  const activeSprint = useMemo(() => {
    return store.sprints.find((s) => s.id === sprint?.id) || sprint;
  }, [store.sprints, sprint]);

  const [destinationSprintId, setDestinationSprintId] = useState<string>("");
  const [completeMode, setCompleteMode] = useState<
    "validation" | "retrospective"
  >("validation");

  // Track summary details for retro view
  const [completedSummary, setCompletedSummary] =
    useState<CompletedSummary | null>(null);

  // Retro interactive state fields
  const [closureSummary, setClosureSummary] = useState("");
  const [whatWentWellList, setWhatWentWellList] = useState<string[]>([]);
  const [whatToImproveList, setWhatToImproveList] = useState<string[]>([]);

  const [newWellText, setNewWellText] = useState("");
  const [newImproveText, setNewImproveText] = useState("");

  // inline editors
  const [editingWellIndex, setEditingWellIndex] = useState<number | null>(null);
  const [editingWellText, setEditingWellText] = useState("");
  const [editingImproveIndex, setEditingImproveIndex] = useState<number | null>(
    null,
  );
  const [editingImproveText, setEditingImproveText] = useState("");

  const [validationFailed, setValidationFailed] = useState(false);
  const [showConfirmStep, setShowConfirmStep] = useState(false);

  // Helper to strip leading markdown bullet formats (e.g. "- ", "* ", numbered)
  const cleanBullet = (str: string) => {
    return str.replace(/^[-*•\s\d.]+\s*/, "").trim();
  };

  // Incomplete items
  const incompleteItems = useMemo(() => {
    return items.filter((i) => i.status !== "Completed");
  }, [items]);

  const completedItems = useMemo(() => {
    return items.filter((i) => i.status === "Completed");
  }, [items]);

  // Points calculations
  const plannedPoints = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.points || 0), 0);
  }, [items]);

  const completedPoints = useMemo(() => {
    return completedItems.reduce((sum, item) => sum + (item.points || 0), 0);
  }, [completedItems]);

  const carriedPoints = useMemo(() => {
    return incompleteItems.reduce((sum, item) => sum + (item.points || 0), 0);
  }, [incompleteItems]);

  // Destination sprints: planned (not-started) sprints in this workspace
  const plannedSprints = useMemo(() => {
    return sprints.filter(
      (s) => s.state === "planned" && s.id !== activeSprint.id,
    );
  }, [sprints, activeSprint.id]);

  // Auto preselect newly created planned sprints
  const [prevPlannedCount, setPrevPlannedCount] = useState(
    plannedSprints.length,
  );
  useEffect(() => {
    if (plannedSprints.length > prevPlannedCount) {
      const newlyCreated = plannedSprints[plannedSprints.length - 1];
      if (newlyCreated) {
        setDestinationSprintId(newlyCreated.id);
      }
    }
    setPrevPlannedCount(plannedSprints.length);
  }, [plannedSprints, prevPlannedCount]);

  // Reset dialog state when opened
  useEffect(() => {
    if (open) {
      setShowConfirmStep(false);
      setValidationFailed(false);
      setNewWellText("");
      setNewImproveText("");
      setEditingWellIndex(null);
      setEditingImproveIndex(null);
      if (activeSprint.state === "completed") {
        setCompleteMode("retrospective");
        const existingRetro = activeSprint.retrospective;
        setClosureSummary(
          existingRetro?.closureSummary || existingRetro?.notes || "",
        );

        // If there is an existing retrospective, restore it.
        // If not (eg. fresh perfectly completed sprint), prepopulate with beautiful template entries.
        if (existingRetro) {
          setWhatWentWellList(
            existingRetro?.whatWentWellList ||
              (existingRetro?.whatWentWell
                ? existingRetro.whatWentWell
                    .split("\n")
                    .map(cleanBullet)
                    .filter(Boolean)
                : []),
          );
          setWhatToImproveList(
            existingRetro?.whatToImproveList ||
              (existingRetro?.whatToImprove
                ? existingRetro.whatToImprove
                    .split("\n")
                    .map(cleanBullet)
                    .filter(Boolean)
                : []),
          );
        } else {
          setWhatWentWellList([
            "Sprint goal achieved.",
            "Team collaboration improved.",
            "QA completed validation ahead of schedule.",
          ]);
          setWhatToImproveList([
            "Requirements clarification should happen earlier.",
            "Improve story estimation accuracy.",
          ]);
        }

        setCompletedSummary({
          plannedPoints:
            activeSprint.plannedPoints ??
            items.reduce((sum, item) => sum + (item.points || 0), 0),
          completedPoints:
            activeSprint.completedPoints ??
            items
              .filter((i) => i.status === "Completed")
              .reduce((sum, item) => sum + (item.points || 0), 0),
          carriedPoints:
            activeSprint.carriedPoints ??
            items
              .filter((i) => i.status !== "Completed")
              .reduce((sum, item) => sum + (item.points || 0), 0),
          completedItemsCount:
            activeSprint.completedItemsCount ??
            items.filter((i) => i.status === "Completed").length,
          carriedItemsCount:
            activeSprint.carriedItemsCount ??
            items.filter((i) => i.status !== "Completed").length,
          destinationSprintName:
            activeSprint.destinationSprintName || "Backlog",
        });
      } else {
        setCompleteMode("validation");
        setDestinationSprintId("");
        setCompletedSummary(null);
        setClosureSummary("");
        setWhatWentWellList([
          "Sprint goal achieved.",
          "Team collaboration improved.",
          "QA completed validation ahead of schedule.",
        ]);
        setWhatToImproveList([
          "Requirements clarification should happen earlier.",
          "Improve story estimation accuracy.",
        ]);
      }
    }
  }, [open, activeSprint, items]);

  const addWellItem = () => {
    if (newWellText.trim()) {
      setWhatWentWellList([...whatWentWellList, newWellText.trim()]);
      setNewWellText("");
      setValidationFailed(false);
    }
  };

  const addImproveItem = () => {
    if (newImproveText.trim()) {
      setWhatToImproveList([...whatToImproveList, newImproveText.trim()]);
      setNewImproveText("");
      setValidationFailed(false);
    }
  };

  const removeWellItem = (index: number) => {
    setWhatWentWellList(whatWentWellList.filter((_, i) => i !== index));
  };

  const removeImproveItem = (index: number) => {
    setWhatToImproveList(whatToImproveList.filter((_, i) => i !== index));
  };

  const moveWellItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= whatWentWellList.length) return;
    const copy = [...whatWentWellList];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setWhatWentWellList(copy);
  };

  const moveImproveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= whatToImproveList.length) return;
    const copy = [...whatToImproveList];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setWhatToImproveList(copy);
  };

  const startEditWell = (index: number) => {
    setEditingWellIndex(index);
    setEditingWellText(whatWentWellList[index]);
  };

  const saveWellEdit = (index: number) => {
    if (editingWellText.trim()) {
      const copy = [...whatWentWellList];
      copy[index] = editingWellText.trim();
      setWhatWentWellList(copy);
    }
    setEditingWellIndex(null);
  };

  const startEditImprove = (index: number) => {
    setEditingImproveIndex(index);
    setEditingImproveText(whatToImproveList[index]);
  };

  const saveImproveEdit = (index: number) => {
    if (editingImproveText.trim()) {
      const copy = [...whatToImproveList];
      copy[index] = editingImproveText.trim();
      setWhatToImproveList(copy);
    }
    setEditingImproveIndex(null);
  };

  const handleSaveRetroClick = () => {
    if (whatWentWellList.length === 0 || whatToImproveList.length === 0) {
      setValidationFailed(true);
      toast.error(
        "Please add at least one entry under each retrospective category before saving.",
      );
      return;
    }
    setValidationFailed(false);
    setShowConfirmStep(true);
  };

  const handleFinalConfirmSave = () => {
    // 1. Compile retro object
    const retrospective: SprintRetrospective = {
      closureSummary: closureSummary.trim(),
      whatWentWellList,
      whatToImproveList,
      whatWentWell: whatWentWellList.join("\n"),
      whatToImprove: whatToImproveList.join("\n"),
      completedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      managerName: "robinfrancisadr@gmail.com",
    };

    // 2. Save it under the workspace's retrospective store
    updateSprint(activeSprint.id, {
      retrospective,
      plannedPoints: completedSummary?.plannedPoints ?? plannedPoints,
      completedPoints: completedSummary?.completedPoints ?? completedPoints,
      carriedPoints: completedSummary?.carriedPoints ?? carriedPoints,
      completedItemsCount:
        completedSummary?.completedItemsCount ?? completedItems.length,
      carriedItemsCount:
        completedSummary?.carriedItemsCount ?? incompleteItems.length,
      destinationSprintName:
        completedSummary?.destinationSprintName || "Backlog",
    });

    toast.success("Retrospective summary successfully stored.");
    setShowConfirmStep(false);
    onOpenChange(false);

    // Auto-redirect to the retrospective tab
    navigate({
      to: "/workspaces/$code/retrospective",
      params: { code: activeSprint.workspaceCode },
    });
  };

  // Get selected destination name
  const selectedDestinationName = useMemo(() => {
    if (!destinationSprintId) return undefined;
    return plannedSprints.find((s) => s.id === destinationSprintId)?.name;
  }, [destinationSprintId, plannedSprints]);

  const handleCompleteClick = () => {
    // If there are incomplete items, we must demand a destination selection
    if (incompleteItems.length > 0 && !destinationSprintId) {
      return;
    }

    const stats = {
      plannedPoints,
      completedPoints,
      carriedPoints,
      completedItemsCount: completedItems.length,
      carriedItemsCount: incompleteItems.length,
      destinationSprintName: selectedDestinationName || "Backlog",
    };

    setCompletedSummary(stats);

    // Call the parent state updater to update atomic store
    onComplete(stats, destinationSprintId || undefined);

    // Transition to retrospective state immediately
    setCompleteMode("retrospective");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-xl bg-card border border-border">
        {completeMode === "validation" ? (
          <>
            {/* Header section with solid border */}
            <div className="p-6 pb-4 border-b border-border/80 flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold font-sans text-foreground flex items-center gap-2">
                  <CalendarRange className="h-5.5 w-5.5 text-indigo-500" />
                  <span>Complete Sprint: {sprint?.name}</span>
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs mt-1">
                  Ensure all planned deliverables are successfully signed off or
                  reassigned.
                </DialogDescription>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-thin">
              {/* Stat Counters Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                    Completed Items
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                      {completedItems.length}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {items.length} (
                      {items.length
                        ? Math.round(
                            (completedItems.length / items.length) * 100,
                          )
                        : 0}
                      %)
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex flex-col justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
                    Incomplete Items
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-amber-500">
                      {incompleteItems.length}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      require rollover action
                    </span>
                  </div>
                </div>
              </div>

              {/* Validation status notice or warn block */}
              {incompleteItems.length > 0 ? (
                <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 flex gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold leading-none">
                      Unfinished Work Remaining
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The sprint contains unfinished work that must be moved
                      before the sprint can be completed.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex gap-3 text-emerald-600 dark:text-emerald-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 shrink-0 mt-0.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold leading-none">
                      Perfect Completion!
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Amazing job! All planned tasks, stories, and features are
                      completely finished.
                    </p>
                  </div>
                </div>
              )}

              {/* Incomplete items table screen if any exist */}
              {incompleteItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    Review Incomplete Work Items
                  </h4>
                  <div className="rounded-xl border border-border bg-muted/10 overflow-hidden max-h-[220px] overflow-y-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-muted/40 sticky top-0 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-4 font-bold select-none">
                            ID
                          </th>
                          <th className="py-2.5 px-4 font-bold select-none">
                            Title
                          </th>
                          <th className="py-2.5 px-4 font-bold select-none">
                            Type
                          </th>
                          <th className="py-2.5 px-4 font-bold select-none">
                            Priority
                          </th>
                          <th className="py-2.5 px-4 font-bold select-none">
                            Assignee
                          </th>
                          <th className="py-2.5 px-4 font-bold select-none">
                            Status
                          </th>
                          <th className="py-2.5 px-4 font-bold text-right select-none">
                            Points
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/80">
                        {incompleteItems.map((item) => {
                          const typeMeta = ISSUE_TYPE_META[item.type] || {
                            icon: "✓",
                            bg: "bg-muted",
                            color: "text-muted-foreground",
                            label: item.type,
                          };
                          const prioMeta = PRIORITY_META[item.priority] || {
                            label: item.priority,
                            color: "text-muted",
                          };
                          const assignee = DIRECTORY.find(
                            (p) => p.id === item.assigneeId,
                          );

                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <td className="py-2 px-4 font-mono text-muted-foreground text-[10px]">
                                {item.id}
                              </td>
                              <td
                                className="py-2 px-4 font-medium text-foreground max-w-[180px] truncate"
                                title={item.title}
                              >
                                {item.title}
                              </td>
                              <td className="py-2 px-4">
                                <span className="inline-flex items-center gap-1">
                                  <span
                                    className={`inline-flex items-center justify-center rounded h-4 w-4 text-[9px] font-bold ${typeMeta.bg} ${typeMeta.color}`}
                                  >
                                    {typeMeta.icon}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground capitalize">
                                    {typeMeta.label}
                                  </span>
                                </span>
                              </td>
                              <td className="py-2 px-4">
                                <span
                                  className={`font-semibold ${prioMeta.color}`}
                                >
                                  {prioMeta.label}
                                </span>
                              </td>
                              <td className="py-2 px-4">
                                {assignee ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <PersonAvatar
                                      userId={assignee.id}
                                      size="xs"
                                    />
                                    <span className="text-muted-foreground truncate max-w-[80px]">
                                      {assignee.name.split(" ")[0]}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/50 italic">
                                    None
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-4">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 px-2 font-medium border-border/80"
                                >
                                  {item.status}
                                </Badge>
                              </td>
                              <td className="py-2 px-4 text-right font-mono font-bold text-foreground">
                                {item.points}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Roll-over block / Select Destination Sprint */}
              {incompleteItems.length > 0 && (
                <div className="p-5 rounded-xl border border-dashed border-border bg-muted/20 space-y-4">
                  <h4 className="text-xs font-bold tracking-wider text-indigo-500 uppercase">
                    ROLLOVER ACTION
                  </h4>

                  {plannedSprints.length > 0 ? (
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-foreground">
                        Select Destination Sprint:
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={destinationSprintId}
                          onValueChange={setDestinationSprintId}
                        >
                          <SelectTrigger className="flex-1 bg-card">
                            <SelectValue placeholder="Choose an upcoming sprint..." />
                          </SelectTrigger>
                          <SelectContent>
                            {plannedSprints.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} (Upcoming)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onCreateNewSprint}
                          className="gap-1.5 shrink-0 border-dashed"
                        >
                          <Plus className="h-3.5 w-3.5" /> Create New Sprint
                        </Button>
                      </div>

                      {destinationSprintId && (
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-lg">
                          <ArrowRight className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>
                            Move{" "}
                            <strong className="font-bold">
                              {incompleteItems.length} incomplete items
                            </strong>{" "}
                            to{" "}
                            <strong className="font-bold">
                              {selectedDestinationName}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 pt-1">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          No upcoming sprint is available for moving incomplete
                          work.
                        </p>
                        <p className="text-[11px] text-muted-foreground/60">
                          Create a new sprint dynamically to hold the unfinished
                          deliverables, or create a sprint from the backlog
                          afterwards.
                        </p>
                      </div>
                      <Button
                        onClick={onCreateNewSprint}
                        className="w-full gap-1.5 bg-gradient-primary text-primary-foreground font-semibold py-4"
                      >
                        <Plus className="h-4 w-4" /> Create New Sprint
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="p-4 px-6 border-t border-border flex justify-end gap-2 bg-muted/10">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground font-medium"
              >
                Cancel
              </Button>
              <Button
                disabled={incompleteItems.length > 0 && !destinationSprintId}
                onClick={handleCompleteClick}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
              >
                Complete Sprint
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Confirmation Overlay Step */}
            {showConfirmStep && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-6 z-50">
                <div className="w-full max-w-md p-6 bg-card rounded-2xl border border-border shadow-xl space-y-6 animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-center gap-3 text-amber-500">
                    <div className="p-3 bg-amber-500/15 rounded-full animate-pulse">
                      <AlertCircle className="h-6 w-6 stroke-[2]" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      Confirmation
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This retrospective summary will be stored under the
                    Retrospective section of the workspace for future reference.
                    You will still be able to edit it later if updates are
                    required.
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirmStep(false)}
                      className="font-medium"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleFinalConfirmSave}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" /> Confirm & Save
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 - Sprint Retrospective Summary Screen */}
            <div className="p-6 pb-4 border-b border-border/80 flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold font-sans text-foreground flex items-center gap-2">
                  🎉 Congratulations! Sprint Completed
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs mt-1">
                  Reflect on your performance from the previous sprint and
                  capture key learnings for future improvements.
                </DialogDescription>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-thin">
              {/* Completed Sprint Header details card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    COMPLETED SPRINT
                  </span>
                  <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {sprint?.name}
                  </h3>
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    DATE RANGE
                  </span>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    {sprint?.startDate} – {sprint?.endDate}
                  </p>
                </div>
              </div>

              {/* Delivery Metrics Bento Grid Dashboard */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  DELIVERY METRICS
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {/* PLANNED CARD */}
                  <div className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between hover:scale-[1.01] transition-all">
                    <span
                      className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase leading-none select-none"
                      title="Total story points committed during sprint planning"
                    >
                      PLANNED POINTS
                    </span>
                    <p className="text-xl font-extrabold text-foreground mt-3 leading-none">
                      {completedSummary?.plannedPoints ?? 0}
                      <span className="text-[11px] text-muted-foreground font-normal ml-0.5">
                        pts
                      </span>
                    </p>
                  </div>

                  {/* DELIVERED CARD */}
                  <div className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between hover:scale-[1.01] transition-all">
                    <span
                      className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase leading-none select-none"
                      title="Total story points completed during the sprint"
                    >
                      DELIVERED POINTS
                    </span>
                    <p className="text-xl font-extrabold text-[#10b981] mt-3 leading-none">
                      {completedSummary?.completedPoints ?? 0}
                      <span className="text-[11px] text-[#10b981]/80 font-normal ml-0.5">
                        pts
                      </span>
                    </p>
                  </div>

                  {/* CARRIED FORWARD TASKS CARD */}
                  <div className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between hover:scale-[1.01] transition-all">
                    <span
                      className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase leading-none select-none"
                      title="Number of incomplete tasks moved to another sprint"
                    >
                      CARRY FORWARD TASKS
                    </span>
                    <p className="text-xl font-extrabold text-amber-500 mt-3 leading-none">
                      {completedSummary?.carriedItemsCount ?? 0}
                      <span className="text-[11px] text-amber-500/80 font-normal ml-0.5">
                        tasks
                      </span>
                    </p>
                  </div>

                  {/* CARRIED FORWARD POINTS CARD */}
                  <div className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between hover:scale-[1.01] transition-all">
                    <span
                      className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase leading-none select-none"
                      title="Total story points associated with carried-forward items"
                    >
                      CARRY FORWARD POINTS
                    </span>
                    <p className="text-xl font-extrabold text-amber-500 mt-3 leading-none">
                      {completedSummary?.carriedPoints ?? 0}
                      <span className="text-[11px] text-amber-500/80 font-normal ml-0.5">
                        pts
                      </span>
                    </p>
                  </div>

                  {/* VELOCITY CARD */}
                  <div className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between hover:scale-[1.01] transition-all">
                    <span
                      className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase leading-none select-none"
                      title="Total completed story points"
                    >
                      SPRINT VELOCITY
                    </span>
                    <p className="text-xl font-extrabold text-sky-500 mt-3 leading-none">
                      {completedSummary?.completedPoints ?? 0}
                      <span className="text-[11px] text-sky-500/80 font-normal ml-0.5">
                        pts
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Sprint Closure & Rollout Summary */}
              <div className="space-y-2">
                <div className="flex flex-col">
                  <label
                    htmlFor="closure-summary"
                    className="text-xs font-bold text-foreground uppercase"
                  >
                    Sprint Closure Summary
                  </label>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    Provide a summary of the sprint. Describe major
                    achievements, milestones, release updates, or overall
                    observations from this iteration.
                  </span>
                </div>
                <textarea
                  id="closure-summary"
                  rows={3}
                  value={closureSummary}
                  onChange={(e) => setClosureSummary(e.target.value)}
                  placeholder="e.g. Major deliverables completed. Key releases deployed. Significant blockers encountered. Important observations from the sprint."
                  className="w-full text-xs p-3 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Alert validations */}
              {validationFailed && (
                <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Please add at least one entry under each retrospective
                    category before saving.
                  </span>
                </div>
              )}

              {/* Retrospective sectionColumns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                {/* WHAT WENT WELL */}
                <div
                  className={`p-4 rounded-xl border transition-all ${validationFailed && whatWentWellList.length === 0 ? "border-destructive ring-1 ring-destructive bg-destructive/5" : "border-border bg-card"} space-y-4`}
                >
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5 text-emerald-600 dark:text-emerald-450">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      What Went Well
                    </h4>
                    <span className="text-[11px] text-muted-foreground block">
                      Achievements, smooth processes, team alignments.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newWellText}
                      onChange={(e) => setNewWellText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addWellItem()}
                      placeholder="Add an entry..."
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground/50"
                    />
                    <Button
                      size="sm"
                      onClick={addWellItem}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                    {whatWentWellList.map((item, index) => (
                      <div
                        key={index}
                        className="group p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors flex items-start justify-between gap-2 text-xs"
                      >
                        {editingWellIndex === index ? (
                          <div className="flex-1 flex gap-1 items-center">
                            <input
                              type="text"
                              value={editingWellText}
                              onChange={(e) =>
                                setEditingWellText(e.target.value)
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && saveWellEdit(index)
                              }
                              className="flex-1 text-xs px-2 py-1 rounded bg-card border border-border focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                            <Button
                              size="xs"
                              onClick={() => saveWellEdit(index)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white h-7 w-7 p-0"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 break-words font-medium leading-relaxed">
                              {item}
                            </span>
                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Button
                                size="xs"
                                variant="ghost"
                                disabled={index === 0}
                                onClick={() => moveWellItem(index, "up")}
                                className="h-6 w-6 p-0 hover:bg-card"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                disabled={index === whatWentWellList.length - 1}
                                onClick={() => moveWellItem(index, "down")}
                                className="h-6 w-6 p-0 hover:bg-card"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => startEditWell(index)}
                                className="h-6 w-6 p-0 hover:bg-card text-slate-500"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => removeWellItem(index)}
                                className="h-6 w-6 p-0 hover:bg-card text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {whatWentWellList.length === 0 && (
                      <p className="text-[11px] text-muted-foreground/65 italic p-3 text-center">
                        No entries added. (Required)
                      </p>
                    )}
                  </div>
                </div>

                {/* WHAT CAN BE DONE BETTER */}
                <div
                  className={`p-4 rounded-xl border transition-all ${validationFailed && whatToImproveList.length === 0 ? "border-destructive ring-1 ring-destructive bg-destructive/5" : "border-border bg-card"} space-y-4`}
                >
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5 text-amber-600 dark:text-amber-450">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      What Can Be Done Better
                    </h4>
                    <span className="text-[11px] text-muted-foreground block">
                      Blockers, workflow inefficiencies, estimation gaps.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newImproveText}
                      onChange={(e) => setNewImproveText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addImproveItem()}
                      placeholder="Add an entry..."
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground/50"
                    />
                    <Button
                      size="sm"
                      onClick={addImproveItem}
                      className="bg-amber-600 hover:bg-amber-500 text-white shrink-0 h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                    {whatToImproveList.map((item, index) => (
                      <div
                        key={index}
                        className="group p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors flex items-start justify-between gap-2 text-xs"
                      >
                        {editingImproveIndex === index ? (
                          <div className="flex-1 flex gap-1 items-center">
                            <input
                              type="text"
                              value={editingImproveText}
                              onChange={(e) =>
                                setEditingImproveText(e.target.value)
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && saveImproveEdit(index)
                              }
                              className="flex-1 text-xs px-2 py-1 rounded bg-card border border-border focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                            <Button
                              size="xs"
                              onClick={() => saveImproveEdit(index)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white h-7 w-7 p-0"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 break-words font-medium leading-relaxed">
                              {item}
                            </span>
                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Button
                                size="xs"
                                variant="ghost"
                                disabled={index === 0}
                                onClick={() => moveImproveItem(index, "up")}
                                className="h-6 w-6 p-0 hover:bg-card"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                disabled={
                                  index === whatToImproveList.length - 1
                                }
                                onClick={() => moveImproveItem(index, "down")}
                                className="h-6 w-6 p-0 hover:bg-card"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => startEditImprove(index)}
                                className="h-6 w-6 p-0 hover:bg-card text-slate-500"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => removeImproveItem(index)}
                                className="h-6 w-6 p-0 hover:bg-card text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {whatToImproveList.length === 0 && (
                      <p className="text-[11px] text-muted-foreground/65 italic p-3 text-center">
                        No entries added. (Required)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with save actions */}
            <div className="p-4 px-6 border-t border-border flex items-center justify-between bg-muted/10">
              <Button
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  navigate({
                    to: "/workspaces/$code/retrospective",
                    params: { code: sprint.workspaceCode },
                  });
                }}
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-xs font-semibold flex items-center gap-1.5"
              >
                <HistoryIcon className="h-4 w-4 shrink-0" /> Go to Retrospective
                Repository
              </Button>
              <Button
                onClick={handleSaveRetroClick}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 text-xs px-5 h-9 rounded-lg shadow-sm"
              >
                <Save className="h-4 w-4" /> Save Retrospective Summary
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
