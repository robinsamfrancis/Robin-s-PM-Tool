import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

export type Designation =
  | "Frontend Developer"
  | "Backend Developer"
  | "QA Engineer"
  | "UI/UX Designer"
  | "Product Analyst"
  | "DevOps Engineer";

export const DESIGNATIONS: Designation[] = [
  "Frontend Developer",
  "Backend Developer",
  "QA Engineer",
  "UI/UX Designer",
  "Product Analyst",
  "DevOps Engineer",
];

export interface Person {
  id: string;
  name: string;
  designation: Designation;
}

export const DIRECTORY: Person[] = [
  { id: "u1", name: "Alex Morgan", designation: "Frontend Developer" },
  { id: "u2", name: "Priya Singh", designation: "Backend Developer" },
  { id: "u3", name: "Diego Hernandez", designation: "QA Engineer" },
  { id: "u4", name: "Sophia Chen", designation: "UI/UX Designer" },
  { id: "u5", name: "Liam O'Connor", designation: "Product Analyst" },
  { id: "u6", name: "Aisha Khan", designation: "DevOps Engineer" },
  { id: "u7", name: "Marco Rossi", designation: "Backend Developer" },
  { id: "u8", name: "Nadia Petrova", designation: "Frontend Developer" },
  { id: "u9", name: "Kenji Tanaka", designation: "DevOps Engineer" },
  { id: "u10", name: "Emma Wilson", designation: "QA Engineer" },
];

export type IssueType = "epic" | "feature" | "story" | "task" | "bug" | "spike";
export type Priority = "lowest" | "low" | "medium" | "high" | "highest";
export type LinkType = "blocks" | "blockedBy" | "relatesTo" | "duplicates";

export interface AcceptanceCriterion {
  id: string;
  text: string;
  done: boolean;
  isDefault?: boolean;
}
export interface IssueLink {
  id: string;
  type: LinkType;
  targetId: string;
}
export interface Reaction {
  emoji: string;
  userIds: string[];
}
export interface Comment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  reactions: Reaction[];
  internal: boolean;
  parentId?: string;
  attachments?: Attachment[];
}
export type ActivityType =
  | "created"
  | "updated"
  | "status"
  | "sprint"
  | "assignee"
  | "comment"
  | "attachment"
  | "worklog"
  | "automation";
export interface Activity {
  id: string;
  type: ActivityType;
  actorId: string;
  at: string;
  text: string;
}
export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
}
export interface Worklog {
  id: string;
  userId: string;
  date: string;
  hours: number;
  comment?: string;
}

export interface DependencyRisk {
  id: string;
  type: "Dependency" | "Risk";
  description: string;
  ownerIds: string[];
  impactLevel: "Blocker" | "Critical" | "High" | "Medium" | "Low";
  mitigationNote?: string;
  status: "Open" | "In Progress" | "Closed";
  loggedDate: string;
  closureDate?: string;
}

export interface BacklogItem {
  id: string;
  workspaceCode: string;
  type: IssueType;
  title: string;
  description?: string;
  priority: Priority;
  points: number;
  assigneeId?: string;
  reporterId?: string;
  sprintId?: string;
  parentId?: string;
  epicId?: string;
  budgetHours?: number;
  estimateHours?: number;
  remainingHours?: number;
  startDate?: string;
  dueDate?: string;
  status: string;
  order: number;
  team?: string;
  releaseVersion?: string;
  acceptanceCriteria?: AcceptanceCriterion[];
  links?: IssueLink[];
  comments?: Comment[];
  activity?: Activity[];
  attachments?: Attachment[];
  worklogs?: Worklog[];
  dependencyRisks?: DependencyRisk[];
  seededAt?: string;
}

export type SprintState = "planned" | "active" | "completed";

export interface SprintRetrospective {
  whatWentWell?: string;
  whatToImprove?: string;
  actionItems?: string;
  notes?: string;
  completedAt?: string;

  // Enhanced retro fields
  closureSummary?: string;
  whatWentWellList?: string[];
  whatToImproveList?: string[];
  lastModifiedAt?: string;
  managerName?: string;
}

export interface Sprint {
  id: string;
  workspaceCode: string;
  name: string;
  goal?: string;
  durationWeeks: number | "custom";
  startDate: string;
  endDate: string;
  state: SprintState;
  leaves: Record<string, string[]>;
  summary?: string;
  plannedPoints?: number;
  completedPoints?: number;
  carriedPoints?: number;
  completedItemsCount?: number;
  carriedItemsCount?: number;
  destinationSprintName?: string;
  retrospective?: SprintRetrospective;
}

export type ProjectType = "in-house" | "client";

