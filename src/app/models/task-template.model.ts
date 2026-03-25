import { TaskPriority } from './task.model';

export interface TaskTemplate {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly priority: TaskPriority;
  readonly checklist?: { readonly title: string; readonly completed: boolean }[];
  readonly isActive: boolean;
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
