import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectPeople } from "@/components/MultiSelectPeople";
import {
  DEFAULT_STATUSES,
  useWorkspaceStore,
  type ProjectType,
} from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspaces/new")({
  head: () => ({
    meta: [{ title: "Create Workspace — Beinex Project Mate" }],
  }),
  component: CreateWorkspacePage,
});

function CreateWorkspacePage() {
  const navigate = useNavigate();
  const { store, createWorkspace } = useWorkspaceStore();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<ProjectType>("in-house");
  const [owners, setOwners] = useState<string[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [parentCode, setParentCode] = useState<string | undefined>(undefined);
  const [statuses, setStatuses] = useState<string[]>(DEFAULT_STATUSES);
  const [newStatus, setNewStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const codeError =
    code && store.workspaces.some((w) => w.code === code.toUpperCase())
      ? "Workspace code already in use"
      : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Workspace name is required");
    if (!code.trim()) return toast.error("Project code is required");
    if (codeError) return toast.error(codeError);
    if (owners.length === 0) return toast.error("Add at least one space owner");
    if (statuses.length === 0)
      return toast.error("Add at least one workflow status");

    const finalCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    createWorkspace({
      code: finalCode,
      name: name.trim(),
      type,
      ownerIds: owners,
      memberIds: members,
      parentCode,
      statuses,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    toast.success(`Workspace "${name}" created`);
    navigate({
      to: "/workspaces/$code/dashboard",
      params: { code: finalCode },
    });
  };

  const addStatus = () => {
    const trimmed = newStatus.trim();
    if (!trimmed) return;
    if (statuses.includes(trimmed)) return toast.error("Status already exists");
    setStatuses([...statuses, trimmed]);
    setNewStatus("");
  };

  const editStatus = (i: number, value: string) => {
    setStatuses(statuses.map((s, idx) => (idx === i ? value : s)));
  };

  const deleteStatus = (i: number) => {
    setStatuses(statuses.filter((_, idx) => idx !== i));
  };

  const onDragStart = (i: number) => setDragIdx(i);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (i: number) => {
    if (dragIdx === null || dragIdx === i) return;
    const next = [...statuses];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setStatuses(next);
    setDragIdx(null);
  };

  return (
    <AppShell title="Create workspace">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to home
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create a new workspace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your project, team and workflow. You can fine-tune everything
            later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basics */}
          <FormSection title="Basics" description="Identify your project.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Workspace name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Customer Relations"
                  maxLength={80}
                />
              </Field>
              <Field
                label="Project code"
                required
                hint="Short unique identifier — e.g. CRM, HRM, FIN"
                error={codeError}
              >
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CRM"
                  maxLength={6}
                  className="uppercase font-mono"
                />
              </Field>
              <Field label="Project type" required>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as ProjectType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-house">In-house</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Parent workspace"
                hint="Optional — choose a parent to build a hierarchy."
              >
                <Select
                  value={parentCode ?? "__none__"}
                  onValueChange={(v) =>
                    setParentCode(v === "__none__" ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {store.workspaces.map((w) => (
                      <SelectItem key={w.code} value={w.code}>
                        {w.code} — {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FormSection>

          {/* Team */}
          <FormSection
            title="Team"
            description="Choose space owners and members."
          >
            <Field
              label="Space owners"
              required
              hint="Search to add, click × to remove."
            >
              <MultiSelectPeople
                value={owners}
                onChange={setOwners}
                placeholder="Search owners by name or role…"
              />
            </Field>
            <Field
              label="Space members"
              hint="Searchable — pick from the directory."
            >
              <MultiSelectPeople
                value={members}
                onChange={setMembers}
                placeholder="Search members by name or designation…"
              />
            </Field>
          </FormSection>

          {/* Workflow */}
          <FormSection
            title="Workflow statuses"
            description="Set up your statuses. Drag to reorder, edit inline, or delete."
          >
            <div className="space-y-2">
              {statuses.map((s, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(i)}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border border-border bg-card p-2 transition-all",
                    dragIdx === i && "opacity-50",
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <Input
                    value={s}
                    onChange={(e) => editStatus(i, e.target.value)}
                    className="h-8 flex-1 border-0 bg-transparent focus-visible:ring-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteStatus(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Input
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                placeholder="Add custom status (e.g. Blocked)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStatus();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addStatus}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </FormSection>

          {/* Dates */}
          <FormSection
            title="Timeline"
            description="When does the project run?"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Start date">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field label="End date">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>
            </div>
          </FormSection>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/" })}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-glow"
            >
              <CheckCircle2 className="h-4 w-4" />
              Create workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
