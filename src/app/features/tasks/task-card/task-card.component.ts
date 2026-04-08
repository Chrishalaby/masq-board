import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ProgressBar } from 'primeng/progressbar';
import { Tag } from 'primeng/tag';
import { Task, TaskPriority } from '../../../models/task.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-task-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, Tag, ProgressBar],
  template: `
    <div
      class="task-card cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
      [class.border-l-red-500]="task().priority === 'urgent'"
      [class.border-l-4]="task().priority === 'urgent' || task().priority === 'high'"
      [class.border-l-orange-400]="task().priority === 'high'"
      (click)="cardClick.emit(task())"
      role="button"
      [attr.aria-label]="'Open task: ' + task().title"
      tabindex="0"
      (keydown.enter)="cardClick.emit(task())"
      (keydown.space)="cardClick.emit(task()); $event.preventDefault()"
    >
      <div class="mb-2 flex items-start justify-between gap-2">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ task().title }}</h4>
        <p-tag [value]="task().priority" [severity]="prioritySeverity()" [rounded]="true" />
      </div>

      <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
        @if (task().assignees?.length) {
          @for (ta of task().assignees; track ta.userId; let last = $last) {
            <span
              class="cursor-pointer hover:text-blue-600 hover:underline"
              (click)="onAssigneeClick($event, ta.user)"
              >{{ ta.user?.displayName }}
              @if (ta.role) {
                <span class="text-gray-400"> ({{ ta.role }})</span>
              }
            </span>
            @if (!last) {
              <span>, </span>
            }
          }
        } @else if (task().assignee) {
          <span
            class="cursor-pointer hover:text-blue-600 hover:underline"
            (click)="onAssigneeClick($event, task().assignee)"
            >{{ task().assignee!.displayName }}</span
          >
        } @else {
          {{ task().owner || 'Unassigned' }}
        }
      </p>

      @if (task().project) {
        <p class="mb-1 text-xs text-indigo-600 dark:text-indigo-400">
          📁 {{ task().project!.name }}
        </p>
      }

      @if (task().dueDate) {
        <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Due: {{ task().dueDate | date: 'mediumDate' }}
        </p>
      }

      @if (task().labels?.length) {
        <div class="mb-2 flex flex-wrap gap-1">
          @for (label of task().labels; track label.id || label.name) {
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              [style.background-color]="(label.color || '#3B82F6') + '20'"
              [style.color]="label.color || '#3B82F6'"
            >
              {{ label.name }}
            </span>
          }
        </div>
      }

      @if (task().linkedFiles?.length) {
        <div class="mb-2 flex flex-wrap gap-1">
          @for (url of task().linkedFiles; track url) {
            <a
              [href]="url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-100 dark:bg-gray-700 dark:text-blue-400 dark:hover:bg-gray-600"
              [title]="url"
              (click)="$event.stopPropagation()"
            >
              <i class="pi pi-external-link mr-1"></i>
              {{ urlLabel(url) }}
            </a>
          }
        </div>
      }

      <div class="flex items-center gap-2">
        @if (task().dependencies?.length) {
          <span
            class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            title="Dependencies"
          >
            🔗 {{ task().dependencies!.length }}
          </span>
        }
        @if (checklistProgress(); as progress) {
          <div class="flex-1">
            <div class="mb-1 flex justify-between text-xs text-gray-500">
              <span>Checklist</span>
              <span>{{ progress.done }}/{{ progress.total }}</span>
            </div>
            <p-progressBar
              [value]="progress.percent"
              [showValue]="false"
              [style]="{ height: '6px' }"
            />
          </div>
        }
      </div>
    </div>
  `,
})
export class TaskCardComponent {
  readonly task = input.required<Task>();
  readonly cardClick = output<Task>();
  readonly assigneeClick = output<{ user: User; event: MouseEvent }>();

  protected readonly prioritySeverity = computed(() => {
    const map: Record<TaskPriority, 'danger' | 'warn' | 'info' | 'success'> = {
      urgent: 'danger',
      high: 'warn',
      medium: 'info',
      low: 'success',
    };
    return map[this.task().priority];
  });

  protected readonly checklistProgress = computed(() => {
    const checklist = this.task().checklist;
    if (!checklist?.length) return null;
    const done = checklist.filter((c) => c.completed).length;
    return { done, total: checklist.length, percent: Math.round((done / checklist.length) * 100) };
  });

  protected onAssigneeClick(event: MouseEvent, user?: User): void {
    if (!user) return;
    event.stopPropagation();
    this.assigneeClick.emit({ user, event });
  }

  protected urlLabel(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Link';
    }
  }
}