export interface Workspace {
  code: string;
  name: string;
  type: ProjectType;
  ownerIds: string[];
  memberIds: string[];
  parentCode?: string;
  statuses: string[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface DocumentVersion {
  version: number;
  name: string;
  url: string; // can contain data URL or mock URL
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ProjectDocument {
  id: string;
  workspaceCode: string;
  name: string;
  type: string; // e.g. "pdf", "docx", "xls", "txt", "png", etc.
  folderId: string | null;
  content?: string; // used for notes generated inside Beinex
  size: number;
  versions: DocumentVersion[];
  associations: {
    type: "epic" | "feature" | "story" | "task" | "release";
    id: string;
    title: string;
  }[];
  createdBy: string;
  createdAt: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
  viewCount: number;
}

export interface DocumentFolder {
  id: string;
  workspaceCode: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

interface Store {
  workspaces: Workspace[];
  items: BacklogItem[];
  sprints: Sprint[];
  documents: ProjectDocument[];
  folders: DocumentFolder[];
}

const STORAGE_KEY = "bpm-store-v1";

const initialStore = (): Store => {
  if (typeof window === "undefined")
    return {
      workspaces: [],
      items: [],
      sprints: [],
      documents: [],
      folders: [],
    };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        workspaces: parsed.workspaces || [],
        items: parsed.items || [],
        sprints: parsed.sprints || [],
        documents: parsed.documents || [],
        folders: parsed.folders || [],
      };
    }
  } catch {
    // ignore
  }
  return { workspaces: [], items: [], sprints: [], documents: [], folders: [] };
};

const rid = (p: string) =>
  `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const now = () => new Date().toISOString();

interface Ctx {
  store: Store;
  loading: boolean;
  createWorkspace: (w: Omit<Workspace, "createdAt">) => void;
  updateWorkspace: (code: string, patch: Partial<Workspace>) => void;
  createItem: (item: Omit<BacklogItem, "id" | "order">) => BacklogItem;
  updateItem: (
    id: string,
    patch: Partial<BacklogItem>,
    actorId?: string,
  ) => boolean;
  deleteItem: (id: string) => void;
  moveItem: (id: string, targetSprintId: string | undefined) => void;
  createSprint: (s: Omit<Sprint, "id" | "state" | "leaves">) => Sprint;
  updateSprint: (id: string, patch: Partial<Sprint>) => void;
  startSprint: (id: string) => void;
  completeSprint: (
    id: string,
    stats?: {
      plannedPoints: number;
      completedPoints: number;
      carriedPoints: number;
      completedItemsCount: number;
      carriedItemsCount: number;
      destinationSprintName?: string;
    },
    moveIncompleteToSprintId?: string,
  ) => void;
  deleteSprint: (id: string) => void;
  // task detail extras
  addComment: (
    itemId: string,
    c: Omit<Comment, "id" | "createdAt" | "reactions">,
  ) => void;
  toggleReaction: (
    itemId: string,
    commentId: string,
    emoji: string,
    userId: string,
  ) => void;
  addAcceptance: (itemId: string, text: string) => void;
  updateAcceptance: (itemId: string, acId: string, text: string) => void;
  toggleAcceptance: (itemId: string, acId: string) => void;
  removeAcceptance: (itemId: string, acId: string) => void;
  addLink: (itemId: string, type: LinkType, targetId: string) => void;
  removeLink: (itemId: string, linkId: string) => void;
  addWorklog: (itemId: string, w: Omit<Worklog, "id">) => void;
  addAttachment: (
    itemId: string,
    a: Omit<Attachment, "id" | "uploadedAt" | "version">,
  ) => void;
  removeAttachment: (itemId: string, attId: string) => void;
  addDependencyRisk: (
    itemId: string,
    dr: Omit<DependencyRisk, "id" | "loggedDate" | "closureDate">,
  ) => void;
  updateDependencyRisk: (
    itemId: string,
    drId: string,
    patch: Partial<
      Omit<DependencyRisk, "id" | "loggedDate" | "closureDate">
    > & { status?: "Open" | "In Progress" | "Closed" },
  ) => void;
  removeDependencyRisk: (itemId: string, drId: string) => void;
  seedItemDetails: (itemId: string) => void;

  // Documents and folders
  createFolder: (folder: {
    workspaceCode: string;
    name: string;
    parentId: string | null;
  }) => void;
  renameFolder: (id: string, name: string) => void;
  moveFolder: (id: string, parentId: string | null) => void;
  deleteFolder: (id: string) => void;
  uploadOrUpdateDocument: (
    workspaceCode: string,
    name: string,
    type: string,
    folderId: string | null,
    size: number,
    uploadedBy: string,
    fileContent?: string,
    associations?: ProjectDocument["associations"],
  ) => void;
  createDocument: (doc: {
    workspaceCode: string;
    name: string;
    type: string;
    folderId: string | null;
    content: string;
    createdBy: string;
    associations?: ProjectDocument["associations"];
  }) => void;
  updateDocument: (
    id: string,
    patch: Partial<Omit<ProjectDocument, "versions" | "viewCount">>,
  ) => void;
  deleteDocument: (id: string) => void;
  incrementDocumentView: (id: string) => void;
}

const StoreContext = createContext<Ctx | null>(null);

function logActivityArr(
  prev: Activity[] | undefined,
  type: ActivityType,
  actorId: string,
  text: string,
): Activity[] {
  const next = [
    ...(prev ?? []),
    { id: rid("ACT"), type, actorId, at: now(), text },
  ];
  return next.slice(-200);
}

export const DEFAULT_ACCEPTANCE_CRITERIA_TEXTS = [
  "KT Delivered",
  "Backend API Done",
  "API Documentation Done",
  "Performance Test Done",
  "Frontend Development Done",
  "Unit Testing Completed",
  "Feature Demo Done",
  "Design Verified",
  "Content Verified",
  "Product Analyst Approved",
  "QA Approved",
];

export function ensureDefaultAcceptanceCriteria(i: BacklogItem): BacklogItem {
  if (i.type !== "epic" && i.type !== "feature") {
    return i;
  }
  const currentCriteria = i.acceptanceCriteria ?? [];
  const missingTexts = DEFAULT_ACCEPTANCE_CRITERIA_TEXTS.filter(
    (text) => !currentCriteria.some((c) => c.text === text),
  );
  if (missingTexts.length === 0) {
    return i;
  }
  const addedCriteria = missingTexts.map((text, idx) => ({
    id: `AC-def-${idx}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    text,
    done: false,
    isDefault: true,
  }));
  return {
    ...i,
    acceptanceCriteria: [...currentCriteria, ...addedCriteria],
  };
}

