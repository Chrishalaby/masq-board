import { User } from './user.model';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'not-started' | 'in-progress' | 'blocked' | 'completed';
export type DependencyType =
  | 'finish-to-start'
  | 'start-to-start'
  | 'finish-to-finish'
  | 'start-to-finish';

export interface ChecklistItem {
  id?: string;
  title: string;
  completed: boolean;
  sortOrder?: number;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: DependencyType;
  dependsOn?: Task;
}

export interface Label {
  id: string;
  name: string;
  color?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  dueDate?: string;
  milestoneAchieved?: string;
  currentMilestone?: string;
  nextMilestone?: string;
  delayRisk?: string;
  sortOrder?: number;

  // Relations
  projectId?: string;
  project?: { id: string; name: string };
  initiativeId?: string;
  initiative?: { id: string; name: string };
  assigneeId?: string;
  assignee?: User;
  createdById?: string;
  createdBy?: User;
  labels?: Label[];
  checklist?: ChecklistItem[];
  dependencies?: TaskDependency[];
  dependencyCount?: number;

  /** @deprecated Use assignee.displayName instead */
  owner?: string;
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
