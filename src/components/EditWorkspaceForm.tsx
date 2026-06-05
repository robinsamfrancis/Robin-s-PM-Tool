import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useWorkspaceStore,
  type ProjectType,
  type Workspace,
} from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

interface EditWorkspaceFormProps {
  workspace: Workspace;
  onCancel: () => void;
  onSaveSuccess: () => void;
}

export function EditWorkspaceForm({
  workspace,
  onCancel,
  onSaveSuccess,
}: EditWorkspaceFormProps) {
  const { store, updateWorkspace } = useWorkspaceStore();

  const [name, setName] = useState(workspace.name);
  const [code, setCode] = useState(workspace.code);
  const [type, setType] = useState<ProjectType>(workspace.type);
  const [owners, setOwners] = useState<string[]>(workspace.ownerIds || []);
  const [members, setMembers] = useState<string[]>(workspace.memberIds || []);
  const [parentCode, setParentCode] = useState<string | undefined>(
    workspace.parentCode,
  );
  const [statuses, setStatuses] = useState<string[]>(workspace.statuses || []);
  const [newStatus, setNewStatus] = useState("");
  const [startDate, setStartDate] = useState(workspace.startDate || "");
  const [endDate, setEndDate] = useState(workspace.endDate || "");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Sync state if workspace changes
  useEffect(() => {
    setName(workspace.name);
    setCode(workspace.code);
    setType(workspace.type);
    setOwners(workspace.ownerIds || []);
    setMembers(workspace.memberIds || []);
    setParentCode(workspace.parentCode);
    setStatuses(workspace.statuses || []);
    setStartDate(workspace.startDate || "");
    setEndDate(workspace.endDate || "");
  }, [workspace]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Workspace name is required");
    if (owners.length === 0) return toast.error("Add at least one space owner");
    if (statuses.length === 0)
      return toast.error("Add at least one workflow status");

    updateWorkspace(workspace.code, {
      name: name.trim(),
      type,
      ownerIds: owners,
      memberIds: members,
      parentCode,
      statuses,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    toast.success(`Workspace "${name}" updated successfully`);
    onSaveSuccess();
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
    <div className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-8 bg-background">
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={onCancel}
          className="hover:text-foreground text-left flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Edit workspace settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modify the configuration, team, and workflow stages for this
          workspace.
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
              hint="Project code is unique and cannot be modified."
            >
              <Input
                value={code}
                disabled
                className="uppercase font-mono bg-muted select-none text-muted-foreground"
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
                  {store.workspaces
                    .filter((w) => w.code !== workspace.code)
                    .map((w) => (
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
        <FormSection title="Timeline" description="When does the project run?">
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
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="gap-2 bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-glow"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
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
