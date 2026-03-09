export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'not-started' | 'in-progress' | 'blocked' | 'completed';

export interface ChecklistItem {
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  owner: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  dueDate?: string;
  currentMilestone?: string;
  nextMilestone?: string;
  delayRisk?: string;
  labels?: string[];
  checklist?: ChecklistItem[];
}

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];
