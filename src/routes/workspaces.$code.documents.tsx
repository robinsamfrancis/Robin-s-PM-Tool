import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  File,
  FileSpreadsheet,
  FileVideo,
  FileImage,
  Upload,
  Plus,
  Search,
  ArrowLeft,
  ChevronRight,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Download,
  Link as LinkIcon,
  Tag,
  Clock,
  Eye,
  History,
  X,
  FileUp,
  FolderPlus,
  Filter,
  Check,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import {
  useWorkspace,
  useWorkspaceStore,
  type ProjectDocument,
  type DocumentFolder,
} from "@/lib/workspace-store";
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
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useTaskDetail } from "@/components/task-detail/TaskDetailProvider";

export const Route = createFileRoute("/workspaces/$code/documents")({
  component: DocumentsPage,
});

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

type SortField = "name" | "date" | "type" | "size";
type SortOrder = "asc" | "desc";

function DocumentsPage() {
  const { code } = Route.useParams();
  const workspace = useWorkspace(code);
  const { openTask } = useTaskDetail();
  const {
    store,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    uploadOrUpdateDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    incrementDocumentView,
  } = useWorkspaceStore();

  const userEmail = "robinfrancisadr@gmail.com"; // Current session user

  // Navigation states
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Selection / Modal states
  const [selectedDoc, setSelectedDoc] = useState<ProjectDocument | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateDocModalOpen, setIsCreateDocModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isMoveDocModalOpen, setIsMoveDocModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  // States for custom confirmations (replaces non-working iframe-blocked confirm blocks)
  const [docToDelete, setDocToDelete] = useState<ProjectDocument | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<DocumentFolder | null>(
    null,
  );
  const [pendingTemplateKey, setPendingTemplateKey] = useState<string | null>(
    null,
  );

  // Form states
  const [folderFormName, setFolderFormName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [renameFormValue, setRenameFormValue] = useState("");
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  // New Document Draft state
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState("docx");
  const [newDocContent, setNewDocContent] = useState("");
  const [newDocFolder, setNewDocFolder] = useState<string | null>(null);
  const [newDocTemplate, setNewDocTemplate] = useState("blank");

  // Link association state
  const [linkTargetType, setLinkTargetType] = useState<
    "epic" | "feature" | "story" | "task" | "release"
  >("task");
  const [linkTargetId, setLinkTargetId] = useState("");

  // File drag state inside modal
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedUploadFolder, setSelectedUploadFolder] = useState<
    string | null
  >(null);

  // Fetch relevant entities for linked targets
  const workspaceItems = useMemo(() => {
    return store.items.filter((i) => i.workspaceCode === code);
  }, [store.items, code]);

  const releases = useMemo(() => {
    const raw = workspaceItems
      .map((i) => i.releaseVersion)
      .filter(Boolean) as string[];
    const unique = Array.from(new Set(raw));
    return unique.length > 0 ? unique : ["v1.0", "v1.1", "v2.0"];
  }, [workspaceItems]);

  // Filters workspace level files & folders
  const allFolders = useMemo(() => {
    return (store.folders || []).filter((f) => f.workspaceCode === code);
  }, [store.folders, code]);

  const allDocs = useMemo(() => {
    return (store.documents || []).filter((d) => d.workspaceCode === code);
  }, [store.documents, code]);

  // Breadcrumbs path calculations
  const breadcrumbs = useMemo(() => {
    const path: { id: string | null; name: string }[] = [
      { id: null, name: "Documents" },
    ];
    if (!currentFolderId) return path;

    const buildPath = (fId: string) => {
      const folder = allFolders.find((f) => f.id === fId);
      if (folder) {
        if (folder.parentId) {
          buildPath(folder.parentId);
        }
        path.push({ id: folder.id, name: folder.name });
      }
    };
    buildPath(currentFolderId);
    return path;
  }, [currentFolderId, allFolders]);

  // Drag and Drop uploads handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setUploadedFiles(Array.from(e.target.files));
      }
    },
    [],
  );

  // Upload file execution
  const executeUpload = () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please drag or select a file first");
      return;
    }
    const folderToUse =
      selectedUploadFolder === "current"
        ? currentFolderId
        : selectedUploadFolder;

    uploadedFiles.forEach((file) => {
      const name = file.name;
      const ext = name.split(".").pop()?.toLowerCase() || "txt";
      const size = file.size;

      // Allow real-world FileReader preview for text and images!
      const reader = new FileReader();
      const isText = ["txt", "html", "css", "js", "json", "csv"].includes(ext);
      const isImg = ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext);

      if (isText) {
        reader.onload = (event) => {
          const content = event.target?.result as string;
          uploadOrUpdateDocument(
            code,
            name,
            ext,
            folderToUse,
            size,
            userEmail,
            content,
            [],
          );
        };
        reader.readAsText(file);
      } else if (isImg) {
        reader.onload = (event) => {
          const base64Url = event.target?.result as string;
          uploadOrUpdateDocument(
            code,
            name,
            ext,
            folderToUse,
            size,
            userEmail,
            base64Url,
            [],
          );
        };
        reader.readAsDataURL(file);
      } else {
        // Fallback or binary file simulation
        uploadOrUpdateDocument(
          code,
          name,
          ext,
          folderToUse,
          size,
          userEmail,
          undefined,
          [],
        );
      }
    });

    toast.success(`Successfully processed ${uploadedFiles.length} file(s)`);
    setUploadedFiles([]);
    setIsUploadModalOpen(false);
  };

  // Available unique uploaders for filter dropdown
  const documentOwners = useMemo(() => {
    const owners = allDocs.map((d) => d.createdBy).filter(Boolean);
    return Array.from(new Set(owners));
  }, [allDocs]);

  // Filtering current level items
  const filteredFolders = useMemo(() => {
    return allFolders.filter((f) => {
      if (f.parentId !== currentFolderId) return false;
      if (searchQuery) {
        return f.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [allFolders, currentFolderId, searchQuery]);

  const filteredDocs = useMemo(() => {
    return allDocs.filter((d) => {
      // If we are browsing hierarchy, match current level UNLESS searching has active text
      if (!searchQuery && d.folderId !== currentFolderId) return false;

      // Filter by Search Query
      if (searchQuery) {
        const matchesName = d.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const folderName =
          allFolders.find((f) => f.id === d.folderId)?.name || "";
        const matchesFolder = folderName
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesOwner = d.createdBy
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesType = d.type
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        if (!matchesName && !matchesFolder && !matchesOwner && !matchesType)
          return false;
      }

      // Filter by Type
      if (filterType !== "all") {
        if (filterType === "pdf" && d.type !== "pdf") return false;
        if (
          filterType === "image" &&
          !["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(d.type)
        )
          return false;
        if (
          filterType === "docs" &&
          !["doc", "docx", "txt", "pages"].includes(d.type)
        )
          return false;
        if (filterType === "sheets" && !["xls", "xlsx", "csv"].includes(d.type))
          return false;
      }

      // Filter by Owner/Uploader
      if (filterOwner !== "all" && d.createdBy !== filterOwner) return false;

      return true;
    });
  }, [
    allDocs,
    currentFolderId,
    searchQuery,
    filterType,
    filterOwner,
    allFolders,
  ]);

  // Combined and sorted listing
  const sortedDocs = useMemo(() => {
    const list = [...filteredDocs];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "date") {
        const dateA = a.lastModifiedAt || a.createdAt;
        const dateB = b.lastModifiedAt || b.createdAt;
        comparison = dateA.localeCompare(dateB);
      } else if (sortField === "type") {
        comparison = a.type.localeCompare(b.type);
      } else if (sortField === "size") {
        comparison = a.size - b.size;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return list;
  }, [filteredDocs, sortField, sortOrder]);

  // Folder actions handler
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderFormName.trim()) {
      toast.error("Folder name is required");
      return;
    }
    createFolder({
      workspaceCode: code,
      name: folderFormName.trim(),
      parentId: currentFolderId,
    });
    toast.success(`Created folder "${folderFormName}"`);
    setFolderFormName("");
    setIsFolderModalOpen(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFormValue.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    if (editingFolderId) {
      renameFolder(editingFolderId, renameFormValue.trim());
      toast.success("Folder renamed successfully");
      setEditingFolderId(null);
    } else if (editingDocId) {
      updateDocument(editingDocId, { name: renameFormValue.trim() });
      toast.success("Document renamed successfully");
      setEditingDocId(null);
    }
    setRenameFormValue("");
    setIsRenameModalOpen(false);
  };

  const handleMoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFolderId) {
      // Avoid moving parent into itself or child
      if (targetFolderId === editingFolderId) {
        toast.error("Cannot move a folder inside itself");
        return;
      }
      moveFolder(editingFolderId, targetFolderId);
      toast.success("Folder relocated");
    } else if (editingDocId) {
      updateDocument(editingDocId, { folderId: targetFolderId });
      toast.success("Document relocated");
    }
    setEditingFolderId(null);
    setEditingDocId(null);
    setTargetFolderId(null);
    setIsMoveDocModalOpen(false);
  };

  // Associate a document to Epic/Feature/Story/Task or Release version
  const handleAddLinkAssociation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    if (!linkTargetId) {
      toast.error("Please choose a valid link target");
      return;
    }

    let title = linkTargetId;
    if (linkTargetType !== "release") {
      const item = store.items.find((i) => i.id === linkTargetId);
      title = item ? `[${item.priority}] ${item.title}` : linkTargetId;
    }

    const currentAssociations = selectedDoc.associations || [];
    if (
      currentAssociations.some(
        (a) => a.type === linkTargetType && a.id === linkTargetId,
      )
    ) {
      toast.error("This association already exists");
      return;
    }

    const updated = [
      ...currentAssociations,
      { type: linkTargetType, id: linkTargetId, title },
    ];

    updateDocument(selectedDoc.id, { associations: updated });
    toast.success(`Document linked to ${linkTargetType}`);
    setLinkTargetId("");
    setIsLinkModalOpen(false);

    // Refresh selected doc in view state
    setSelectedDoc({
      ...selectedDoc,
      associations: updated,
    });
  };

  const handleRemoveAssociation = (assoc: { type: string; id: string }) => {
    if (!selectedDoc) return;
    const filtered = (selectedDoc.associations || []).filter(
      (a) => !(a.type === assoc.type && a.id === assoc.id),
    );
    updateDocument(selectedDoc.id, { associations: filtered });
    toast.success("Link removed");
    setSelectedDoc({
      ...selectedDoc,
      associations: filtered,
    });
  };

  // Native Beinex Document Builder (templates handler)
  const getTemplateHtml = (templateKey: string) => {
    if (templateKey === "mom") {
      return `<h1>Minutes of Meeting</h1>
<h2>Meeting Information</h2>
<table class="border-collapse border border-slate-300 dark:border-slate-700 w-full text-xs font-sans text-left my-4 shadow-sm">
  <thead>
    <tr class="bg-muted/50">
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold w-[200px]">Field</th>
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold">Details</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Meeting Title</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Date</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Time</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Location / Platform</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Facilitator</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Participants</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
  </tbody>
</table>

<h2>Agenda</h2>
<ul>
  <li></li>
  <li></li>
  <li></li>
</ul>

<h2>Discussion Summary</h2>
<p><strong>Topic 1</strong></p>
<p></p>
<p><strong>Topic 2</strong></p>
<p></p>
<p><strong>Topic 3</strong></p>
<p></p>

<h2>Decisions Made</h2>
<ul>
  <li>Decision 1</li>
  <li>Decision 2</li>
</ul>

<h2>Action Items</h2>
<table class="border-collapse border border-slate-300 dark:border-slate-700 w-full text-xs font-sans text-left my-4 shadow-sm">
  <thead>
    <tr class="bg-muted/50">
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold">Action Item</th>
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold">Owner</th>
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold">Due Date</th>
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
  </tbody>
</table>

<h2>Risks / Concerns</h2>
<ul>
  <li>Risk 1</li>
  <li>Risk 2</li>
</ul>

<h2>Next Steps</h2>
<ul>
  <li>Next Step 1</li>
  <li>Next Step 2</li>
</ul>`;
    }
    if (templateKey === "release") {
      return `<h1>Release Notes</h1>
<h2>Release Information</h2>
<table class="border-collapse border border-slate-300 dark:border-slate-700 w-full text-xs font-sans text-left my-4 shadow-sm">
  <thead>
    <tr class="bg-muted/50">
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold w-[200px]">Field</th>
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold">Details</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Release Version</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Release Date</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Environment</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Prepared By</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
  </tbody>
</table>

<h2>Release Summary</h2>
<p>Provide a summary of the release.</p>

<h2>New Features</h2>
<ul>
  <li>Feature 1</li>
  <li>Feature 2</li>
</ul>

<h2>Enhancements</h2>
<ul>
  <li>Enhancement 1</li>
  <li>Enhancement 2</li>
</ul>

<h2>Bug Fixes</h2>
<ul>
  <li>Bug Fix 1</li>
  <li>Bug Fix 2</li>
</ul>

<h2>Known Issues</h2>
<ul>
  <li>Issue 1</li>
  <li>Issue 2</li>
</ul>

<h2>Deployment Steps</h2>
<p></p>

<h2>Rollback Plan</h2>
<p></p>

<h2>Additional Notes</h2>
<p></p>`;
    }
    if (templateKey === "stories") {
      return `<h1>Story Specification</h1>
<h2>Story Details</h2>
<table class="border-collapse border border-slate-300 dark:border-slate-700 w-full text-xs font-sans text-left my-4 shadow-sm">
  <thead>
    <tr class="bg-muted/50">
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold w-[200px]">Field</th>
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold">Details</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Story ID</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Story Title</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Epic</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Feature</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Priority</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 font-medium">Story Points</td>
      <td class="border border-slate-300 dark:border-slate-700 p-2"></td>
    </tr>
  </tbody>
</table>

<h2>User Story</h2>
<p>As a __________</p>
<p>I want to __________</p>
<p>So that __________</p>

<h2>Business Value</h2>
<p>Describe the value delivered by this story.</p>

<h2>Scope</h2>
<h3>In Scope</h3>
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
<h3>Out of Scope</h3>
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<h2>Acceptance Criteria</h2>
<ul>
  <li>Criteria 1</li>
  <li>Criteria 2</li>
  <li>Criteria 3</li>
</ul>

<h2>Assumptions</h2>
<ul>
  <li>Assumption 1</li>
  <li>Assumption 2</li>
</ul>

<h2>Dependencies</h2>
<ul>
  <li>Dependency 1</li>
  <li>Dependency 2</li>
</ul>

<h2>UI / UX Requirements</h2>
<p>Describe screens, user interactions, and expected behavior.</p>

<h2>Technical Notes</h2>
<p>Describe implementation considerations.</p>

<h2>Test Scenarios</h2>
<table class="border-collapse border border-slate-300 dark:border-slate-700 w-full text-xs font-sans text-left my-4 shadow-sm">
  <thead>
    <tr class="bg-muted/50">
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold">Scenario</th>
      <th class="border border-slate-300 dark:border-slate-700 p-2 font-semibold">Expected Result</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border border-slate-300 dark:border-slate-700 p-2 text-muted-foreground"></td>
      <td class="border border-slate-300 dark:border-slate-700 p-2 text-muted-foreground"></td>
    </tr>
  </tbody>
</table>`;
    }
    return "";
  };

  const applyTemplate = (templateKey: string) => {
    setNewDocTemplate(templateKey);
    const content = getTemplateHtml(templateKey);
    setNewDocContent(content);

    if (templateKey === "mom") {
      setNewDocName("Minutes of Meeting - " + new Date().toLocaleDateString());
    } else if (templateKey === "stories") {
      setNewDocName("User Story Specification");
    } else if (templateKey === "release") {
      setNewDocName("Release Notes v1.1");
    } else {
      setNewDocName("");
    }
  };

  const handleDocumentTypeChange = (value: string) => {
    const oldTemplateContent = getTemplateHtml(newDocTemplate);
    const isCustomized =
      newDocContent.trim() !== "" &&
      newDocContent.trim() !== oldTemplateContent.trim();

    if (isCustomized) {
      setPendingTemplateKey(value);
    } else {
      applyTemplate(value);
    }
  };

  const handleCreateDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) {
      toast.error("Document name is required");
      return;
    }
    const finalName = newDocName.endsWith(`.${newDocType}`)
      ? newDocName.trim()
      : `${newDocName.trim()}.${newDocType}`;

    createDocument({
      workspaceCode: code,
      name: finalName,
      type: newDocType,
      folderId: newDocFolder || currentFolderId,
      content: newDocContent,
      createdBy: userEmail,
      associations: [],
    });

    toast.success(`Created document "${finalName}"`);
    setNewDocName("");
    setNewDocContent("");
    setNewDocTemplate("blank");
    setIsCreateDocModalOpen(false);
  };

  // Helper to open document preview & increment view counts
  const handleOpenDocDetails = (doc: ProjectDocument) => {
    setSelectedDoc(doc);
    incrementDocumentView(doc.id);
  };

  // Helper to resolve specific icons per file type extension
  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t === "pdf") return <File className="h-5 w-5 text-red-500" />;
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(t)) {
      return <FileImage className="h-5 w-5 text-purple-500" />;
    }
    if (["xls", "xlsx", "csv"].includes(t)) {
      return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
    }
    if (["doc", "docx"].includes(t)) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    if (["ppt", "pptx"].includes(t)) {
      return <BookOpen className="h-5 w-5 text-orange-500" />;
    }
    if (["mp4", "mov", "avi"].includes(t)) {
      return <FileVideo className="h-5 w-5 text-pink-500" />;
    }
    return <FileText className="h-5 w-5 text-slate-500" />;
  };

  // Render Folder list as explorer view
  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 lg:px-8 py-6 space-y-6"
      id="documents-module-root"
    >
      {/* Overview stats bar & Action buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Documents Repository
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize, upload, preview, version and associate project
            deliverables and team stories.
          </p>
        </div>

        {/* Master Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-dashed"
            onClick={() => {
              setEditingFolderId(null);
              setFolderFormName("");
              setIsFolderModalOpen(true);
            }}
          >
            <FolderPlus className="h-3.5 w-3.5 text-primary" /> New Folder
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-dashed"
            onClick={() => {
              setSelectedUploadFolder("current");
              setUploadedFiles([]);
              setIsUploadModalOpen(true);
            }}
          >
            <Upload className="h-3.5 w-3.5 text-primary" /> Upload File
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-sm shadow-primary/20"
            onClick={() => {
              setNewDocName("");
              setNewDocContent("");
              setNewDocFolder(currentFolderId);
              applyTemplate("blank");
              setIsCreateDocModalOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Create Document
          </Button>
        </div>
      </div>

      {/* Main File Explorer Container */}
      <div className="space-y-4">
        {/* Breadcrumb Navigation Line & Current level descriptor */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-2.5 rounded-xl border border-border/40">
          <div className="flex items-center flex-wrap gap-1.5 text-xs">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <div
                  key={crumb.id || "root"}
                  className="flex items-center gap-1.5"
                >
                  {i > 0 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                  <button
                    className={cn(
                      "font-medium transition-colors hover:text-primary",
                      isLast
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground",
                    )}
                    onClick={() => setCurrentFolderId(crumb.id)}
                  >
                    {crumb.name}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            {filteredFolders.length} Folders · {filteredDocs.length} Files
          </div>
        </div>

        {/* Filters, Search Inputs & Sorting Actions */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Quick Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, folder tag, owner..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap gap-2">
            {/* Owner Filter */}
            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Uploaded By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Owner</SelectItem>
                {documentOwners.map((owner) => (
                  <SelectItem key={owner} value={owner}>
                    {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Document Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All File Types</SelectItem>
                <SelectItem value="pdf">PDF Documents</SelectItem>
                <SelectItem value="image">Graphic / Image</SelectItem>
                <SelectItem value="docs">Text & Word (.docx)</SelectItem>
                <SelectItem value="sheets">Spreadsheets (.xlsx)</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Query Trigger */}
            {(searchQuery || filterType !== "all" || filterOwner !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-primary"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                  setFilterOwner("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Explorer Layout (Empty state / folders list / files spreadsheet) */}
        {filteredFolders.length === 0 && sortedDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border py-16 bg-muted/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">
              No documents have been uploaded yet
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Keep requirement specs, design files, retrospect outcomes, and
              Release MOM records consolidated.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setEditingFolderId(null);
                  setFolderFormName("");
                  setIsFolderModalOpen(true);
                }}
              >
                <FolderPlus className="h-3.5 w-3.5 text-primary" /> Create
                Folder
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-sm shadow-primary/20"
                onClick={() => {
                  setSelectedUploadFolder("current");
                  setIsUploadModalOpen(true);
                }}
              >
                <Upload className="h-3.5 w-3.5" /> Upload File
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Directory Folders GRID */}
            {filteredFolders.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Folders
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="group flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/10 hover:border-primary/40 cursor-pointer shadow-sm transition-all"
                      onClick={() => setCurrentFolderId(folder.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
                          <Folder className="h-5 w-5 fill-current" />
                        </div>
                        <div className="text-left min-w-0">
                          <p
                            className="text-xs font-medium text-foreground truncate max-w-[130px]"
                            title={folder.name}
                          >
                            {folder.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Created{" "}
                            {new Date(folder.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Folder Action triggers */}
                      <div
                        className="flex"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          title="Rename Folder"
                          className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                          onClick={() => {
                            setEditingFolderId(folder.id);
                            setRenameFormValue(folder.name);
                            setIsRenameModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          title="Delete Folder & items"
                          className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted"
                          onClick={() => {
                            setFolderToDelete(folder);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Files Grid / Spreadsheet rows */}
            {sortedDocs.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Documents / Files
                  </h3>

                  {/* Native Column headers sorting handles */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="hidden sm:inline">Sort:</span>
                    <button
                      className={cn(
                        "hover:text-foreground transition-colors",
                        sortField === "name" && "text-primary font-medium",
                      )}
                      onClick={() => {
                        if (sortField === "name")
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        else {
                          setSortField("name");
                          setSortOrder("asc");
                        }
                      }}
                    >
                      Name{" "}
                      {sortField === "name" &&
                        (sortOrder === "asc" ? "▲" : "▼")}
                    </button>
                    <button
                      className={cn(
                        "hover:text-foreground transition-colors",
                        sortField === "date" && "text-primary font-medium",
                      )}
                      onClick={() => {
                        if (sortField === "date")
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        else {
                          setSortField("date");
                          setSortOrder("asc");
                        }
                      }}
                    >
                      Date{" "}
                      {sortField === "date" &&
                        (sortOrder === "asc" ? "▲" : "▼")}
                    </button>
                  </div>
                </div>

                {/* Spreadsheet Listing */}
                <div className="border border-border/80 rounded-xl overflow-hidden bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/60 text-xs text-muted-foreground font-semibold">
                          <th className="p-3">Name</th>
                          <th className="p-3">Type</th>
                          <th className="p-3 hidden sm:table-cell">
                            Container Folder
                          </th>
                          <th className="p-3 hidden md:table-cell">
                            Created By
                          </th>
                          <th className="p-3 hidden lg:table-cell">
                            Last Mod Date
                          </th>
                          <th className="p-3 text-center">Version</th>
                          <th className="p-3 text-center">Links</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-xs text-foreground">
                        {sortedDocs.map((doc) => {
                          const folderObj = allFolders.find(
                            (f) => f.id === doc.folderId,
                          );
                          const lastModified =
                            doc.lastModifiedAt || doc.createdAt;
                          const formattedDate =
                            new Date(lastModified).toLocaleDateString() +
                            " " +
                            new Date(lastModified).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                          const linksCount = doc.associations?.length || 0;

                          return (
                            <tr
                              key={doc.id}
                              className="hover:bg-muted/10 group cursor-pointer transition-colors"
                              onClick={() => handleOpenDocDetails(doc)}
                            >
                              <td className="p-3 font-medium text-foreground">
                                <div className="flex items-center gap-2 max-w-[200px] sm:max-w-xs md:max-w-md truncate">
                                  {getFileIcon(doc.type)}
                                  <span
                                    className="truncate group-hover:text-primary transition-colors"
                                    title={doc.name}
                                  >
                                    {doc.name}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-muted-foreground uppercase font-mono tracking-wider text-[10px]">
                                {doc.type}
                              </td>
                              <td className="p-3 hidden sm:table-cell text-muted-foreground truncate max-w-[120px]">
                                {folderObj ? folderObj.name : "—"}
                              </td>
                              <td className="p-3 hidden md:table-cell text-muted-foreground truncate max-w-[150px]">
                                {doc.createdBy}
                              </td>
                              <td className="p-3 hidden lg:table-cell text-muted-foreground">
                                {formattedDate}
                              </td>
                              <td className="p-3 text-center">
                                <Badge
                                  variant="outline"
                                  className="font-mono bg-muted/60 text-[10px] scale-90"
                                >
                                  v{doc.versions?.length || 1}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                {linksCount > 0 ? (
                                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-semibold">
                                    {linksCount} link{linksCount > 1 ? "s" : ""}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground/40 text-[10px]">
                                    —
                                  </span>
                                )}
                              </td>
                              <td
                                className="p-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Quick Download link trigger */}
                                  <a
                                    href={
                                      doc.versions[doc.versions.length - 1]
                                        ?.url || "#"
                                    }
                                    title="Download File"
                                    download={doc.name}
                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    onClick={() => {
                                      toast.success(
                                        `Downloading file "${doc.name}"...`,
                                      );
                                    }}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>

                                  {/* Quick Link item trigger */}
                                  <button
                                    title="Link to backlog item"
                                    className="p-1 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
                                    onClick={() => {
                                      setSelectedDoc(doc);
                                      setLinkTargetId("");
                                      setLinkTargetType("task");
                                      setIsLinkModalOpen(true);
                                    }}
                                  >
                                    <LinkIcon className="h-3.5 w-3.5" />
                                  </button>

                                  {/* File rename */}
                                  <button
                                    title="Rename File"
                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    onClick={() => {
                                      setEditingDocId(doc.id);
                                      setEditingFolderId(null);
                                      setRenameFormValue(doc.name);
                                      setIsRenameModalOpen(true);
                                    }}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>

                                  {/* File relocator */}
                                  <button
                                    title="Move Folder/File"
                                    className="p-1 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
                                    onClick={() => {
                                      setEditingDocId(doc.id);
                                      setEditingFolderId(null);
                                      setTargetFolderId(doc.folderId);
                                      setIsMoveDocModalOpen(true);
                                    }}
                                  >
                                    <FileUp className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    title="Delete document"
                                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-muted rounded transition-colors"
                                    onClick={() => {
                                      setDocToDelete(doc);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DOCUMENT PREVIEW DRAWER (SelectedDoc) */}
      {selectedDoc && (
        <div
          className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl border-l border-border bg-card shadow-2xl overflow-y-auto"
          id="document-preview-drawer"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/10 sticky top-0 z-10 backdrop-blur">
            <div className="flex items-center gap-2 min-w-0">
              {getFileIcon(selectedDoc.type)}
              <h3
                className="font-semibold text-sm text-foreground truncate max-w-[200px]"
                title={selectedDoc.name}
              >
                {selectedDoc.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick actions inside drawer */}
              <a
                href={
                  selectedDoc.versions[selectedDoc.versions.length - 1]?.url ||
                  "#"
                }
                download={selectedDoc.name}
                className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg bg-primary hover:bg-primary/95 text-xs text-primary-foreground font-medium transition-colors"
                onClick={() =>
                  toast.success(
                    `Downloading latest version of ${selectedDoc.name}`,
                  )
                }
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
              <button
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                onClick={() => setSelectedDoc(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* INLINE PREVIEW BLOCK for images, text files, and custom notes drafts */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Document Preview
              </h4>

              {selectedDoc.content ? (
                <div
                  className="rounded-xl border border-border bg-card p-6 max-h-[400px] overflow-y-auto leading-relaxed text-foreground text-sm prose prose-slate dark:prose-invert max-w-none shadow-inner"
                  dangerouslySetInnerHTML={{ __html: selectedDoc.content }}
                />
              ) : ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(
                  selectedDoc.type.toLowerCase(),
                ) ? (
                <div className="rounded-xl border border-border overflow-hidden bg-muted/40 aspect-video flex items-center justify-center relative">
                  <img
                    src={
                      selectedDoc.versions[selectedDoc.versions.length - 1]
                        ?.url ||
                      `https://picsum.photos/seed/${selectedDoc.id}/600/400`
                    }
                    alt={selectedDoc.name}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : selectedDoc.type.toLowerCase() === "pdf" ? (
                <div className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col items-center justify-center text-center gap-3">
                  <div className="h-10 w-10 text-red-500 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-foreground">
                      Portable Document Spec (PDF)
                    </h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Preview available on local reader. Launch fully integrated
                      client view.
                    </p>
                  </div>
                  <a
                    href={
                      selectedDoc.versions[selectedDoc.versions.length - 1]
                        ?.url === "#"
                        ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
                        : selectedDoc.versions[selectedDoc.versions.length - 1]
                            ?.url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    onClick={() => incrementDocumentView(selectedDoc.id)}
                  >
                    <ExternalLink className="h-3 w-3" /> External Preview
                  </a>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 flex flex-col items-center justify-center text-center gap-2">
                  <File className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h5 className="text-xs font-semibold text-foreground">
                      Preview cannot be generated inline
                    </h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Binary format .{selectedDoc.type}. Download this
                      deliverable file to view on your device.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* METADATA BLOCK */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Document Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Uploaded By</p>
                  <p className="font-medium text-foreground mt-0.5 truncate">
                    {selectedDoc.createdBy}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uploaded Date</p>
                  <p className="font-medium text-foreground mt-0.5">
                    {new Date(selectedDoc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Modified By</p>
                  <p className="font-medium text-foreground mt-0.5 truncate">
                    {selectedDoc.lastModifiedBy || selectedDoc.createdBy}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Modified Date</p>
                  <p className="font-medium text-foreground mt-0.5">
                    {selectedDoc.lastModifiedAt
                      ? new Date(
                          selectedDoc.lastModifiedAt,
                        ).toLocaleDateString()
                      : new Date(selectedDoc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Version Number</p>
                  <div className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="font-mono bg-muted text-[10px] scale-90"
                    >
                      v{selectedDoc.versions.length}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* ASSOCIATIONS / LINKED BOARD ITEMS */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" /> Connected
                  Artifacts
                </h4>
                <Button
                  size="xs"
                  variant="ghost"
                  className="h-6 px-1.5 text-[11px] text-primary"
                  onClick={() => {
                    setLinkTargetId("");
                    setLinkTargetType("task");
                    setIsLinkModalOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-0.5" /> Link Item
                </Button>
              </div>

              {(selectedDoc.associations || []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center bg-muted/20 rounded-lg">
                  This document is not linked to any Epics, Stories, Features,
                  or Releases yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(selectedDoc.associations || []).map((assoc) => (
                    <div
                      key={`${assoc.type}-${assoc.id}`}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg bg-muted/35 border border-border/40 text-xs",
                        assoc.type !== "release" &&
                          "cursor-pointer hover:bg-muted/70 transition-colors",
                      )}
                      onClick={() => {
                        if (assoc.type !== "release") {
                          openTask(assoc.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="secondary"
                          className="text-[10px] capitalize bg-primary/10 text-primary border-none"
                        >
                          {assoc.type}
                        </Badge>
                        <span
                          className={cn(
                            "font-medium truncate max-w-[240px]",
                            assoc.type !== "release"
                              ? "text-primary hover:underline hover:text-indigo-600 dark:hover:text-indigo-400"
                              : "text-foreground",
                          )}
                          title={assoc.title}
                        >
                          {assoc.title}
                        </span>
                      </div>
                      <button
                        title="Remove Link"
                        className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAssociation(assoc);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VERSION TIMELINE HISTORY */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-indigo-500" /> Complete
                Version History
              </h4>
              <div className="relative border-l-2 border-border/80 pl-4 space-y-4 ml-2">
                {[...selectedDoc.versions].reverse().map((ver, i) => {
                  const isLatest = i === 0;
                  return (
                    <div key={ver.version} className="relative">
                      {/* Node point */}
                      <span
                        className={cn(
                          "absolute -left-[21px] top-1 flex h-2 w-2 rounded-full",
                          isLatest
                            ? "bg-primary ring-4 ring-primary/25"
                            : "bg-muted-foreground/60",
                        )}
                      />
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            Version {ver.version}
                          </span>
                          {isLatest && (
                            <Badge className="bg-success text-success-foreground text-[9px] px-1 h-3.5">
                              Latest
                            </Badge>
                          )}

                          {/* Historical version downloader */}
                          <a
                            href={ver.url || "#"}
                            download={ver.name}
                            className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                            onClick={() =>
                              toast.success(
                                `Downloading historical version ${ver.version}`,
                              )
                            }
                          >
                            <Download className="h-3 w-3" /> Get
                          </a>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {ver.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          By{" "}
                          <span className="font-medium text-muted-foreground">
                            {ver.uploadedBy}
                          </span>{" "}
                          on {new Date(ver.uploadedAt).toLocaleDateString()}{" "}
                          {new Date(ver.uploadedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE DIRECTORY FOLDER */}
      {isFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          id="create-folder-modal"
        >
          <form
            onSubmit={handleCreateFolder}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-100"
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-orange-500" /> Create
                Directory Folder
              </h3>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1"
                onClick={() => setIsFolderModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Folder Name
              </label>
              <Input
                required
                className="h-9 text-xs"
                placeholder="e.g. Sprint Specifications, Architecture Mocks"
                value={folderFormName}
                onChange={(e) => setFolderFormName(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Created folder will be nested inside{" "}
                {breadcrumbs[breadcrumbs.length - 1].name}.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsFolderModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-gradient-primary">
                Create Folder
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: UPLOAD FILE WITH VERSIONING */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          id="upload-file-modal"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-100">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <FileUp className="h-4 w-4 text-primary" /> Upload Project
                Deliverables
              </h3>
              <button
                title="Close"
                type="button"
                className="text-muted-foreground hover:text-foreground p-1"
                onClick={() => setIsUploadModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Upload Folder Picker dropdown */}
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-muted-foreground">
                Target Directory Folder
              </label>
              <Select
                value={
                  selectedUploadFolder === null ? "root" : selectedUploadFolder
                }
                onValueChange={(val) =>
                  setSelectedUploadFolder(val === "root" ? null : val)
                }
              >
                <SelectTrigger className="w-full h-8 text-xs mt-1">
                  <SelectValue placeholder="Choose Folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">📁 Documents (Root)</SelectItem>
                  {allFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      📁 {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Drag Zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors space-y-2",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
                uploadedFiles.length > 0 &&
                  "border-emerald-500/60 bg-emerald-500/5",
              )}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() =>
                document.getElementById("file-upload-input")?.click()
              }
            >
              <input
                id="file-upload-input"
                type="file"
                multiple
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                onChange={handleFileChange}
              />

              <div className="flex justify-center">
                <Upload
                  className={cn(
                    "h-8 w-8 text-muted-foreground",
                    uploadedFiles.length > 0 &&
                      "text-emerald-500 animate-bounce",
                  )}
                />
              </div>

              {uploadedFiles.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">
                    Selected {uploadedFiles.length} file(s)
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate w-full max-w-[280px] mx-auto">
                    {uploadedFiles.map((f) => f.name).join(", ")}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">
                    Drag files here, or click to browse
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, PNG, JPG, JPEG,
                    CSV
                  </p>
                </div>
              )}
            </div>

            <div className="text-[11px] bg-muted/60 p-2.5 rounded-lg text-muted-foreground leading-normal">
              💡 **Duplicate protection enabled:** If you upload a file with an
              already existing name inside the target folder, Beinex will create
              a new incremental version record on the history timeline
              automatically. No overwrite loss!
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsUploadModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-gradient-primary text-primary-foreground font-semibold"
                onClick={executeUpload}
                disabled={uploadedFiles.length === 0}
              >
                Upload File(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RENAME FILE / FOLDER (Form values) */}
      {isRenameModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          id="rename-modal"
        >
          <form
            onSubmit={handleRenameSubmit}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-100"
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5 animate-pulse">
                <Edit2 className="h-4 w-4 text-amber-500" /> Rename Item
              </h3>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1"
                onClick={() => setIsRenameModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                New Title / Filename
              </label>
              <Input
                required
                className="h-9 text-xs"
                placeholder="Input new title"
                value={renameFormValue}
                onChange={(e) => setRenameFormValue(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsRenameModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-gradient-primary">
                Save Rename
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: RELOCATE FILE / FOLDER */}
      {isMoveDocModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          id="relocate-element-modal"
        >
          <form
            onSubmit={handleMoveSubmit}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-100"
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <FileUp className="h-4 w-4 text-violet-500" /> Move Directory
                Item
              </h3>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1"
                onClick={() => setIsMoveDocModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-muted-foreground">
                Select Destination Folder
              </label>
              <Select
                value={targetFolderId === null ? "root" : targetFolderId}
                onValueChange={(val) =>
                  setTargetFolderId(val === "root" ? null : val)
                }
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Choose Target Folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    📁 Library Root (Documents)
                  </SelectItem>
                  {allFolders
                    .filter((f) => f.id !== editingFolderId) // exclude self folder to prevent loop loops
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        📁 {f.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsMoveDocModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-gradient-primary">
                Relocate Item
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: CONNECT / ASSOCIATE REPOSITORY */}
      {isLinkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          id="associate-artifact-modal"
        >
          <form
            onSubmit={handleAddLinkAssociation}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-100"
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4 text-primary" /> Connect Project
                deliverables
              </h3>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1"
                onClick={() => setIsLinkModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Step 1: Type Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">
                  Destination Artifact Type
                </label>
                <Select
                  value={linkTargetType}
                  onValueChange={(
                    val: "epic" | "feature" | "story" | "task" | "release",
                  ) => {
                    setLinkTargetType(val);
                    setLinkTargetId("");
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="story">User Story</SelectItem>
                    <SelectItem value="task">Sub-Task</SelectItem>
                    <SelectItem value="release">Release Version</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Target Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">
                  Select Target
                </label>
                {linkTargetType === "release" ? (
                  <Select value={linkTargetId} onValueChange={setLinkTargetId}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Choose Release" />
                    </SelectTrigger>
                    <SelectContent>
                      {releases.map((rel) => (
                        <SelectItem key={rel} value={rel}>
                          Release {rel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={linkTargetId} onValueChange={setLinkTargetId}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue
                        placeholder={`Select ${linkTargetType}...`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaceItems
                        .filter((i) => i.type === linkTargetType)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            [{item.id}] {item.title.slice(0, 45)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsLinkModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-gradient-primary">
                Confirm Association
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 6: NATIVE BEINEX DOCUMENT BUILDER */}
      {isCreateDocModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-hidden"
          id="native-doc-builder-modal"
        >
          <form
            onSubmit={handleCreateDocSubmit}
            className="w-full max-w-4xl h-[85vh] max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in duration-200 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border p-6 pb-4 flex-shrink-0">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-500" /> Create
                Platform Document
              </h3>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1"
                onClick={() => setIsCreateDocModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Document Metadata Form Fields in solid 3-column row */}
            <div className="p-6 py-4 border-b border-border/50 bg-muted/5 flex-shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 text-xs">
                <label className="font-semibold text-muted-foreground">
                  Document Type
                </label>
                <Select
                  value={newDocTemplate}
                  onValueChange={handleDocumentTypeChange}
                >
                  <SelectTrigger className="w-full h-8.5 text-xs">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">
                      📝 General / Blank Document
                    </SelectItem>
                    <SelectItem value="mom">
                      💼 MOM (Minutes of Meeting)
                    </SelectItem>
                    <SelectItem value="release">📢 Release Notes</SelectItem>
                    <SelectItem value="stories">
                      📂 User Story / Story Specification
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Document Title</span>
                  <span className="text-[10px] text-muted-foreground bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded font-mono font-medium">
                    .docx only
                  </span>
                </label>
                <Input
                  required
                  className="h-8.5 text-xs"
                  placeholder="e.g. Sprint 14 Planning Minutes"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-semibold text-muted-foreground">
                  Target Directory Folder
                </label>
                <Select
                  value={newDocFolder === null ? "root" : newDocFolder}
                  onValueChange={(val) =>
                    setNewDocFolder(val === "root" ? null : val)
                  }
                >
                  <SelectTrigger className="w-full h-8.5 text-xs">
                    <SelectValue placeholder="Choose Folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">
                      📁 Library Root (Documents)
                    </SelectItem>
                    {allFolders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        📁 {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Editor Area taking full remaining space */}
            <div className="flex-1 flex flex-col min-h-0 p-6 pt-3 pb-4 space-y-1.5">
              <label className="font-semibold text-xs text-muted-foreground flex-shrink-0">
                Document Editor & Composer
              </label>
              <RichTextEditor
                placeholder="Compose your project document here..."
                value={newDocContent}
                onChange={setNewDocContent}
              />
            </div>

            <div className="flex justify-end gap-2 p-6 py-4 border-t border-border bg-muted/5 flex-shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateDocModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-gradient-primary">
                Save Draft Document
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODALS (iframe safe) */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2 text-destructive">
              ⚠️ Delete Document?
            </h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete file{" "}
              <strong className="text-foreground">"{docToDelete.name}"</strong>?
              This will erase all its version records. This action is
              irreversible.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDocToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  deleteDocument(docToDelete.id);
                  if (selectedDoc?.id === docToDelete.id) {
                    setSelectedDoc(null);
                  }
                  toast.info(`Erasure complete for "${docToDelete.name}"`);
                  setDocToDelete(null);
                }}
              >
                Delete File
              </Button>
            </div>
          </div>
        </div>
      )}

      {folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2 text-destructive">
              ⚠️ Delete Folder & Nested Items?
            </h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete folder{" "}
              <strong className="text-foreground">
                "{folderToDelete.name}"
              </strong>{" "}
              and all nested documents? This action is irreversible.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFolderToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  deleteFolder(folderToDelete.id);
                  if (currentFolderId === folderToDelete.id) {
                    setCurrentFolderId(null);
                  }
                  toast.info(`Deleted folder "${folderToDelete.name}"`);
                  setFolderToDelete(null);
                }}
              >
                Delete Folder
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingTemplateKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2 text-amber-500">
              ⚠️ Change Document Type?
            </h3>
            <p className="text-sm text-muted-foreground">
              Changing the document type will replace your current editor
              content. Unsaved changes will be lost. Do you want to proceed?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPendingTemplateKey(null)}
              >
                Go Back
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => {
                  applyTemplate(pendingTemplateKey);
                  setPendingTemplateKey(null);
                }}
              >
                Replace Content
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
