import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DIRECTORY,
  useWorkspaceStore,
  type Workspace,
  type Sprint,
} from "@/lib/workspace-store";
import { PersonAvatar } from "@/components/PersonAvatar";

type Duration = "1" | "2" | "3" | "custom";

export function SprintFormDialog({
  open,
  onOpenChange,
  workspace,
  sprintToEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace;
  sprintToEdit?: Sprint;
}) {
  const { createSprint, updateSprint } = useWorkspaceStore();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState<Duration>("2");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaves, setLeaves] = useState<Record<string, string>>({}); // userId -> comma dates

  const allMembers = useMemo(
    () => Array.from(new Set([...workspace.ownerIds, ...workspace.memberIds])),
    [workspace],
  );

  useEffect(() => {
    if (!open) return;
    if (sprintToEdit) {
      setName(sprintToEdit.name);
      setGoal(sprintToEdit.goal || "");
      setDuration(
        sprintToEdit.durationWeeks === "custom"
          ? "custom"
          : sprintToEdit.durationWeeks.toString(),
      );
      setStartDate(sprintToEdit.startDate);
      setEndDate(sprintToEdit.endDate);
      const initialLeaves: Record<string, string> = {};
      if (sprintToEdit.leaves) {
        for (const [uid, dates] of Object.entries(sprintToEdit.leaves)) {
          initialLeaves[uid] = (dates as string[]).join(", ");
        }
      }
      setLeaves(initialLeaves);
    } else {
      setName("");
      setGoal("");
      setDuration("2");
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate("");
      setLeaves({});
    }
  }, [open, sprintToEdit]);

  useEffect(() => {
    if (duration === "custom" || !startDate) return;
    const start = new Date(startDate);
    const weeks = parseInt(duration, 10);
    const end = new Date(start);
    end.setDate(start.getDate() + weeks * 7 - 1);
    setEndDate(end.toISOString().slice(0, 10));
  }, [duration, startDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Sprint name is required");
    if (!startDate || !endDate)
      return toast.error("Start and end dates required");

    const leavesMap: Record<string, string[]> = {};
    for (const [uid, str] of Object.entries(leaves)) {
      const dates = str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (dates.length) leavesMap[uid] = dates;
    }

    if (sprintToEdit) {
      updateSprint(sprintToEdit.id, {
        name: name.trim(),
        goal: goal.trim() || undefined,
        durationWeeks:
          duration === "custom" ? "custom" : parseInt(duration, 10),
        startDate,
        endDate,
        leaves: Object.keys(leavesMap).length ? leavesMap : undefined,
      });
      toast.success(`Sprint "${name.trim()}" updated`);
    } else {
      const sprint = createSprint({
        workspaceCode: workspace.code,
        name: name.trim(),
        goal: goal.trim() || undefined,
        durationWeeks:
          duration === "custom" ? "custom" : parseInt(duration, 10),
        startDate,
        endDate,
      });
      if (Object.keys(leavesMap).length) {
        updateSprint(sprint.id, { leaves: leavesMap });
      }
      toast.success(`Sprint "${sprint.name}" created`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sprintToEdit ? "Edit sprint" : "Create sprint"}
          </DialogTitle>
          <DialogDescription>
            {sprintToEdit
              ? "Modify sprint details."
              : "Plan your next time-boxed delivery."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Row label="Sprint name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sprint 1"
              autoFocus
            />
          </Row>
          <Row label="Goal">
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              placeholder="What will this sprint deliver?"
            />
          </Row>
          <div className="grid gap-4 sm:grid-cols-3">
            <Row label="Duration">
              <Select
                value={duration}
                onValueChange={(v) => setDuration(v as Duration)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 week</SelectItem>
                  <SelectItem value="2">2 weeks</SelectItem>
                  <SelectItem value="3">3 weeks</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="Start date">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Row>
            <Row label="End date">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={duration !== "custom"}
              />
            </Row>
          </div>

          {allMembers.length > 0 && (
            <Row
              label="Planned leaves (per member)"
              hint="Comma-separated dates: 2026-06-10, 2026-06-11"
            >
              <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-border p-2">
                {allMembers.map((id) => {
                  const p = DIRECTORY.find((x) => x.id === id);
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <PersonAvatar userId={id} size="sm" />
                      <span className="text-xs font-medium w-36 truncate">
                        {p?.name ?? id}
                      </span>
                      <Input
                        value={leaves[id] ?? ""}
                        onChange={(e) =>
                          setLeaves((l) => ({ ...l, [id]: e.target.value }))
                        }
                        placeholder="No planned leaves"
                        className="h-7 text-xs flex-1"
                      />
                    </div>
                  );
                })}
              </div>
            </Row>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary text-primary-foreground"
            >
              Create sprint
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
