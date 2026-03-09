import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Tag } from 'primeng/tag';
import { ProgressBar } from 'primeng/progressbar';
import { Task, TaskPriority } from '../../../models/task.model';

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

      <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">{{ task().owner }}</p>

      @if (task().dueDate) {
        <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Due: {{ task().dueDate | date: 'mediumDate' }}
        </p>
      }

      @if (task().labels?.length) {
        <div class="mb-2 flex flex-wrap gap-1">
          @for (label of task().labels; track label) {
            <span
              class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
            >
              {{ label }}
            </span>
          }
        </div>
      }

      @if (checklistProgress(); as progress) {
        <div class="mt-2">
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
  `,
})
export class TaskCardComponent {
  readonly task = input.required<Task>();
  readonly cardClick = output<Task>();

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
}