export function WorkspaceStoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>({
    workspaces: [],
    items: [],
    sprints: [],
    documents: [],
    folders: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const workspaces = parsed.workspaces || [];
        const folders = parsed.folders || [];
        const documents = parsed.documents || [];
        const sprints = parsed.sprints || [];
        const items = parsed.items || [];

        let changed = false;
        const validatedFolders = [...folders];

        // Ensure default folders exist for all workspaces loaded
        workspaces.forEach((w: Workspace) => {
          const workspaceFolders = validatedFolders.filter(
            (f) => f.workspaceCode === w.code,
          );
          const hasUserStories = workspaceFolders.some(
            (f) => f.name.toLowerCase() === "user stories",
          );
          const hasMOM = workspaceFolders.some(
            (f) =>
              f.name.toLowerCase() === "mom" ||
              f.name.toLowerCase() === "mom (minutes of meeting)" ||
              f.name.toLowerCase().includes("minutes of meeting"),
          );
          const hasReleaseNotes = workspaceFolders.some(
            (f) => f.name.toLowerCase() === "release notes",
          );

          if (!hasUserStories) {
            validatedFolders.push({
              id: rid("FLD"),
              workspaceCode: w.code,
              name: "User Stories",
              parentId: null,
              createdAt: new Date().toISOString(),
            });
            changed = true;
          }
          if (!hasMOM) {
            validatedFolders.push({
              id: rid("FLD"),
              workspaceCode: w.code,
              name: "MOM (Minutes of Meeting)",
              parentId: null,
              createdAt: new Date().toISOString(),
            });
            changed = true;
          }
          if (!hasReleaseNotes) {
            validatedFolders.push({
              id: rid("FLD"),
              workspaceCode: w.code,
              name: "Release Notes",
              parentId: null,
              createdAt: new Date().toISOString(),
            });
            changed = true;
          }
        });

        // Seed some starter files into these default folders if we created folders and there are no documents yet
        const nextDocs = [...documents];
        if (nextDocs.length === 0 && validatedFolders.length > 0) {
          // Let's seed some mock documents to give the user a beautiful initial experience as described in instructions
          workspaces.forEach((w: Workspace) => {
            const userStoriesFolder = validatedFolders.find(
              (f) => f.workspaceCode === w.code && f.name === "User Stories",
            );
            const momFolder = validatedFolders.find(
              (f) =>
                f.workspaceCode === w.code &&
                f.name === "MOM (Minutes of Meeting)",
            );
            const releaseNotesFolder = validatedFolders.find(
              (f) => f.workspaceCode === w.code && f.name === "Release Notes",
            );

            const nowStr = new Date().toISOString();

            if (userStoriesFolder) {
              nextDocs.push({
                id: rid("DOC"),
                workspaceCode: w.code,
                name: "Login User Story.docx",
                type: "docx",
                folderId: userStoriesFolder.id,
                size: 24576,
                versions: [
                  {
                    version: 1,
                    name: "Login User Story.docx",
                    url: "https://example.com/login_story_v1.docx",
                    size: 24576,
                    uploadedBy: "robinfrancisadr@gmail.com",
                    uploadedAt: nowStr,
                  },
                ],
                associations: [
                  { type: "story", id: `${w.code}-101`, title: "Login Flow" },
                ],
                createdBy: "robinfrancisadr@gmail.com",
                createdAt: nowStr,
                lastModifiedBy: "robinfrancisadr@gmail.com",
                lastModifiedAt: nowStr,
                viewCount: 15,
              });
              nextDocs.push({
                id: rid("DOC"),
                workspaceCode: w.code,
                name: "Authentication Flow.pdf",
                type: "pdf",
                folderId: userStoriesFolder.id,
                size: 154200,
                versions: [
                  {
                    version: 1,
                    name: "Authentication Flow.pdf",
                    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    size: 154200,
                    uploadedBy: "robinfrancisadr@gmail.com",
                    uploadedAt: nowStr,
                  },
                ],
                associations: [
                  {
                    type: "feature",
                    id: `${w.code}-102`,
                    title: "Authentication Module",
                  },
                ],
                createdBy: "robinfrancisadr@gmail.com",
                createdAt: nowStr,
                lastModifiedBy: "robinfrancisadr@gmail.com",
                lastModifiedAt: nowStr,
                viewCount: 22,
              });
            }

            if (momFolder) {
              nextDocs.push({
                id: rid("DOC"),
                workspaceCode: w.code,
                name: "Sprint Planning Meeting.docx",
                type: "docx",
                folderId: momFolder.id,
                size: 31200,
                versions: [
                  {
                    version: 1,
                    name: "Sprint Planning Meeting.docx",
                    url: "https://example.com/planning_v1.docx",
                    size: 31200,
                    uploadedBy: "robinfrancisadr@gmail.com",
                    uploadedAt: nowStr,
                  },
                ],
                associations: [],
                createdBy: "robinfrancisadr@gmail.com",
                createdAt: nowStr,
                lastModifiedBy: "robinfrancisadr@gmail.com",
                lastModifiedAt: nowStr,
                viewCount: 8,
              });
              nextDocs.push({
                id: rid("DOC"),
                workspaceCode: w.code,
                name: "Retrospective Meeting.docx",
                type: "docx",
                folderId: momFolder.id,
                size: 28900,
                versions: [
                  {
                    version: 1,
                    name: "Retrospective Meeting.docx",
                    url: "https://example.com/retro_v1.docx",
                    size: 28900,
                    uploadedBy: "robinfrancisadr@gmail.com",
                    uploadedAt: nowStr,
                  },
                ],
                associations: [],
                createdBy: "robinfrancisadr@gmail.com",
                createdAt: nowStr,
                lastModifiedBy: "robinfrancisadr@gmail.com",
                lastModifiedAt: nowStr,
                viewCount: 12,
              });
            }

            if (releaseNotesFolder) {
              nextDocs.push({
                id: rid("DOC"),
                workspaceCode: w.code,
                name: "Release v1.0.pdf",
                type: "pdf",
                folderId: releaseNotesFolder.id,
                size: 450000,
                versions: [
                  {
                    version: 1,
                    name: "Release v1.0.pdf",
                    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                    size: 450000,
                    uploadedBy: "robinfrancisadr@gmail.com",
                    uploadedAt: nowStr,
                  },
                ],
                associations: [],
                createdBy: "robinfrancisadr@gmail.com",
                createdAt: nowStr,
                lastModifiedBy: "robinfrancisadr@gmail.com",
                lastModifiedAt: nowStr,
                viewCount: 4,
              });
            }
          });
          changed = true;
        }

        setStore({
          workspaces,
          items,
          sprints,
          documents: nextDocs,
          folders: validatedFolders,
        });
      }
    } catch (e) {
      console.error("Failed to load store", e);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // ignore
    }
  }, [store, isLoaded]);

  const value = useMemo<Ctx>(
    () => ({
      store,
      loading: !isLoaded,
      createWorkspace: (w) =>
        setStore((s) => {
          const workspaceCode = w.code;
          const userStoriesFldId = rid("FLD");
          const momFldId = rid("FLD");
          const releaseNotesFldId = rid("FLD");

          const newFolders: DocumentFolder[] = [
            {
              id: userStoriesFldId,
              workspaceCode,
              name: "User Stories",
              parentId: null,
              createdAt: new Date().toISOString(),
            },
            {
              id: momFldId,
              workspaceCode,
              name: "MOM (Minutes of Meeting)",
              parentId: null,
              createdAt: new Date().toISOString(),
            },
            {
              id: releaseNotesFldId,
              workspaceCode,
              name: "Release Notes",
              parentId: null,
              createdAt: new Date().toISOString(),
            },
          ];

          return {
            ...s,
            workspaces: [
              ...s.workspaces,
              { ...w, createdAt: new Date().toISOString() },
            ],
            folders: [...(s.folders || []), ...newFolders],
          };
        }),
      updateWorkspace: (code, patch) =>
        setStore((s) => ({
          ...s,
          workspaces: s.workspaces.map((w) =>
            w.code === code ? { ...w, ...patch } : w,
          ),
        })),
      createItem: (item) => {
        let newItem: BacklogItem = {
          ...item,
          estimateHours: item.budgetHours ?? item.estimateHours,
          id: `${item.workspaceCode}-${Math.floor(Math.random() * 900 + 100)}`,
          order: Date.now(),
          activity: [
            {
              id: rid("ACT"),
              type: "created",
              actorId: item.assigneeId ?? "u1",
              at: now(),
              text: "created this item",
            },
          ],
        };
        newItem = ensureDefaultAcceptanceCriteria(newItem);
        setStore((s) => ({ ...s, items: [...s.items, newItem] }));
        return newItem;
      },
      updateItem: (id, patch, actorId = "u1") => {
        if (patch.status === "Completed") {
          const item = store.items.find((i) => i.id === id);
          if (item && (item.type === "epic" || item.type === "feature")) {
            const acs = item.acceptanceCriteria ?? [];
            if (acs.some((a) => !a.done)) {
              toast.warning(
                "Unable to complete this item. Please ensure all acceptance criteria are marked as complete.",
              );
              return false;
            }
          }
        }

        setStore((s) => ({
          ...s,
          items: s.items.map((i) => {
            if (i.id !== id) return i;
            let next: BacklogItem = { ...i, ...patch };
            if (patch.budgetHours !== undefined) {
              next.estimateHours = patch.budgetHours;
            }
            if (next.type === "epic" || next.type === "feature") {
              next = ensureDefaultAcceptanceCriteria(next);
            }
            let activity = i.activity;
            if (patch.status && patch.status !== i.status) {
              activity = logActivityArr(
                activity,
                "status",
                actorId,
                `changed status from ${i.status} to ${patch.status}`,
              );
            }
            if ("assigneeId" in patch && patch.assigneeId !== i.assigneeId) {
              const name =
                DIRECTORY.find((d) => d.id === patch.assigneeId)?.name ??
                "Unassigned";
              activity = logActivityArr(
                activity,
                "assignee",
                actorId,
                `assigned to ${name}`,
              );
            }
            if ("sprintId" in patch && patch.sprintId !== i.sprintId) {
              activity = logActivityArr(
                activity,
                "sprint",
                actorId,
                patch.sprintId ? `moved to sprint` : `moved to backlog`,
              );
            }
            next.activity = activity;
            return next;
          }),
        }));
        return true;
      },
      deleteItem: (id) =>
        setStore((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) })),
      moveItem: (id, targetSprintId) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === id
              ? {
                  ...i,
                  sprintId: targetSprintId,
                  activity: logActivityArr(
                    i.activity,
                    "sprint",
                    "u1",
                    targetSprintId ? "moved to sprint" : "moved to backlog",
                  ),
                }
              : i,
          ),
        })),
      createSprint: (sp) => {
        const newSprint: Sprint = {
          ...sp,
          id: `SPR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          state: "planned",
          leaves: {},
        };
        setStore((s) => ({ ...s, sprints: [...s.sprints, newSprint] }));
        return newSprint;
      },
      updateSprint: (id, patch) =>
        setStore((s) => ({
          ...s,
          sprints: s.sprints.map((sp) =>
            sp.id === id ? { ...sp, ...patch } : sp,
          ),
        })),
      startSprint: (id) =>
        setStore((s) => ({
          ...s,
          sprints: s.sprints.map((sp) =>
            sp.id === id ? { ...sp, state: "active" as SprintState } : sp,
          ),
        })),
      completeSprint: (id, stats, moveIncompleteToSprintId) =>
        setStore((s) => {
          let summary = "";
          if (stats) {
            summary = `Completed ${stats.completedItemsCount} of ${stats.completedItemsCount + stats.carriedItemsCount} items · ${stats.completedPoints}/${stats.plannedPoints} story points delivered.`;
          } else {
            const sprintItems = s.items.filter((i) => i.sprintId === id);
            const done = sprintItems.filter((i) => i.status === "Completed");
            const points = sprintItems.reduce((a, b) => a + b.points, 0);
            const donePts = done.reduce((a, b) => a + b.points, 0);
            summary = `Completed ${done.length} of ${sprintItems.length} items · ${donePts}/${points} story points delivered.`;
          }

          // Move any items that belong to this sprint and are not completed
          const updatedItems = s.items.map((i) => {
            if (
              i.sprintId === id &&
              i.status !== "Completed" &&
              moveIncompleteToSprintId
            ) {
              return {
                ...i,
                sprintId: moveIncompleteToSprintId,
                activity: logActivityArr(
                  i.activity,
                  "sprint",
                  "u1",
                  `moved to sprint as part of sprint completion`,
                ),
              };
            }
            return i;
          });

          return {
            ...s,
            items: updatedItems,
            sprints: s.sprints.map((sp) =>
              sp.id === id
                ? {
                    ...sp,
                    state: "completed" as SprintState,
                    summary,
                    ...(stats ?? {}),
                  }
                : sp,
            ),
          };
        }),
      deleteSprint: (id) =>
        setStore((s) => ({
          ...s,
          sprints: s.sprints.filter((sp) => sp.id !== id),
          items: s.items.map((i) =>
            i.sprintId === id ? { ...i, sprintId: undefined } : i,
          ),
        })),
      addComment: (itemId, c) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  comments: [
                    ...(i.comments ?? []),
                    { ...c, id: rid("CMT"), createdAt: now(), reactions: [] },
                  ],
                  activity: logActivityArr(
                    i.activity,
                    "comment",
                    c.authorId,
                    "added a comment",
                  ),
                }
              : i,
          ),
        })),
      toggleReaction: (itemId, commentId, emoji, userId) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) => {
            if (i.id !== itemId) return i;
            return {
              ...i,
              comments: (i.comments ?? []).map((c) => {
                if (c.id !== commentId) return c;
                const existing = c.reactions.find((r) => r.emoji === emoji);
                let reactions: Reaction[];
                if (!existing)
                  reactions = [...c.reactions, { emoji, userIds: [userId] }];
                else if (existing.userIds.includes(userId))
                  reactions = c.reactions
                    .map((r) =>
                      r.emoji === emoji
                        ? {
                            ...r,
                            userIds: r.userIds.filter((u) => u !== userId),
                          }
                        : r,
                    )
                    .filter((r) => r.userIds.length > 0);
                else
                  reactions = c.reactions.map((r) =>
                    r.emoji === emoji
                      ? { ...r, userIds: [...r.userIds, userId] }
                      : r,
                  );
                return { ...c, reactions };
              }),
            };
          }),
        })),
      addAcceptance: (itemId, text) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  acceptanceCriteria: [
                    ...(i.acceptanceCriteria ?? []),
                    { id: rid("AC"), text, done: false },
                  ],
                }
              : i,
          ),
        })),
      updateAcceptance: (itemId, acId, text) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  acceptanceCriteria: (i.acceptanceCriteria ?? []).map((a) =>
                    a.id === acId ? { ...a, text } : a,
                  ),
                }
              : i,
          ),
        })),
      toggleAcceptance: (itemId, acId) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  acceptanceCriteria: (i.acceptanceCriteria ?? []).map((a) =>
                    a.id === acId ? { ...a, done: !a.done } : a,
                  ),
                }
              : i,
          ),
        })),
      removeAcceptance: (itemId, acId) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  acceptanceCriteria: (i.acceptanceCriteria ?? []).filter(
                    (a) => {
                      if (a.id === acId) {
                        const isDefault =
                          a.isDefault ||
                          DEFAULT_ACCEPTANCE_CRITERIA_TEXTS.includes(a.text);
                        return isDefault;
                      }
                      return true;
                    },
                  ),
                }
              : i,
          ),
        })),
      addLink: (itemId, type, targetId) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  links: [
                    ...(i.links ?? []),
                    { id: rid("LNK"), type, targetId },
                  ],
                }
              : i,
          ),
        })),
      removeLink: (itemId, linkId) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? { ...i, links: (i.links ?? []).filter((l) => l.id !== linkId) }
              : i,
          ),
        })),
      addWorklog: (itemId, w) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  worklogs: [...(i.worklogs ?? []), { ...w, id: rid("WL") }],
                  remainingHours: Math.max(
                    0,
                    (i.remainingHours ?? i.estimateHours ?? 0) - w.hours,
                  ),
                  activity: logActivityArr(
                    i.activity,
                    "worklog",
                    w.userId,
                    `logged ${w.hours}h`,
                  ),
                }
              : i,
          ),
        })),
      addAttachment: (itemId, a) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  attachments: [
                    ...(i.attachments ?? []),
                    { ...a, id: rid("ATT"), uploadedAt: now(), version: 1 },
                  ],
                  activity: logActivityArr(
                    i.activity,
                    "attachment",
                    a.uploadedBy,
                    `attached ${a.name}`,
                  ),
                }
              : i,
          ),
        })),
      removeAttachment: (itemId, attId) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  attachments: (i.attachments ?? []).filter(
                    (a) => a.id !== attId,
                  ),
                }
              : i,
          ),
        })),
      addDependencyRisk: (itemId, dr) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  dependencyRisks: [
                    ...(i.dependencyRisks ?? []),
                    {
                      ...dr,
                      id: rid("DR"),
                      loggedDate: new Date().toISOString().split("T")[0],
                      closureDate:
                        dr.status === "Closed"
                          ? new Date().toISOString().split("T")[0]
                          : undefined,
                    },
                  ],
                }
              : i,
          ),
        })),
      updateDependencyRisk: (itemId, drId, patch) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  dependencyRisks: (i.dependencyRisks ?? []).map((dr) => {
                    if (dr.id !== drId) return dr;
                    const nextStatus = patch.status ?? dr.status;
                    let nextClosureDate = dr.closureDate;
                    if (nextStatus === "Closed") {
                      nextClosureDate =
                        dr.closureDate ??
                        new Date().toISOString().split("T")[0];
                    } else {
                      nextClosureDate = undefined;
                    }
                    return {
                      ...dr,
                      ...patch,
                      closureDate: nextClosureDate,
                    };
                  }),
                }
              : i,
          ),
        })),
      removeDependencyRisk: (itemId, drId) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  dependencyRisks: (i.dependencyRisks ?? []).filter(
                    (dr) => dr.id !== drId,
                  ),
                }
              : i,
          ),
        })),
      createFolder: (folder) =>
        setStore((s) => ({
          ...s,
          folders: [
            ...(s.folders || []),
            {
              id: rid("FLD"),
              createdAt: new Date().toISOString(),
              ...folder,
            },
          ],
        })),
      renameFolder: (id, name) =>
        setStore((s) => ({
          ...s,
          folders: (s.folders || []).map((f) =>
            f.id === id ? { ...f, name } : f,
          ),
        })),
      moveFolder: (id, parentId) =>
        setStore((s) => ({
          ...s,
          folders: (s.folders || []).map((f) =>
            f.id === id ? { ...f, parentId } : f,
          ),
        })),
      deleteFolder: (id) =>
        setStore((s) => {
          const getAllSubFolderIds = (folderId: string): string[] => {
            const list = [folderId];
            const children = (s.folders || []).filter(
              (f) => f.parentId === folderId,
            );
            children.forEach((child) => {
              list.push(...getAllSubFolderIds(child.id));
            });
            return list;
          };
          const foldersToDelete = getAllSubFolderIds(id);
          return {
            ...s,
            folders: (s.folders || []).filter(
              (f) => !foldersToDelete.includes(f.id),
            ),
            documents: (s.documents || []).filter(
              (d) =>
                d.folderId === null || !foldersToDelete.includes(d.folderId),
            ),
          };
        }),
      uploadOrUpdateDocument: (
        workspaceCode,
        name,
        type,
        folderId,
        size,
        uploadedBy,
        fileContent,
        associations = [],
      ) =>
        setStore((s) => {
          const docs = s.documents || [];
          const existingIdx = docs.findIndex(
            (d) =>
              d.workspaceCode === workspaceCode &&
              d.name.toLowerCase() === name.toLowerCase() &&
              d.folderId === folderId,
          );

          const nowTime = new Date().toISOString();

          if (existingIdx > -1) {
            const existing = docs[existingIdx];
            const nextVersion = existing.versions.length + 1;
            const updatedVersionList = [
              ...existing.versions,
              {
                version: nextVersion,
                name,
                url:
                  fileContent ||
                  existing.versions[existing.versions.length - 1].url,
                size,
                uploadedBy,
                uploadedAt: nowTime,
              },
            ];

            const updatedDoc: ProjectDocument = {
              ...existing,
              size,
              versions: updatedVersionList,
              lastModifiedBy: uploadedBy,
              lastModifiedAt: nowTime,
              content: fileContent || existing.content,
              associations:
                associations.length > 0 ? associations : existing.associations,
            };

            const newDocs = [...docs];
            newDocs[existingIdx] = updatedDoc;

            return { ...s, documents: newDocs };
          } else {
            const newDoc: ProjectDocument = {
              id: rid("DOC"),
              workspaceCode,
              name,
              type,
              folderId,
              size,
              content: fileContent,
              versions: [
                {
                  version: 1,
                  name,
                  url: fileContent || "#",
                  size,
                  uploadedBy,
                  uploadedAt: nowTime,
                },
              ],
              associations,
              createdBy: uploadedBy,
              createdAt: nowTime,
              lastModifiedBy: uploadedBy,
              lastModifiedAt: nowTime,
              viewCount: 1,
            };

            return { ...s, documents: [...docs, newDoc] };
          }
        }),
      createDocument: (doc) =>
        setStore((s) => {
          const nowTime = new Date().toISOString();
          const newDoc: ProjectDocument = {
            id: rid("DOC"),
            workspaceCode: doc.workspaceCode,
            name: doc.name,
            type: doc.type,
            folderId: doc.folderId,
            size: doc.content.length,
            content: doc.content,
            versions: [
              {
                version: 1,
                name: doc.name,
                url: doc.content,
                size: doc.content.length,
                uploadedBy: doc.createdBy,
                uploadedAt: nowTime,
              },
            ],
            associations: doc.associations || [],
            createdBy: doc.createdBy,
            createdAt: nowTime,
            lastModifiedBy: doc.createdBy,
            lastModifiedAt: nowTime,
            viewCount: 1,
          };
          return {
            ...s,
            documents: [...(s.documents || []), newDoc],
          };
        }),
      updateDocument: (id, patch) =>
        setStore((s) => {
          const nowStr = new Date().toISOString();
          return {
            ...s,
            documents: (s.documents || []).map((d) => {
              if (d.id !== id) return d;
              const updatedVersions = [...d.versions];
              let size = d.size;
              if (patch.content !== undefined && patch.content !== d.content) {
                size = patch.content.length;
                const nextVer = d.versions.length + 1;
                updatedVersions.push({
                  version: nextVer,
                  name: patch.name || d.name,
                  url: patch.content,
                  size,
                  uploadedBy: patch.lastModifiedBy || d.lastModifiedBy,
                  uploadedAt: nowStr,
                });
              }
              return {
                ...d,
                ...patch,
                size,
                versions: updatedVersions,
                lastModifiedAt: nowStr,
              };
            }),
          };
        }),
      deleteDocument: (id) =>
        setStore((s) => ({
          ...s,
          documents: (s.documents || []).filter((d) => d.id !== id),
        })),
      incrementDocumentView: (id) =>
        setStore((s) => ({
          ...s,
          documents: (s.documents || []).map((d) =>
            d.id === id ? { ...d, viewCount: (d.viewCount || 0) + 1 } : d,
          ),
        })),
      seedItemDetails: (itemId) =>
        setStore((s) => ({
          ...s,
          items: s.items.map((i) => {
            if (i.id !== itemId || i.seededAt) return i;
            const pick = (n: number) => DIRECTORY.slice(0, n);
            const today = new Date();
            const iso = (offset: number) => {
              const d = new Date(today);
              d.setDate(d.getDate() + offset);
              return d.toISOString();
            };
            return {
              ...i,
              seededAt: now(),
              reporterId: i.reporterId ?? "u5",
              estimateHours: i.estimateHours ?? (i.points || 3) * 4,
              remainingHours:
                i.remainingHours ?? Math.max(0, (i.points || 3) * 4 - 6),
              team: i.team ?? "Platform Squad",
              releaseVersion: i.releaseVersion ?? "v1.4.0",
              acceptanceCriteria:
                i.acceptanceCriteria && i.acceptanceCriteria.length > 0
                  ? i.type === "epic" || i.type === "feature"
                    ? ensureDefaultAcceptanceCriteria(i).acceptanceCriteria
                    : i.acceptanceCriteria
                  : i.type === "epic" || i.type === "feature"
                    ? ensureDefaultAcceptanceCriteria({
                        ...i,
                        acceptanceCriteria: [],
                      }).acceptanceCriteria
                    : [
                        {
                          id: rid("AC"),
                          text: "Component renders without console warnings",
                          done: true,
                        },
                        {
                          id: rid("AC"),
                          text: "Keyboard navigation works end-to-end",
                          done: false,
                        },
                        {
                          id: rid("AC"),
                          text: "Meets WCAG AA color contrast",
                          done: false,
                        },
                      ],
              comments: i.comments?.length
                ? i.comments
                : [
                    {
                      id: rid("CMT"),
                      authorId: "u5",
                      body: "Initial scope looks good. Let's confirm the acceptance criteria with QA before grooming.",
                      createdAt: iso(-3),
                      reactions: [{ emoji: "👍", userIds: ["u1", "u2"] }],
                      internal: false,
                    },
                    {
                      id: rid("CMT"),
                      authorId: "u2",
                      body: "I'll start on the API contract. @u1 can you sync on the frontend types?",
                      createdAt: iso(-2),
                      reactions: [{ emoji: "🚀", userIds: ["u1"] }],
                      internal: false,
                    },
                    {
                      id: rid("CMT"),
                      authorId: "u3",
                      body: "QA note: edge case for empty states needs a screenshot in the spec.",
                      createdAt: iso(-1),
                      reactions: [],
                      internal: true,
                    },
                  ],
              attachments: i.attachments?.length
                ? i.attachments
                : [
                    {
                      id: rid("ATT"),
                      name: "design-spec.png",
                      mime: "image/png",
                      size: 482311,
                      url: `https://picsum.photos/seed/${i.id}/600/400`,
                      uploadedBy: "u4",
                      uploadedAt: iso(-4),
                      version: 1,
                    },
                    {
                      id: rid("ATT"),
                      name: "requirements.pdf",
                      mime: "application/pdf",
                      size: 128321,
                      url: "#",
                      uploadedBy: "u5",
                      uploadedAt: iso(-5),
                      version: 2,
                    },
                  ],
              worklogs: i.worklogs?.length
                ? i.worklogs
                : [
                    {
                      id: rid("WL"),
                      userId: "u1",
                      date: iso(-2).slice(0, 10),
                      hours: 3.5,
                      comment: "Initial implementation",
                    },
                    {
                      id: rid("WL"),
                      userId: "u2",
                      date: iso(-1).slice(0, 10),
                      hours: 2,
                      comment: "API wiring",
                    },
                  ],
              activity: i.activity?.length
                ? i.activity
                : [
                    {
                      id: rid("ACT"),
                      type: "created",
                      actorId: "u5",
                      at: iso(-7),
                      text: "created this item",
                    },
                    {
                      id: rid("ACT"),
                      type: "assignee",
                      actorId: "u5",
                      at: iso(-6),
                      text: `assigned to ${pick(1)[0].name}`,
                    },
                    {
                      id: rid("ACT"),
                      type: "status",
                      actorId: "u1",
                      at: iso(-4),
                      text: "changed status from Todo to In Progress",
                    },
                    {
                      id: rid("ACT"),
                      type: "comment",
                      actorId: "u5",
                      at: iso(-3),
                      text: "added a comment",
                    },
                    {
                      id: rid("ACT"),
                      type: "attachment",
                      actorId: "u4",
                      at: iso(-4),
                      text: "attached design-spec.png",
                    },
                    {
                      id: rid("ACT"),
                      type: "worklog",
                      actorId: "u1",
                      at: iso(-2),
                      text: "logged 3.5h",
                    },
                  ],
            };
          }),
        })),
    }),
    [store, isLoaded],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useWorkspaceStore() {
  const ctx = useContext(StoreContext);
  if (!ctx)
    throw new Error(
      "useWorkspaceStore must be used within WorkspaceStoreProvider",
    );
  return ctx;
}

