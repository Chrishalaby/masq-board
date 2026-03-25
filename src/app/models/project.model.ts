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
  readonly id: string;
  readonly projectId: string;
  readonly userId: string;
  readonly role: ProjectRole;
  readonly user?: User;
  readonly createdAt: string;
}

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly status: ProjectStatus;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly isHot: boolean;
  readonly apolloProjectId?: string;
  readonly dynamicsNo?: string;
  readonly clientId?: string;
  readonly clientName?: string;
  readonly contactId?: string;
  readonly contactName?: string;
  readonly totalTypesNumber?: number;
  readonly budgetAmount?: number;
  readonly currency?: string;
  readonly projectManager?: string;
  readonly projectManagerProfessionalEmail?: string;
  readonly salesman?: string;
  readonly salesmanProfessionalEmail?: string;
  readonly developer?: string;
  readonly developerProfessionalEmail?: string;
  readonly procurementTeam?: string;
  readonly projectAccountant?: string;
  readonly sharepointFolderLink?: string;
  readonly kickoffMeetingId?: string;
  readonly kickoffMeetingUrl?: string;
  readonly kickoffStartTime?: string;
  readonly members?: ProjectMember[];
  readonly taskCount?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
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
