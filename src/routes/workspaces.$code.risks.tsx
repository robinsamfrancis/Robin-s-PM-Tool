import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Plus,
  Search,
  ShieldAlert,
  Link as LinkIcon,
  PieChart as PieChartIcon,
  BarChart2,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  useWorkspace,
  useWorkspaceStore,
  DIRECTORY,
  type DependencyRisk,
  type BacklogItem,
} from "@/lib/workspace-store";
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
import { MultiSelectPeople } from "@/components/MultiSelectPeople";
import { PersonAvatar } from "@/components/PersonAvatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTaskDetail } from "@/components/task-detail/TaskDetailProvider";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/workspaces/$code/risks")({
  component: WorkspaceRisksPage,
});

type FlatRecord = DependencyRisk & {
  itemId: string;
  item: BacklogItem;
};

const IMPACT_COLORS = {
  Blocker: "bg-red-500",
  Critical: "bg-orange-500",
  High: "bg-amber-500",
  Medium: "bg-blue-500",
  Low: "bg-slate-400",
};

const STATUS_COLORS = {
  Open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "In Progress":
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Closed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

function WorkspaceRisksPage() {
  const { code } = Route.useParams();
  const workspace = useWorkspace(code);
  const {
    store,
    addDependencyRisk,
    updateDependencyRisk,
    removeDependencyRisk,
  } = useWorkspaceStore();
  const { openTask } = useTaskDetail();

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterImpact, setFilterImpact] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");

  const workspaceItems = useMemo(() => {
    return store.items.filter((i) => i.workspaceCode === code);
  }, [store.items, code]);

  const allRecords: FlatRecord[] = useMemo(() => {
    const list: FlatRecord[] = [];
    workspaceItems.forEach((item) => {
      if (item.dependencyRisks) {
        item.dependencyRisks.forEach((dr) => {
          list.push({ ...dr, itemId: item.id, item });
        });
      }
    });
    return list;
  }, [workspaceItems]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      if (filterType !== "all" && rec.type !== filterType) return false;
      if (filterImpact !== "all" && rec.impactLevel !== filterImpact)
        return false;
      if (filterStatus !== "all" && rec.status !== filterStatus) return false;
      if (filterOwner !== "all" && !(rec.ownerIds || []).includes(filterOwner))
        return false;

      if (search) {
        const q = search.toLowerCase();
        if (rec.item.id.toLowerCase().includes(q)) return true;
        if (rec.item.title.toLowerCase().includes(q)) return true;
        if (rec.description.toLowerCase().includes(q)) return true;
        if (rec.mitigationNote?.toLowerCase().includes(q)) return true;

        const ownerNames = (rec.ownerIds || [])
          .map((id) => DIRECTORY.find((d) => d.id === id)?.name.toLowerCase())
          .filter(Boolean)
          .join(" ");
        if (ownerNames.includes(q)) return true;

        return false;
      }
      return true;
    });
  }, [allRecords, search, filterType, filterImpact, filterStatus, filterOwner]);

  // Summaries
  const openRisks = allRecords.filter(
    (r) => r.type === "Risk" && r.status !== "Closed",
  ).length;
  const openDeps = allRecords.filter(
    (r) => r.type === "Dependency" && r.status !== "Closed",
  ).length;
  const criticalItems = allRecords.filter(
    (r) =>
      (r.impactLevel === "Blocker" || r.impactLevel === "Critical") &&
      r.status !== "Closed",
  ).length;

  // Chart Data
  const risksByImpact = useMemo(() => {
    const risks = allRecords.filter((r) => r.type === "Risk");
    const counts: Record<string, number> = {
      Blocker: 0,
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };
    risks.forEach((r) => {
      if (counts[r.impactLevel] !== undefined) counts[r.impactLevel]++;
    });
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      fill: Object.values(IMPACT_COLORS)[index].split("-")[1],
    })); // heuristic
  }, [allRecords]);
  const IMPACT_CHART_COLORS = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#3b82f6",
    "#94a3b8",
  ];

  const risksByStatus = useMemo(() => {
    const risks = allRecords.filter((r) => r.type === "Risk");
    const counts = { Open: 0, "In Progress": 0, Closed: 0 };
    risks.forEach((r) => {
      counts[r.status as keyof typeof counts]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allRecords]);

  const depsByStatus = useMemo(() => {
    const deps = allRecords.filter((r) => r.type === "Dependency");
    const counts = { Open: 0, "In Progress": 0, Closed: 0 };
    deps.forEach((r) => {
      counts[r.status as keyof typeof counts]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allRecords]);
  const STATUS_CHART_COLORS = {
    Open: "#3b82f6",
    "In Progress": "#f59e0b",
    Closed: "#10b981",
  };

  // Form Dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const [formType, setFormType] = useState<"Dependency" | "Risk">("Dependency");
  const [formLinkedIssueId, setFormLinkedIssueId] = useState<string>("");
  const [formOwnerIds, setFormOwnerIds] = useState<string[]>([]);
  const [formImpactLevel, setFormImpactLevel] =
    useState<DependencyRisk["impactLevel"]>("Medium");
  const [formStatus, setFormStatus] =
    useState<DependencyRisk["status"]>("Open");
  const [formDescription, setFormDescription] = useState("");
  const [formMitigation, setFormMitigation] = useState("");

  const handleFormReset = () => {
    setFormType("Dependency");
    setFormLinkedIssueId("");
    setFormOwnerIds([]);
    setFormImpactLevel("Medium");
    setFormStatus("Open");
    setFormDescription("");
    setFormMitigation("");
    setEditingRecordId(null);
  };

  const openAddForm = () => {
    handleFormReset();
    setFormMode("add");
    setIsFormOpen(true);
  };

  const openEditForm = (rec: FlatRecord) => {
    handleFormReset();
    setFormType(rec.type);
    setFormLinkedIssueId(rec.itemId);
    setFormOwnerIds(rec.ownerIds || []);
    setFormImpactLevel(rec.impactLevel);
    setFormStatus(rec.status);
    setFormDescription(rec.description);
    setFormMitigation(rec.mitigationNote || "");
    setEditingRecordId(rec.id);
    setFormMode("edit");
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formLinkedIssueId || !formDescription.trim()) return;

    if (formMode === "add") {
      addDependencyRisk(formLinkedIssueId, {
        type: formType,
        ownerIds: formOwnerIds,
        impactLevel: formImpactLevel,
        status: formStatus,
        description: formDescription.trim(),
        mitigationNote: formMitigation.trim() || undefined,
      });
    } else if (editingRecordId) {
      updateDependencyRisk(formLinkedIssueId, editingRecordId, {
        type: formType,
        ownerIds: formOwnerIds,
        impactLevel: formImpactLevel,
        status: formStatus,
        description: formDescription.trim(),
        mitigationNote: formMitigation.trim() || undefined,
      });
    }

    setIsFormOpen(false);
    handleFormReset();
  };

  // Delete in place
  const handleDelete = (rec: FlatRecord) => {
    if (confirm("Are you sure you want to delete this record?")) {
      removeDependencyRisk(rec.itemId, rec.id);
    }
  };

  const updateRecordStatus = (
    rec: FlatRecord,
    newStatus: DependencyRisk["status"],
  ) => {
    updateDependencyRisk(rec.itemId, rec.id, { status: newStatus });
  };

  if (!workspace) return null;

  return (
    <div className="flex flex-col h-full bg-background flex-1 min-h-0 min-w-0 font-sans p-6 overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Header Options */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-indigo-500" />
              Dependencies / Risk
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Centralized RAID register managing cross-issue risks and
              dependencies.
            </p>
          </div>
          <Button
            onClick={openAddForm}
            size="sm"
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {/* Summaries */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => {
              setFilterType("Risk");
              setFilterStatus("Open");
            }}
            className="p-4 rounded-xl border border-border bg-card shadow-sm cursor-pointer hover:border-indigo-500/40 transition-colors group"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" /> Open Risks
            </div>
            <div className="text-2xl font-bold">{openRisks}</div>
          </div>
          <div
            onClick={() => {
              setFilterType("Dependency");
              setFilterStatus("Open");
            }}
            className="p-4 rounded-xl border border-border bg-card shadow-sm cursor-pointer hover:border-indigo-500/40 transition-colors group"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <LinkIcon className="h-4 w-4 text-blue-500" /> Open Dependencies
            </div>
            <div className="text-2xl font-bold">{openDeps}</div>
          </div>
          <div
            onClick={() => {
              setFilterImpact("Blocker");
              setFilterStatus("Open");
            }}
            className="p-4 rounded-xl border border-border bg-card shadow-sm cursor-pointer hover:border-indigo-500/40 transition-colors group"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Critical Items
            </div>
            <div className="text-2xl font-bold">{criticalItems}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-border rounded-xl bg-card p-4 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
              Risks by Impact
            </h3>
            <div className="flex-1 min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={risksByImpact}
                  layout="vertical"
                  margin={{ top: 0, right: 0, bottom: 0, left: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e5e7eb"
                    opacity={0.5}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    width={60}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {risksByImpact.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={IMPACT_CHART_COLORS[index]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="border border-border rounded-xl bg-card p-4 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              Risks by Status
            </h3>
            <div className="flex-1 min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={risksByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                    stroke="none"
                  >
                    {risksByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          STATUS_CHART_COLORS[
                            entry.name as keyof typeof STATUS_CHART_COLORS
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="border border-border rounded-xl bg-card p-4 shadow-sm flex flex-col">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              Dependencies by Status
            </h3>
            <div className="flex-1 min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={depsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                    stroke="none"
                  >
                    {depsByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          STATUS_CHART_COLORS[
                            entry.name as keyof typeof STATUS_CHART_COLORS
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 items-center bg-card p-2 rounded-lg border border-border shadow-xs">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search RAID items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs bg-background h-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto overflow-x-auto">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px] h-9 text-xs shrink-0">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Dependency">Dependency</SelectItem>
                <SelectItem value="Risk">Risk</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterImpact} onValueChange={setFilterImpact}>
              <SelectTrigger className="w-[130px] h-9 text-xs shrink-0">
                <SelectValue placeholder="Impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impacts</SelectItem>
                <SelectItem value="Blocker">Blocker</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px] h-9 text-xs shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger className="w-[140px] h-9 text-xs shrink-0">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {DIRECTORY.filter(
                  (d) =>
                    workspace.ownerIds.includes(d.id) ||
                    workspace.memberIds.includes(d.id),
                ).map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl bg-card overflow-x-auto shadow-sm pb-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground select-none">
                <th className="p-3 w-[150px]">Linked Issue</th>
                <th className="p-3 min-w-[200px]">Description</th>
                <th className="p-3 w-[160px]">Mitigation Note</th>
                <th className="p-3 w-24">Impact Level</th>
                <th className="p-3 w-28 text-center">Status</th>
                <th className="p-3 w-32 items-center">Owner(s)</th>
                <th className="p-3 w-32 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((dr) => (
                <tr
                  key={`${dr.itemId}-${dr.id}`}
                  className="hover:bg-muted/30 text-sm transition-colors border-b border-border/80 last:border-0 group"
                >
                  <td className="p-3 align-top">
                    <button
                      onClick={() => openTask(dr.itemId, "dependencies")}
                      className="text-left group/btn flex items-start gap-1.5 hover:bg-muted/60 p-1.5 -ml-1.5 rounded transition-colors"
                    >
                      <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                        {dr.item.id}
                      </span>
                      <span
                        className="text-[12px] font-medium leading-tight text-foreground group-hover/btn:text-indigo-600 transition-colors line-clamp-2"
                        title={dr.item.title}
                      >
                        {dr.item.title}
                      </span>
                    </button>
                  </td>
                  <td className="p-3 align-top">
                    <div className="flex flex-col gap-1.5">
                      {dr.type === "Dependency" ? (
                        <Badge className="bg-blue-100/50 hover:bg-blue-100/50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-medium text-[9px] w-fit px-1.5 py-0">
                          Dependency
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100/50 hover:bg-amber-100/50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-medium text-[9px] w-fit px-1.5 py-0">
                          Risk
                        </Badge>
                      )}
                      <p className="text-foreground text-xs leading-relaxed truncate-none break-words">
                        {dr.description}
                      </p>
                    </div>
                  </td>
                  <td className="p-3 align-top">
                    {dr.mitigationNote ? (
                      <p
                        className="text-muted-foreground text-xs line-clamp-3 leading-relaxed"
                        title={dr.mitigationNote}
                      >
                        {dr.mitigationNote}
                      </p>
                    ) : (
                      <span className="text-muted-foreground/60 text-xs">
                        -
                      </span>
                    )}
                  </td>
                  <td className="p-3 align-top">
                    <div className="flex items-center gap-1.5 mt-1">
                      <div
                        className={`h-2 w-2 rounded-full ${IMPACT_COLORS[dr.impactLevel]}`}
                      />
                      <span className="text-xs font-medium text-foreground">
                        {dr.impactLevel}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 align-top">
                    <Badge
                      className={`${STATUS_COLORS[dr.status]} text-[10px] uppercase font-bold border-none mt-0.5 w-full justify-center`}
                    >
                      {dr.status}
                    </Badge>
                  </td>
                  <td className="p-3 align-top">
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {dr.ownerIds && dr.ownerIds.length > 0 ? (
                        <>
                          {(() => {
                            const firstOwner = DIRECTORY.find(
                              (d) => d.id === dr.ownerIds[0],
                            );
                            if (!firstOwner) return null;
                            return (
                              <div
                                key={dr.ownerIds[0]}
                                className="inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-full text-[11px] font-medium text-foreground border border-border/30"
                              >
                                <PersonAvatar
                                  userId={dr.ownerIds[0]}
                                  size="xs"
                                />
                                <span className="truncate max-w-[65px]">
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
                        <span className="text-xs text-muted-foreground mt-1">
                          -
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 align-top text-center">
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <Select
                        value={dr.status}
                        onValueChange={(val) =>
                          updateRecordStatus(
                            dr,
                            val as DependencyRisk["status"],
                          )
                        }
                      >
                        <SelectTrigger className="h-7 w-[95px] text-[10px] border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="In Progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => openEditForm(dr)}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit Record"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(dr)}
                        className="p-1.5 rounded text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formMode === "add"
                ? "Add Dependency / Risk"
                : "Edit Dependency / Risk"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Type
                </label>
                <Select
                  value={formType}
                  onValueChange={(val) =>
                    setFormType(val as "Dependency" | "Risk")
                  }
                >
                  <SelectTrigger disabled={formMode === "edit"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dependency">Dependency</SelectItem>
                    <SelectItem value="Risk">Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Linked Issue *
                </label>
                <Select
                  value={formLinkedIssueId}
                  onValueChange={(val) => setFormLinkedIssueId(val)}
                >
                  <SelectTrigger disabled={formMode === "edit"}>
                    <SelectValue placeholder="Select an issue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaceItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-1 max-w-[150px] truncate">
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {item.id}
                          </span>
                          <span className="truncate">{item.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Description *
              </label>
              <Textarea
                placeholder="Describe the dependency or risk..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Owner(s)
              </label>
              <MultiSelectPeople
                selectedIds={formOwnerIds}
                onChange={setFormOwnerIds}
                pool={DIRECTORY.filter(
                  (d) =>
                    workspace.ownerIds.includes(d.id) ||
                    workspace.memberIds.includes(d.id),
                )}
                placeholder="Assign owners"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Impact Level
                </label>
                <Select
                  value={formImpactLevel}
                  onValueChange={(val) =>
                    setFormImpactLevel(val as DependencyRisk["impactLevel"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Blocker">Blocker</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Status
                </label>
                <Select
                  value={formStatus}
                  onValueChange={(val) =>
                    setFormStatus(val as DependencyRisk["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Mitigation Note
              </label>
              <Textarea
                placeholder="Action plan or notes..."
                value={formMitigation}
                onChange={(e) => setFormMitigation(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formLinkedIssueId || !formDescription.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