export function useWorkspace(code: string) {
  const { store } = useWorkspaceStore();
  return store.workspaces.find((w) => w.code === code);
}

export const ISSUE_TYPE_META: Record<
  IssueType,
  { label: string; color: string; bg: string; icon: string }
> = {
  epic: {
    label: "Epic",
    color: "text-accent-foreground",
    bg: "bg-accent",
    icon: "◆",
  },
  feature: {
    label: "Feature",
    color: "text-primary",
    bg: "bg-primary/15",
    icon: "★",
  },
  story: { label: "Story", color: "text-info", bg: "bg-info/15", icon: "▌" },
  task: {
    label: "Task",
    color: "text-success",
    bg: "bg-success/15",
    icon: "✓",
  },
  bug: {
    label: "Bug",
    color: "text-destructive",
    bg: "bg-destructive/15",
    icon: "🐞",
  },
  spike: {
    label: "Spike",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/15",
    icon: "⚡",
  },
};

export const PRIORITY_META: Record<Priority, { label: string; color: string }> =
  {
    lowest: { label: "Lowest", color: "text-muted-foreground" },
    low: { label: "Low", color: "text-info" },
    medium: { label: "Medium", color: "text-warning" },
    high: { label: "High", color: "text-destructive" },
    highest: { label: "Highest", color: "text-destructive" },
  };

export const LINK_TYPE_META: Record<
  LinkType,
  { label: string; color: string }
> = {
  blocks: { label: "Blocks", color: "text-destructive" },
  blockedBy: { label: "Blocked by", color: "text-warning" },
  relatesTo: { label: "Relates to", color: "text-info" },
  duplicates: { label: "Duplicates", color: "text-muted-foreground" },
};

export const DEFAULT_STATUSES = [
  "Todo",
  "In Progress",
  "In Review",
  "Completed",
];

export function avatarColor(id: string) {
  const colors = [
    "oklch(0.7 0.15 30)",
    "oklch(0.7 0.15 90)",
    "oklch(0.7 0.15 150)",
    "oklch(0.7 0.15 210)",
    "oklch(0.7 0.15 270)",
    "oklch(0.7 0.15 330)",
  ];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return colors[Math.abs(h) % colors.length];
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
