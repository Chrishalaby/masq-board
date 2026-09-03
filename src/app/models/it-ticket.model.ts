import { User } from './user.model';

export type ItCompany = 'MASQ LEB' | 'MASQ KSA' | 'MASQ QA' | 'Aluzo' | 'Bsefrine';

export type ItTicketPriority = 'low' | 'normal' | 'high' | 'critical';

export type ItTicketStatus =
  | 'new'
  | 'awaiting-approval'
  | 'approved'
  | 'in-progress'
  | 'on-hold'
  | 'resolved'
  | 'rejected';

export type TagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';

export interface ItCategory {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly pendingAssigneeNames?: string[] | null;
  readonly assignees: User[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ItTicketAttachment {
  readonly url: string;
  readonly name: string;
  readonly uploadedAt: string;
  readonly uploadedById?: string | null;
}

export interface ItTicketStatusLog {
  readonly id: string;
  readonly ticketId: string;
  readonly fromStatus: ItTicketStatus | null;
  readonly toStatus: ItTicketStatus;
  readonly changedById?: string | null;
  readonly changedBy?: User | null;
  readonly changedByName: string;
  readonly changedAt: string;
}

export interface ItTicketComment {
  readonly id: string;
  readonly ticketId: string;
  readonly authorId?: string | null;
  readonly author?: User | null;
  readonly authorName: string;
  readonly body: string;
  readonly attachments: ItTicketAttachment[];
  readonly mentions: User[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateItCommentPayload {
  readonly body: string;
  readonly mentionIds: readonly string[];
  readonly files: readonly File[];
}

export interface ItTicket {
  readonly id: string;
  readonly ticketNumber: number;
  readonly title: string;
  readonly requesterId?: string | null;
  readonly requester?: User | null;
  readonly company: ItCompany;
  readonly categoryId?: string | null;
  readonly category?: ItCategory | null;
  readonly priority: ItTicketPriority;
  readonly description: string;
  readonly neededBy?: string | null;
  readonly status: ItTicketStatus;
  readonly assignees: User[];
  readonly responsiblePersonId?: string | null;
  readonly responsiblePerson?: User | null;
  readonly attachments: ItTicketAttachment[];
  readonly approverNotes?: string | null;
  readonly approvedById?: string | null;
  readonly approvedBy?: User | null;
  readonly approvedAt?: string | null;
  readonly rejectedById?: string | null;
  readonly rejectedBy?: User | null;
  readonly rejectedAt?: string | null;
  readonly rejectionNotes?: string | null;
  readonly statusLogs?: ItTicketStatusLog[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateItTicketPayload {
  readonly title: string;
  readonly company: ItCompany;
  readonly categoryId: string;
  readonly priority: ItTicketPriority;
  readonly description: string;
  readonly neededBy?: string;
}

export interface UpdateItTicketPayload {
  readonly title?: string;
  readonly company?: ItCompany;
  readonly categoryId?: string;
  readonly priority?: ItTicketPriority;
  readonly description?: string;
  readonly neededBy?: string | null;
  readonly assigneeIds?: string[];
  readonly responsiblePersonId?: string | null;
  readonly approverNotes?: string | null;
  readonly rejectionNotes?: string | null;
}

export interface ChangeItTicketStatusPayload {
  readonly status: ItTicketStatus;
  readonly rejectionNotes?: string;
  readonly approverNotes?: string;
}

export interface ItCategoryPayload {
  readonly name: string;
  readonly assigneeIds: string[];
}

export const IT_COMPANIES: readonly ItCompany[] = [
  'MASQ LEB',
  'MASQ KSA',
  'MASQ QA',
  'Aluzo',
  'Bsefrine',
];

export const IT_TICKET_PRIORITIES: readonly { value: ItTicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const IT_TICKET_STATUSES: readonly { value: ItTicketStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'awaiting-approval', label: 'Awaiting Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_LABELS: Record<ItTicketStatus, string> = {
  new: 'New',
  'awaiting-approval': 'Awaiting Approval',
  approved: 'Approved',
  'in-progress': 'In Progress',
  'on-hold': 'On Hold',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const STATUS_SEVERITIES: Record<ItTicketStatus, TagSeverity> = {
  new: 'secondary',
  'awaiting-approval': 'warn',
  approved: 'success',
  'in-progress': 'info',
  'on-hold': 'contrast',
  resolved: 'success',
  rejected: 'danger',
};

const PRIORITY_LABELS: Record<ItTicketPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
};

const PRIORITY_SEVERITIES: Record<ItTicketPriority, TagSeverity> = {
  low: 'success',
  normal: 'info',
  high: 'warn',
  critical: 'danger',
};

export function itStatusLabel(status: ItTicketStatus | null | undefined): string {
  return status ? STATUS_LABELS[status] : '—';
}

export function itStatusSeverity(status: ItTicketStatus): TagSeverity {
  return STATUS_SEVERITIES[status];
}

export function itPriorityLabel(priority: ItTicketPriority): string {
  return PRIORITY_LABELS[priority];
}

export function itPrioritySeverity(priority: ItTicketPriority): TagSeverity {
  return PRIORITY_SEVERITIES[priority];
}

export function assigneeNames(users: readonly User[] | undefined): string {
  return users?.length ? users.map((u) => u.displayName).join(', ') : 'Unassigned';
}
