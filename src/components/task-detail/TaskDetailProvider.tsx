import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { TaskDetailDrawer } from "./TaskDetailDialog";
import { useWorkspaceStore } from "@/lib/workspace-store";

interface Ctx {
  openTask: (id: string, initialTab?: string) => void;
  closeTask: () => void;
  openId: string | null;
  initialTab?: string;
}

const TaskDetailContext = createContext<Ctx | null>(null);

export function TaskDetailProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [initialTaskTab, setInitialTaskTab] = useState<string | undefined>();
  const { seedItemDetails } = useWorkspaceStore();

  const openTask = useCallback(
    (id: string, initialTab?: string) => {
      seedItemDetails(id);
      setOpenId(id);
      setInitialTaskTab(initialTab);
    },
    [seedItemDetails],
  );
  const closeTask = useCallback(() => {
    setOpenId(null);
    setInitialTaskTab(undefined);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openId) {
        setOpenId(null);
        setInitialTaskTab(undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  return (
    <TaskDetailContext.Provider
      value={{ openTask, closeTask, openId, initialTab: initialTaskTab }}
    >
      {children}
      <TaskDetailDrawer
        openId={openId}
        onClose={closeTask}
        onOpenOther={openTask}
        initialTab={initialTaskTab}
      />
    </TaskDetailContext.Provider>
  );
}

export function useTaskDetail() {
  const ctx = useContext(TaskDetailContext);
  if (!ctx) throw new Error("useTaskDetail must be inside TaskDetailProvider");
  return ctx;
}
