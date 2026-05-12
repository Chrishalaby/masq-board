export type NotificationCategory = 'apollo-project' | 'task' | 'system';

export type NotificationStatus = 'unread' | 'read' | 'dismissed';

export interface AppNotification {
  readonly id: string;
  readonly category: NotificationCategory;
  readonly title: string;
  readonly body?: string;
  readonly status: NotificationStatus;
  readonly actionLabel?: string;
  readonly actionData?: Record<string, unknown>;
  readonly createdAt: string;
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  'apollo-project': 'Pending Apollo Projects',
  task: 'Task Updates',
  system: 'System',
};
