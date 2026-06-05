import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  History as HistoryIcon,
  Award,
  BookOpen,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  Save,
  Plus,
  Play,
  Check,
  Calendar,
  Layers,
  ArrowRightCircle,
  MessageSquare,
  ThumbsUp,
  Target,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import {
  useWorkspace,
  useWorkspaceStore,
  type Sprint,
  type SprintRetrospective,
} from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspaces/$code/retrospective")({
  component: RetrospectivePage,
});

function RetrospectivePage() {
  const { code } = Route.useParams();
  const workspace = useWorkspace(code);
  const {
    store,
    updateSprint,
    createSprint,
    completeSprint,
    updateItem,
    createItem,
  } = useWorkspaceStore();

  // Find completed sprints in this workspace, sorted by completion date or end date (newest first)
  const completedSprints = useMemo(() => {
    const closed = store.sprints.filter(
      (s) => s.workspaceCode === code && s.state === "completed",
    );
    return [...closed].sort((a, b) => {
      const dateA = a.retrospective?.completedAt || a.endDate || "";
      const dateB = b.retrospective?.completedAt || b.endDate || "";
      return dateB.localeCompare(dateA);
    });
  }, [store.sprints, code]);

  const activeOrPlannedSprints = useMemo(() => {
    return store.sprints.filter(
      (s) => s.workspaceCode === code && s.state !== "completed",
    );
  }, [store.sprints, code]);

  // Selected completed sprint state
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");

  const currentSprint = useMemo(() => {
    if (!selectedSprintId && completedSprints.length > 0) {
      return completedSprints[0];
    }
    return completedSprints.find((s) => s.id === selectedSprintId) || null;
  }, [selectedSprintId, completedSprints]);

  // Editing states matching SprintRetrospective type
  const [whatWentWell, setWhatWentWell] = useState("");
  const [whatToImprove, setWhatToImprove] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [notes, setNotes] = useState("");

  const [closureSummary, setClosureSummary] = useState("");
  const [whatWentWellList, setWhatWentWellList] = useState<string[]>([]);
  const [whatToImproveList, setWhatToImproveList] = useState<string[]>([]);

  const [newWellText, setNewWellText] = useState("");
  const [newImproveText, setNewImproveText] = useState("");

  const [editingWellIndex, setEditingWellIndex] = useState<number | null>(null);
  const [editingWellText, setEditingWellText] = useState("");
  const [editingImproveIndex, setEditingImproveIndex] = useState<number | null>(
    null,
  );
  const [editingImproveText, setEditingImproveText] = useState("");

  // Helper to strip leading markdown bullet formats (e.g. "- ", "* ", numbered)
  const cleanBullet = (str: string) => {
    return str.replace(/^[-*•\s\d.]+\s*/, "").trim();
  };

  // Sync editing fields with the selected sprint's saved retro
  useEffect(() => {
    if (currentSprint) {
      const retro = currentSprint.retrospective;
      setWhatWentWell(retro?.whatWentWell || "");
      setWhatToImprove(retro?.whatToImprove || "");
      setActionItems(retro?.actionItems || "");
      setNotes(retro?.notes || "");
      setClosureSummary(retro?.closureSummary || retro?.notes || "");
      setWhatWentWellList(
        retro?.whatWentWellList ||
          (retro?.whatWentWell
            ? retro.whatWentWell.split("\n").map(cleanBullet).filter(Boolean)
            : []),
      );
      setWhatToImproveList(
        retro?.whatToImproveList ||
          (retro?.whatToImprove
            ? retro.whatToImprove.split("\n").map(cleanBullet).filter(Boolean)
            : []),
      );
    } else {
      setWhatWentWell("");
      setWhatToImprove("");
      setActionItems("");
      setNotes("");
      setClosureSummary("");
      setWhatWentWellList([]);
      setWhatToImproveList([]);
    }
  }, [currentSprint]);

  const addWellItem = () => {
    if (newWellText.trim()) {
      setWhatWentWellList([...whatWentWellList, newWellText.trim()]);
      setNewWellText("");
    }
  };

  const addImproveItem = () => {
    if (newImproveText.trim()) {
      setWhatToImproveList([...whatToImproveList, newImproveText.trim()]);
      setNewImproveText("");
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

  if (!workspace) return null;

  const handleSavePatch = () => {
    if (!currentSprint) return;

    // Auto-update plain text versions in case other components depend on it
    const finalWellStr = whatWentWellList.join("\n");
    const finalImproveStr = whatToImproveList.join("\n");

    const updatedRetro: SprintRetrospective = {
      closureSummary: closureSummary.trim(),
      whatWentWellList,
      whatToImproveList,
      whatWentWell: finalWellStr,
      whatToImprove: finalImproveStr,
      actionItems: actionItems.trim(),
      notes: notes.trim(),
      completedAt:
        currentSprint.retrospective?.completedAt || new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      managerName:
        currentSprint.retrospective?.managerName || "robinfrancisadr@gmail.com",
    };

    updateSprint(currentSprint.id, {
      retrospective: updatedRetro,
    });

    toast.success(
      `Retrospective for ${currentSprint.name} updated successfully!`,
    );
  };

  // Helper to quickly spawn a sample completed sprint for demoing of retrospective
  const handleSeedMockWorkspaceRetro = () => {
    const today = new Date();

    // Sprint 1 (Completed 2 weeks ago)
    const sp1Start = new Date(today);
    sp1Start.setDate(sp1Start.getDate() - 28);
    const sp1End = new Date(today);
    sp1End.setDate(sp1End.getDate() - 14);

    const s1 = createSprint({
      workspaceCode: code,
      name: "Sprint Alpha (v1.0 Core Release)",
      goal: "Finalize core entity models, implement auth middleware, and configure storage schemas.",
      durationWeeks: 2,
      startDate: sp1Start.toISOString().split("T")[0],
      endDate: sp1End.toISOString().split("T")[0],
    });

    // Create completed items to populate stats
    const mockTask1 = createItem({
      workspaceCode: code,
      type: "story",
      title:
        "As a project lead, I want to create custom parent workspaces and link child sub-spaces.",
      priority: "high",
      points: 8,
      status: "Completed",
      sprintId: s1.id,
    });

    const mockTask2 = createItem({
      workspaceCode: code,
      type: "task",
      title:
        "Write documentation on database backup rules and Docker-based workspace migration.",
      priority: "medium",
      points: 3,
      status: "Completed",
      sprintId: s1.id,
    });

    const mockTask3 = createItem({
      workspaceCode: code,
      type: "bug",
      title:
        "Auth state flushes on rapid manual page refresh in iframe environment.",
      priority: "highest",
      points: 5,
      status: "Completed",
      sprintId: s1.id,
    });

    // One incomplete task to carry forward
    const mockTask4 = createItem({
      workspaceCode: code,
      type: "spike",
      title:
        "Investigate canvas-based Gantt charts and real-time multiplayer WebSockets options.",
      priority: "low",
      points: 5,
      status: "In Progress",
      sprintId: s1.id,
    });

    // Complete the sprint
    // 3 items completed (8+3+5=16pts). 1 item carried forward (5pts).
    const stats1 = {
      plannedPoints: 21,
      completedPoints: 16,
      carriedPoints: 5,
      completedItemsCount: 3,
      carriedItemsCount: 1,
      destinationSprintName: "Sprint Beta (Timeline & Calendar)",
    };

    updateSprint(s1.id, {
      state: "completed",
      summary: "Completed 3 of 4 items · 16/21 story points delivered.",
      ...stats1,
      retrospective: {
        whatWentWell:
          "- Core architecture came together incredibly quickly.\n- Database configuration is highly modular and flexible for child projects.\n- Fixing the auth refresh bug early saved us massive developer overhead in testing.",
        whatToImprove:
          "- The spike task was too complex for a regular sprint and should have been scoped down ahead of time.\n- Underestimated communication overhead with UI designers concerning canvas requirements.",
        actionItems:
          "- [ ] Break spikes down into specific actionable research questions.\n- [ ] Host a 30-minute sync with the UI team before drafting layout specifications.",
        notes:
          "Overall a very successful launch of our foundation milestone! The team displayed high speed and exceptional coverage. Velocity is looking stable.",
        completedAt: new Date().toISOString(),
      },
    });

    // Update individual completed tasks status
    updateItem(mockTask1.id, { sprintId: s1.id, status: "Completed" });
    updateItem(mockTask2.id, { sprintId: s1.id, status: "Completed" });
    updateItem(mockTask3.id, { sprintId: s1.id, status: "Completed" });
    updateItem(mockTask4.id, { sprintId: undefined, status: "Todo" }); // Rolled to backlog/unassigned

    toast.success(
      "Successfully generated mock completed sprint with rich retrospective notes!",
    );
    setSelectedSprintId(s1.id);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 lg:px-8 py-6 space-y-6 animate-fade-in font-sans">
      {/* Intro block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-indigo-500" />
            Workspace Sprint Retrospective Repository
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Review team performance metrics, archive retrospective learning
            notes, and monitor continuous improvement items across sprints.
          </p>
        </div>
      </div>

      {completedSprints.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl bg-card p-12 text-center flex flex-col items-center justify-center gap-5">
          <div className="h-14 w-14 rounded-full bg-indigo-500/5 text-indigo-500 border border-indigo-500/10 flex items-center justify-center">
            <BookOpen className="h-6 w-6 stroke-1.5" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="font-semibold text-lg text-foreground">
              No Completed Sprints Yet
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Retrospective notes are created when actively closing finished
              sprints. Keep delivering tasks, and once you complete your current
              sprint from the **Backlog & Sprint** tab, its reflections will
              reside here.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center pt-3">
            <Button
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm"
              onClick={handleSeedMockWorkspaceRetro}
            >
              <Sparkles className="h-4 w-4 mr-1.5 animate-pulse" /> Simulate
              Completed Sprint & Retro Notes
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sprints Sidebar list */}
          <div className="lg:col-span-1 space-y-3">
            <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase px-2 py-1 flex items-center justify-between">
              <span>Completed Sprints</span>
              <Badge
                variant="outline"
                className="text-[10px] h-5 py-0 px-1.5 font-bold"
              >
                {completedSprints.length}
              </Badge>
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {completedSprints.map((s) => {
                const isSelected = currentSprint
                  ? s.id === currentSprint.id
                  : false;
                const completionPct = s.plannedPoints
                  ? Math.round(
                      ((s.completedPoints || 0) / s.plannedPoints) * 100,
                    )
                  : 0;

                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSprintId(s.id)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl border text-xs transition-all relative flex flex-col gap-1.5 hover:bg-muted/10",
                      isSelected
                        ? "bg-[#6366f1]/5 border-[#6366f1]/40 text-foreground ring-1 ring-[#6366f1]/10"
                        : "bg-card border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate text-[13px] text-foreground">
                        {s.name}
                      </span>
                      {s.retrospective && (
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 mt-1">
                      <span className="font-mono text-[10px]">
                        {s.startDate}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-foreground/95 bg-muted/65 px-1.5 py-0.5 rounded text-[10px]">
                        {completionPct}% points done
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Retro Detail View (Right 3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {currentSprint && (
              <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/80 bg-muted/20 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground">
                        {currentSprint.name} Analysis
                      </h3>
                      {currentSprint.goal && (
                        <p className="text-xs text-muted-foreground italic leading-relaxed mt-0.5">
                          Goal: &ldquo;{currentSprint.goal}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {currentSprint.startDate} &rarr; {currentSprint.endDate}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-8">
                  {/* Performance metrics dashboard inside the retrospective details */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold tracking-wider text-indigo-500 uppercase flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      Sprint Delivery Performance
                    </h4>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Planned Points
                        </span>
                        <p className="text-lg font-extrabold text-foreground mt-1">
                          {currentSprint.plannedPoints ?? 0}
                          <span className="text-xs text-muted-foreground font-normal ml-0.5">
                            pts
                          </span>
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between select-none">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Completed Points
                        </span>
                        <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                          {currentSprint.completedPoints ?? 0}
                          <span className="text-xs text-muted-foreground font-normal ml-0.5">
                            pts
                          </span>
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Carried Forward
                        </span>
                        <p className="text-lg font-extrabold text-amber-500 mt-1">
                          {currentSprint.carriedPoints ?? 0}
                          <span className="text-xs text-muted-foreground font-normal ml-0.5">
                            pts
                          </span>
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Delivery Rate
                        </span>
                        <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                          {currentSprint.plannedPoints
                            ? Math.round(
                                ((currentSprint.completedPoints || 0) /
                                  currentSprint.plannedPoints) *
                                  100,
                              )
                            : 0}
                          <span className="text-xs font-normal ml-0.5">%</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Closure & rollover info line */}
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs leading-relaxed">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                      <span>
                        Completed{" "}
                        <strong>
                          {currentSprint.completedItemsCount ?? 0} items
                        </strong>
                        , rolling over{" "}
                        <strong>
                          {currentSprint.carriedItemsCount ?? 0} unfinished
                          tasks
                        </strong>
                        .
                      </span>
                    </div>
                    {currentSprint.destinationSprintName && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-lg text-[11px] font-semibold shrink-0">
                        <ArrowUpRight className="h-3.5 w-3.5 mr-0.5 shrink-0" />
                        Rolled To: {currentSprint.destinationSprintName}
                      </div>
                    )}
                  </div>

                  {/* Sprint Closure Summary */}
                  <div className="space-y-2 border-b border-border/65 pb-6">
                    <div className="flex flex-col">
                      <label
                        htmlFor="repo-closure-summary"
                        className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5"
                      >
                        <BookOpen className="h-4 w-4 text-indigo-500" />
                        Sprint Closure Summary
                      </label>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        Summarize the sprint trajectory - major releases,
                        deliveries, and high-level outcomes.
                      </span>
                    </div>
                    <Textarea
                      id="repo-closure-summary"
                      rows={3}
                      value={closureSummary}
                      onChange={(e) => setClosureSummary(e.target.value)}
                      placeholder="Summarize key releases, major achievements, and general iteration learnings..."
                      className="text-xs resize-y bg-background border-border text-foreground focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-xl"
                    />
                  </div>

                  {/* Interactive Lists */}
                  <div className="space-y-4 border-b border-border/65 pb-6">
                    <h4 className="text-xs font-bold text-foreground uppercase flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                      STATED KEY LEARNING NOTES (BULLETS)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* WHAT WENT WELL */}
                      <div className="p-4 rounded-xl border border-border bg-card space-y-4">
                        <div className="space-y-0.5">
                          <h5 className="text-[11px] font-bold text-foreground uppercase flex items-center gap-1.5 text-emerald-600 dark:text-emerald-450">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            What Went Well
                          </h5>
                          <span className="text-[10px] text-muted-foreground">
                            Add interactive learnings for future reference.
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newWellText}
                            onChange={(e) => setNewWellText(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && addWellItem()
                            }
                            placeholder="Add point..."
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <Button
                            size="sm"
                            onClick={addWellItem}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 h-8"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
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
                                      disabled={
                                        index === whatWentWellList.length - 1
                                      }
                                      onClick={() =>
                                        moveWellItem(index, "down")
                                      }
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
                                      className="h-6 w-6 p-0 hover:bg-card text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* WHAT CAN BE DONE BETTER */}
                      <div className="p-4 rounded-xl border border-border bg-card space-y-4">
                        <div className="space-y-0.5">
                          <h5 className="text-[11px] font-bold text-foreground uppercase flex items-center gap-1.5 text-amber-600 dark:text-amber-450">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            What Can Be Done Better
                          </h5>
                          <span className="text-[10px] text-muted-foreground">
                            Add improvements or action bottlenecks.
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newImproveText}
                            onChange={(e) => setNewImproveText(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && addImproveItem()
                            }
                            placeholder="Add point..."
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <Button
                            size="sm"
                            onClick={addImproveItem}
                            className="bg-amber-600 hover:bg-amber-500 text-white shrink-0 h-8"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
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
                                      e.key === "Enter" &&
                                      saveImproveEdit(index)
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
                                      onClick={() =>
                                        moveImproveItem(index, "up")
                                      }
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
                                      onClick={() =>
                                        moveImproveItem(index, "down")
                                      }
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
                                      className="h-6 w-6 p-0 hover:bg-card text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reflective input boxes side-by-side or stacked */}
                  <div className="space-y-5">
                    <h4 className="text-[#4f46e5] text-xs font-bold uppercase flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      Continuous Planning Details
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Action items */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#4f46e5]" />
                          Action Items to Implement
                        </label>
                        <Textarea
                          placeholder="Specific, measurable actions for the next sprint — e.g.
- [ ] Set up 15-min API alignment before coding
- [ ] Implement robust schema mocks..."
                          value={actionItems}
                          onChange={(e) => setActionItems(e.target.value)}
                          className="min-h-[140px] text-xs font-mono resize-y bg-background border-border text-foreground hover:border-border/80 focus-visible:ring-1 focus-visible:ring-[#6366f1]/20 rounded-xl"
                        />
                      </div>

                      {/* General Notes */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-[#4f46e5]" />
                          General Notes & Highlights
                        </label>
                        <Textarea
                          placeholder="Velocity tracking notes, user test results, general client feedback, morale details, or miscellaneous reports..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="min-h-[140px] text-xs resize-y bg-background border-border text-foreground hover:border-border/80 focus-visible:ring-1 focus-visible:ring-[#6366f1]/20 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-border/85 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-muted-foreground flex flex-col gap-0.5 text-left">
                      {currentSprint.retrospective?.lastModifiedAt ? (
                        <span>
                          Last edited by{" "}
                          <strong className="text-foreground">
                            {currentSprint.retrospective.managerName ||
                              "robinfrancisadr@gmail.com"}
                          </strong>{" "}
                          on{" "}
                          {new Date(
                            currentSprint.retrospective.lastModifiedAt,
                          ).toLocaleDateString()}{" "}
                          {new Date(
                            currentSprint.retrospective.lastModifiedAt,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span>
                          Created by{" "}
                          <strong className="text-foreground">
                            {currentSprint.retrospective?.managerName ||
                              "robinfrancisadr@gmail.com"}
                          </strong>
                        </span>
                      )}
                      <span>
                        Completed on{" "}
                        {new Date(
                          currentSprint.retrospective?.completedAt ||
                            new Date().toISOString(),
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      onClick={handleSavePatch}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 text-xs rounded-xl shadow-xs"
                    >
                      <Save className="h-4 w-4 shrink-0" />
                      Persist Retrospective Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
