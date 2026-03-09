# Prompt for Claude (VS Code) — Angular Internal Task Board Prototype

You are assisting in building a **quick prototype Angular application** to replicate and improve a simple internal task tracking system currently attempted using Microsoft Planner.

The goal is to **quickly test an internal solution** to be embedded into Microsoft Teams.

This prototype is **frontend only (no backend)** and should use **mock/local data**.

---

# Project Goal

Create a **simple internal task management interface** that supports:

- Task tracking
- Status workflow
- Milestone progress
- Risk / label tagging
- Structured task fields
- Board + Table views

This should replicate the functionality we attempted with Microsoft Planner but allow **custom fields and better structure**.

---

# Tech Stack

Use:

- Angular (latest stable)
- Angular standalone components
- Angular signals
- PrimeNG
- No backend
- Local mock data or in-memory state

---

# Step 1 — Create Angular App

Generate a new Angular project.

Recommended command:

```bash
ng new internal-task-board
```

Options:

- Standalone: Yes
- Routing: Yes
- Style: SCSS

Then run:

```bash
cd internal-task-board
ng serve
```

---

# Step 2 — App Structure

Suggested structure:

```
src/app
    core/
    features/
        tasks/
            task-board/
            task-grid/
            task-card/
            task-editor/
    models/
    services/
```

---

# Step 3 — Task Model

Create a TypeScript model for tasks.

Example:

```ts
export interface Task {
  id: string;
  title: string;
  description: string;
  owner: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'not-started' | 'in-progress' | 'blocked' | 'completed';
  startDate?: Date;
  dueDate?: Date;

  currentMilestone?: string;
  nextMilestone?: string;
  delayRisk?: string;

  labels?: string[];
  checklist?: ChecklistItem[];
}

export interface ChecklistItem {
  title: string;
  completed: boolean;
}
```

---

# Step 4 — Features to Implement

## Task Board (Kanban)

Columns:

- Not Started
- In Progress
- Blocked
- Completed

Cards should display:

- Task title
- Owner
- Due date
- Priority
- Label tags
- Checklist progress

Allow drag and drop if possible.

---

## Task Grid (Table View)

Table columns:

- Task Name
- Owner
- Priority
- Status
- Start Date
- Due Date
- Current Milestone
- Next Milestone
- Delay Risk

---

## Task Editor

Clicking a task opens a panel/modal.

Fields:

- Title
- Owner
- Priority
- Status
- Start Date
- Due Date
- Description
- Current Milestone
- Next Milestone
- Delay Risk
- Labels
- Checklist items

---

# Step 5 — Mock Data

Use a simple service:

```ts
TaskService;
```

Return an array of tasks stored in memory.

No persistence needed yet.

---

# Step 6 — Nice-to-Have (Optional)

If easy to implement:

- task filtering
- risk highlighting
- progress bar from checklist
- dark mode
- board / table toggle

---

# Goal of This Prototype

This is only to:

- validate replacing Microsoft Planner
- allow **custom fields**
- eventually integrate into **Apollo internal system**
- optionally embed inside **Microsoft Teams as a tab**

Focus on **speed and clarity**, not production-level architecture.
