import React, { useRef, useState, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Superscript,
  Subscript,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Table,
  Link as LinkIcon,
  Image as ImageIcon,
  Paperclip,
  Share2,
  Palette,
  Highlighter,
  Minus,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface WorkspaceItemReference {
  id: string;
  code: string;
  title: string;
  type: "epic" | "feature" | "story" | "task" | "bug" | "release";
  status: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Compose your rich project document here...",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync state into contentEditable only on initial load or if the value is different (to avoid cursor jump)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleEditorChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    handleEditorChange();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const insertHTML = (html: string) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const el = document.createElement("div");
    el.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node;
    let lastNode;
    while ((node = el.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    handleEditorChange();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const insertTable = (rows: number = 3, cols: number = 3) => {
    let tableHTML = `<table class="border-collapse border border-border w-full text-xs font-sans text-left my-4 shadow-sm rounded-lg overflow-hidden">`;
    tableHTML += "<thead><tr class='bg-muted/50'>";
    for (let c = 0; c < cols; c++) {
      tableHTML += `<th class="border border-border p-2.5 font-semibold text-foreground uppercase tracking-wider bg-muted/60">Header ${c + 1}</th>`;
    }
    tableHTML += "</tr></thead><tbody>";
    for (let r = 0; r < rows; r++) {
      tableHTML += "<tr>";
      for (let c = 0; c < cols; c++) {
        tableHTML += `<td class="border border-border p-2.5 text-muted-foreground">Cell Data</td>`;
      }
      tableHTML += "</tr>";
    }
    tableHTML += "</tbody></table>";
    insertHTML(tableHTML);
  };

  const getSelectedCellAndTable = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return { cell: null, table: null };
    let node: Node | null = selection.getRangeAt(0).startContainer;
    let cell: HTMLTableCellElement | null = null;
    let table: HTMLTableElement | null = null;

    while (node && node !== document.body) {
      if (node.nodeName === "TD" || node.nodeName === "TH") {
        cell = node as HTMLTableCellElement;
      }
      if (node.nodeName === "TABLE") {
        table = node as HTMLTableElement;
        break;
      }
      node = node.parentNode;
    }
    return { cell, table };
  };

  const handleAddRow = () => {
    const { cell, table } = getSelectedCellAndTable();
    if (cell && table) {
      const row = cell.parentElement as HTMLTableRowElement;
      const newRow = table.insertRow(row.rowIndex + 1);
      for (let i = 0; i < row.cells.length; i++) {
        const newCell = newRow.insertCell(i);
        newCell.className = "border border-border p-2.5 text-muted-foreground";
        newCell.innerHTML = "New cell";
      }
      handleEditorChange();
    }
  };

  const handleDeleteRow = () => {
    const { cell, table } = getSelectedCellAndTable();
    if (cell && table) {
      const row = cell.parentElement as HTMLTableRowElement;
      if (table.rows.length > 1) {
        table.deleteRow(row.rowIndex);
        handleEditorChange();
      }
    }
  };

  const handleAddColumn = () => {
    const { cell, table } = getSelectedCellAndTable();
    if (cell && table) {
      const cellIndex = cell.cellIndex;
      for (let i = 0; i < table.rows.length; i++) {
        const r = table.rows[i];
        const isHeader = r.cells[0]?.tagName === "TH";
        const newCell = isHeader
          ? document.createElement("th")
          : document.createElement("td");
        newCell.className = isHeader
          ? "border border-border p-2.5 font-semibold text-foreground uppercase tracking-wider bg-muted/60"
          : "border border-border p-2.5 text-muted-foreground";
        newCell.innerHTML = isHeader ? `Header` : "New cell";

        if (cellIndex + 1 < r.cells.length) {
          r.insertBefore(newCell, r.cells[cellIndex + 1]);
        } else {
          r.appendChild(newCell);
        }
      }
      handleEditorChange();
    }
  };

  const handleDeleteColumn = () => {
    const { cell, table } = getSelectedCellAndTable();
    if (cell && table) {
      const cellIndex = cell.cellIndex;
      for (let i = 0; i < table.rows.length; i++) {
        const r = table.rows[i];
        if (r.cells.length > 1) {
          r.deleteCell(cellIndex);
        }
      }
      handleEditorChange();
    }
  };

  const handleMergeColumnSpan = () => {
    const { cell, table } = getSelectedCellAndTable();
    if (cell && table) {
      const currentSpan = cell.colSpan || 1;
      // Toggle or increment
      cell.colSpan = currentSpan + 1;
      handleEditorChange();
    }
  };

  const handleInsertChecklist = () => {
    const html = `
      <div class="flex items-start gap-2.5 my-2" contenteditable="false">
        <input type="checkbox" class="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 transition-colors cursor-pointer" />
        <span contenteditable="true" class="flex-1 outline-none text-sm text-foreground">Write checklist item here...</span>
      </div>
    `;
    insertHTML(html);
  };

  const handleInsertCallout = () => {
    const html = `
      <div class="p-3.5 my-3 bg-primary/10 border-l-4 border-primary rounded-r-xl flex gap-3 items-start" contenteditable="true">
        <span class="text-primary text-base select-none pointer-events-none" contenteditable="false">💡</span>
        <div class="flex-1 outline-none text-sm text-foreground">
          <strong>Important Note:</strong> Type informative callout or secondary highlight context here...
        </div>
      </div>
    `;
    insertHTML(html);
  };

  const handleInsertBlockquote = () => {
    const html = `
      <blockquote class="border-l-4 border-muted-foreground/30 pl-4 py-1.5 my-3 italic text-muted-foreground text-sm" contenteditable="true">
        "Paste or compose your quote reference here..."
      </blockquote>
    `;
    insertHTML(html);
  };

  const handleInsertCodeblock = () => {
    const html = `
      <pre class="bg-muted/80 px-4 py-3 rounded-xl font-mono text-xs my-3 border border-border/80 overflow-x-auto text-foreground" contenteditable="true"><code>// Type / paste code snippet draft...</code></pre>
    `;
    insertHTML(html);
  };

  const handleInsertLink = () => {
    const url = prompt("Enter hyperlink URL (e.g. https://google.com):");
    if (url) {
      const secureUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      executeCommand("createLink", secureUrl);
    }
  };

  const handleInsertDivider = () => {
    insertHTML('<hr class="my-5 border-t border-border/70" />');
  };

  const handleInsertImage = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          insertHTML(
            `<div class="my-4 inline-block"><img src="${base64}" alt="${file.name}" class="max-w-full md:max-w-xl h-auto rounded-xl border border-border/60 shadow-md" /><p class="text-[10px] text-muted-foreground mt-1 text-center font-sans italic">${file.name}</p></div>`,
          );
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  };

  const handleInsertAttachment = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          insertHTML(`
            <a href="${base64}" download="${file.name}" class="inline-flex items-center gap-3 p-3 my-2.5 rounded-xl border border-dashed border-border/80 bg-muted/20 hover:bg-muted/40 text-primary font-medium text-xs no-underline hover:no-underline select-none" target="_blank" contenteditable="false">
              <span class="text-lg">📎</span>
              <div class="text-left">
                <div class="font-semibold text-foreground truncate max-w-[200px]">${file.name}</div>
                <div class="text-[10px] text-muted-foreground">${(file.size / 1024).toFixed(1)} KB</div>
              </div>
            </a>
          `);
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  };

  const colors = [
    { name: "Slate Dark", value: "#0f172a" },
    { name: "Accent Blue", value: "#2563eb" },
    { name: "Emerald Green", value: "#059669" },
    { name: "Bright Amber", value: "#d97706" },
    { name: "Crimson Rose", value: "#e11d48" },
    { name: "Indigo Purple", value: "#4f46e5" },
  ];

  const highlights = [
    { name: "No Highlight", value: "transparent" },
    { name: "Light Blue", value: "#eff6ff" },
    { name: "Light Green", value: "#ecfdf5" },
    { name: "Light Yellow", value: "#fef3c7" },
    { name: "Light Red", value: "#fff1f2" },
    { name: "Light Gray", value: "#f8fafc" },
  ];

  return (
    <div
      className={`rounded-2xl border transition-all flex flex-col overflow-hidden bg-card ${
        isFocused
          ? "border-primary/60 ring-2 ring-primary/10 shadow-lg"
          : "border-border shadow-sm"
      }`}
    >
      {/* RICH TOOLBAR CONTAINER */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/40 border-b border-border/70 select-none">
        {/* TEXT DECORATIONS SECTION */}
        <div className="flex items-center gap-0.5 border-r border-border/80 pr-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Bold"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("bold");
            }}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Italic"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("italic");
            }}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Underline"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("underline");
            }}
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Strikethrough"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("strikeThrough");
            }}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground px-0"
            title="Superscript"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("superscript");
            }}
          >
            <Superscript className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground px-0"
            title="Subscript"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("subscript");
            }}
          >
            <Subscript className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* HEADINGS DROPDOWN */}
        <div className="flex items-center gap-0.5 border-r border-border/80 pr-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 font-medium text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                Style <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[160px]">
              <DropdownMenuItem
                onSelect={() => executeCommand("formatBlock", "<h1>")}
                className="font-bold text-base flex items-center gap-1.5"
              >
                <Heading1 className="h-4 w-4 shrink-0" /> Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => executeCommand("formatBlock", "<h2>")}
                className="font-semibold text-sm flex items-center gap-1.5"
              >
                <Heading2 className="h-4 w-4 shrink-0" /> Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => executeCommand("formatBlock", "<h3>")}
                className="font-semibold text-xs flex items-center gap-1.5"
              >
                <Heading3 className="h-4 w-4 shrink-0" /> Heading 3
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => executeCommand("formatBlock", "<h4>")}
                className="font-medium text-xs flex items-center gap-1.5"
              >
                <Heading4 className="h-4 w-4 shrink-0" /> Heading 4
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => executeCommand("formatBlock", "<p>")}
                className="text-xs flex items-center gap-1.5"
              >
                Normal Paragraph
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ALIGNMENTS SECTION */}
        <div className="flex items-center gap-0.5 border-r border-border/80 pr-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Align Left"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("justifyLeft");
            }}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Align Center"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("justifyCenter");
            }}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Align Right"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("justifyRight");
            }}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Justify"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("justifyFull");
            }}
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>

        {/* LISTS SECTION */}
        <div className="flex items-center gap-0.5 border-r border-border/80 pr-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Bullet List"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("insertUnorderedList");
            }}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Numbered List"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("insertOrderedList");
            }}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Add Checkbox List"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertChecklist();
            }}
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
        </div>

        {/* COLORS SECTION */}
        <div className="flex items-center gap-0.5 border-r border-border/80 pr-1.5">
          {/* Text Color Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Text Color"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[140px] p-1">
              <div className="p-1 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Text Colors
              </div>
              {colors.map((c) => (
                <DropdownMenuItem
                  key={c.value}
                  onSelect={() => executeCommand("foreColor", c.value)}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <div
                    className="h-3.5 w-3.5 rounded border border-border shrink-0"
                    style={{ backgroundColor: c.value }}
                  />
                  <span>{c.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Highlight Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Text Highlight"
              >
                <Highlighter className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[140px] p-1">
              <div className="p-1 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Highlight Colors
              </div>
              {highlights.map((h) => (
                <DropdownMenuItem
                  key={h.value}
                  onSelect={() => executeCommand("hiliteColor", h.value)}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <div
                    className="h-3.5 w-3.5 rounded border border-border shrink-0"
                    style={{ backgroundColor: h.value }}
                  />
                  <span>{h.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* CONTENT BLOCKS, CALLOUTS & DIVIDER */}
        <div className="flex items-center gap-0.5 border-r border-border/80 pr-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Blockquote"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertBlockquote();
            }}
          >
            <Quote className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Code Block"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertCodeblock();
            }}
          >
            <Code className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Insert Callout Card"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertCallout();
            }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Horizontal Divider"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertDivider();
            }}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>

        {/* TABLES DROPDOWN SECTION */}
        <div className="flex items-center gap-0.5 border-r border-border/80 pr-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Tables"
              >
                <Table className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-[180px] p-1.5">
              <div className="px-1.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest border-b border-border mb-1">
                Insert / Edit Table
              </div>
              <DropdownMenuItem
                onSelect={() => insertTable(3, 3)}
                className="text-xs font-semibold text-primary/90 flex items-center gap-1.5"
              >
                <Table className="h-3.5 w-3.5" /> 3 x 3 Default Table
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => insertTable(5, 5)}
                className="text-xs flex items-center gap-1.5"
              >
                <Table className="h-3.5 w-3.5 text-muted-foreground" /> 5 x 5
                Large Table
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleAddRow}
                className="text-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-500" /> Insert Row
                Below
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={handleDeleteRow}
                className="text-xs flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" /> Delete Active
                Row
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleAddColumn}
                className="text-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-500" /> Insert Column
                Right
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={handleDeleteColumn}
                className="text-xs flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" /> Delete Column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleMergeColumnSpan}
                className="text-xs flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400"
              >
                Merge Cells (colSpan)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* MEDIA & ATTACHMENTS */}
        <div className="flex items-center gap-0.5 border-r border-border/80 pr-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Insert Hyperlink"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertLink();
            }}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Insert Local Image"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertImage();
            }}
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Attach Deliverable File"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertAttachment();
            }}
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* COMPOSER SCREEN/AREA */}
      <div
        ref={editorRef}
        contentEditable
        onBlur={() => {
          setIsFocused(false);
          handleEditorChange();
        }}
        onFocus={() => setIsFocused(true)}
        onInput={handleEditorChange}
        className="w-full flex-1 min-h-[200px] overflow-y-auto p-4 focus:outline-none text-sm leading-relaxed prose prose-slate dark:prose-invert max-w-none font-sans text-foreground py-4 px-6 select-text"
        placeholder={placeholder}
        style={{
          outline: "none",
        }}
      />
    </div>
  );
}
