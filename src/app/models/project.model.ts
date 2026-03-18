import { User } from './user.model';

export type ProjectStatus = 'draft' | 'active' | 'on-hold' | 'completed' | 'archived';

export type ProjectRole =
  | 'project-manager'
  | 'accountant'
  | 'procurement'
  | 'logistics'
  | 'salesman'
  | 'development';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  user?: User;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  isHot: boolean;
  members?: ProjectMember[];
  taskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export const PROJECT_ROLES: { value: ProjectRole; label: string }[] = [
  { value: 'project-manager', label: 'Project Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'salesman', label: 'Salesman' },
  { value: 'development', label: 'Development' },
];
