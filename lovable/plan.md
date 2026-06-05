# Task Detail Modal — Plan

Build an enterprise-grade Task Detail experience that opens as a large modal (full-screen dialog on smaller widths) from anywhere a backlog/board item is clicked. Mock-data only, persisted through the existing `workspace-store`.

## Where it opens from

- Backlog rows (`workspaces.$code.backlog.tsx`)
- Board cards (`workspaces.$code.board.tsx`)
- Roadmap items (`workspaces.$code.roadmap.tsx`)
- Subtask rows inside the modal itself

A single shared `TaskDetailDialog` controlled by a lightweight context (`TaskDetailProvider`) so any component can call `openTask(itemId)`.

## Layout

Three regions inside a large `Dialog` (max-w-[1200px], h-[90vh]):

```
┌─────────────────────────────────────────────────────────┐
│ Sticky Header: ID · type icon · title (inline edit)     │
│ status · priority · sprint · workflow buttons · share   │
├──────────────────────────────────┬──────────────────────┤
│ Tabs (sticky)                    │ Properties sidebar   │
│ Overview / Description / AC /    │ (sticky, scroll)     │
│ Subtasks / Dependencies /        │ Assignee, Reporter,  │
│ Comments / Activity /            │ Priority, Status,    │
│ Attachments / Time / Dev / QA    │ Points, Sprint,      │
│                                  │ Epic, Parent, Team,  │
│ Scrollable tab content           │ Release, Dates       │
└──────────────────────────────────┴──────────────────────┘
```

Resizable split via existing `react-resizable-panels`. Sidebar collapsible to icon strip.

## Store extensions (`src/lib/workspace-store.tsx`)

Add optional fields + arrays on `BacklogItem` (all mock, persisted to localStorage):

- `descriptionRich`, `acceptanceCriteria: {id,text,done}[]`
- `subtaskIds: string[]` (subtasks are regular items with `parentId`)
- `links: {id,type:'blocks'|'blockedBy'|'relatesTo'|'duplicates', targetId}[]`
- `comments: {id,authorId,body,createdAt,reactions:{emoji,userIds[]}[],internal:boolean,parentId?}[]`
- `activity: {id,type,actorId,at,meta}[]` (auto-appended by store mutations)
- `attachments: {id,name,mime,size,url,uploadedBy,uploadedAt,version}[]`
- `worklogs: {id,userId,date,hours,comment}[]`
- `estimateHours`, `remainingHours`
- `epicId`, `releaseVersion`, `reporterId`, `team`

New actions: `addComment`, `addWorklog`, `addAttachment`, `addLink`, `addAcceptance`, `toggleAcceptance`, `logActivity` (called from existing mutations).

## New components (`src/components/task-detail/`)

- `TaskDetailProvider.tsx` — context + dialog mount
- `TaskDetailDialog.tsx` — shell, header, resizable panels
- `TaskHeader.tsx` — inline editable title, badges, workflow transition buttons (derived from workspace `statuses`)
- `TaskSidebar.tsx` — properties panel with inline editors (Select/DatePicker/MultiSelectPeople)
- `tabs/OverviewTab.tsx` — summary cards grid + progress widget + risks
- `tabs/DescriptionTab.tsx` — textarea-based rich editor (toolbar buttons, markdown-light)
- `tabs/AcceptanceTab.tsx` — checklist with add/reorder
- `tabs/SubtasksTab.tsx` — table with inline edit, drag reorder, bulk select, rollup bar
- `tabs/DependenciesTab.tsx` — grouped lists + simple SVG dependency graph (nodes/edges from `links`)
- `tabs/CommentsTab.tsx` — thread list, composer with @mention popover (from DIRECTORY), emoji reactions, internal-note toggle, attachment chip
- `tabs/ActivityTab.tsx` — timeline with filter chips (Comments/History/Worklogs/Automation)
- `tabs/AttachmentsTab.tsx` — drag-drop upload (object URLs), gallery with image thumbs, version list
- `tabs/TimeTrackingTab.tsx` — estimates, progress + burn bar, worklog table, "Log work" dialog
- `tabs/DevelopmentTab.tsx` — mock branches/PRs/commits panel
- `tabs/TestingTab.tsx` — mock test cases with pass/fail counts

Small primitives: `InlineEditText`, `InlineEditSelect`, `ReactionBar`, `MentionTextarea`, `DependencyGraph` (pure SVG, no extra deps).

## Wiring

- Wrap app once in `__root.tsx` with `TaskDetailProvider`
- Backlog/Board/Roadmap items: `onClick={() => openTask(item.id)}` (preserve existing drag handlers via `onMouseDown` guards)
- Keyboard: `e` edit title, `m` assign, `c` comment, `Esc` close (scoped to dialog)

## Mock data seeding

On first load, if a workspace exists with zero comments/activity, seed each item with: 1–3 acceptance criteria, 2–4 comments (varied authors), 3–6 activity entries, 1–2 attachments (placeholder images), 1–2 worklogs, a couple of links between items. Idempotent via a `seededDetailsAt` flag per item.

## Out of scope

- No real file upload backend (object URLs only)
- No real rich-text engine (lightweight markdown-ish textarea + preview)
- No real backend / Lovable Cloud changes
- No mobile-optimized variant beyond graceful stacking

## Deliverables

1. Store extensions + activity logger
2. `TaskDetailProvider` + `TaskDetailDialog` shell with header & sidebar
3. All 11 tabs with realistic mock interactions
4. Hooks from Backlog / Board / Roadmap to open the modal
5. Seed function for demo data
