import { DatePipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Task, TaskPriority } from '../../../models/task.model';
import { User } from '../../../models/user.model';
import { TaskService } from '../../../services/task.service';

interface CalendarDay {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

@Component({
  selector: 'app-task-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, SlicePipe, Button, Tag],
  template: `
    <div class="flex flex-col gap-4 p-4">
      <!-- Month navigation -->
      <div class="flex items-center justify-between">
        <p-button
          icon="pi pi-chevron-left"
          [text]="true"
          (onClick)="prevMonth()"
          ariaLabel="Previous month"
        />
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {{ viewDate() | date: 'MMMM yyyy' }}
        </h2>
        <div class="flex items-center gap-2">
          <p-button label="Today" [text]="true" size="small" (onClick)="goToday()" />
          <p-button
            icon="pi pi-chevron-right"
            [text]="true"
            (onClick)="nextMonth()"
            ariaLabel="Next month"
          />
        </div>
      </div>

      <!-- Weekday headers -->
      <div class="grid grid-cols-7 gap-px rounded-t-lg bg-gray-200 dark:bg-gray-700">
        @for (day of weekDays; track day) {
          <div
            class="bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            {{ day }}
          </div>
        }
      </div>

      <!-- Calendar grid -->
      <div class="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
        @for (day of calendarDays(); track day.date.toISOString()) {
          <div
            class="min-h-28 bg-white p-1.5 dark:bg-gray-800"
            [class.bg-gray-50]="!day.inMonth"
            [class.dark:bg-gray-900]="!day.inMonth"
            [class.opacity-50]="!day.inMonth"
          >
            <div class="mb-1 flex items-center justify-between">
              <span
                class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs"
                [class.bg-blue-600]="day.isToday"
                [class.text-white]="day.isToday"
                [class.font-bold]="day.isToday"
                [class.text-gray-700]="!day.isToday"
                [class.dark:text-gray-300]="!day.isToday"
              >
                {{ day.date.getDate() }}
              </span>
              @if (day.tasks.length > 3) {
                <span class="text-xs text-gray-400">{{ day.tasks.length }}</span>
              }
            </div>
            <div class="flex flex-col gap-0.5">
              @for (task of day.tasks | slice: 0 : 3; track task.id) {
                <button
                  class="w-full truncate rounded px-1.5 py-0.5 text-left text-xs transition hover:opacity-80"
                  [style.background-color]="priorityBg(task.priority)"
                  [style.color]="priorityFg(task.priority)"
                  (click)="taskClick.emit(task)"
                  [title]="task.title"
                >
                  {{ task.title }}
                </button>
              }
              @if (day.tasks.length > 3) {
                <button
                  class="w-full text-center text-xs text-blue-600 hover:underline dark:text-blue-400"
                  (click)="expandDay.set(day.date)"
                >
                  +{{ day.tasks.length - 3 }} more
                </button>
              }
            </div>
          </div>
        }
      </div>

      <!-- Expanded day overlay -->
      @if (expandDay(); as d) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          (click)="expandDay.set(null)"
        >
          <div
            class="max-h-96 w-96 overflow-y-auto rounded-lg bg-white p-4 shadow-xl dark:bg-gray-800"
            (click)="$event.stopPropagation()"
            role="dialog"
            aria-label="Tasks for day"
          >
            <div class="mb-3 flex items-center justify-between">
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                {{ d | date: 'fullDate' }}
              </h3>
              <p-button
                icon="pi pi-times"
                [text]="true"
                [rounded]="true"
                size="small"
                (onClick)="expandDay.set(null)"
                ariaLabel="Close"
              />
            </div>
            <div class="flex flex-col gap-1">
              @for (task of getTasksForDate(d); track task.id) {
                <button
                  class="flex w-full items-center gap-2 rounded p-2 text-left transition hover:bg-gray-100 dark:hover:bg-gray-700"
                  (click)="taskClick.emit(task); expandDay.set(null)"
                >
                  <p-tag
                    [value]="task.priority"
                    [severity]="prioritySeverity(task.priority)"
                    [rounded]="true"
                  />
                  <span class="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{{
                    task.title
                  }}</span>
                  @if (task.assignees?.length) {
                    <span class="text-xs text-gray-500">{{
                      task.assignees![0].user?.displayName
                    }}</span>
                  } @else if (task.assignee) {
                    <span class="text-xs text-gray-500">{{ task.assignee.displayName }}</span>
                  }
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class TaskCalendarComponent {
  private readonly taskService = inject(TaskService);

  readonly taskClick = output<Task>();
  readonly assigneeClick = output<{ user: User; event: MouseEvent }>();

  readonly viewDate = signal(new Date());
  readonly expandDay = signal<Date | null>(null);

  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  readonly calendarDays = computed(() => {
    const vd = this.viewDate();
    const tasks = this.taskService.tasks();
    const year = vd.getFullYear();
    const month = vd.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from Sunday of the first week
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End at Saturday of the last week
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build a map of due dates to tasks
    const taskMap = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = task.dueDate.substring(0, 10);
      const existing = taskMap.get(key);
      if (existing) {
        existing.push(task);
      } else {
        taskMap.set(key, [task]);
      }
    }

    const days: CalendarDay[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = [
        current.getFullYear(),
        String(current.getMonth() + 1).padStart(2, '0'),
        String(current.getDate()).padStart(2, '0'),
      ].join('-');

      days.push({
        date: new Date(current),
        inMonth: current.getMonth() === month,
        isToday: current.getTime() === today.getTime(),
        tasks: taskMap.get(dateKey) ?? [],
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  });

  prevMonth(): void {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const d = this.viewDate();
    this.viewDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  goToday(): void {
    this.viewDate.set(new Date());
  }

  getTasksForDate(date: Date): Task[] {
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    return this.taskService.tasks().filter((t) => t.dueDate?.substring(0, 10) === key);
  }

  protected prioritySeverity(p: TaskPriority): 'danger' | 'warn' | 'info' | 'success' {
    const map: Record<TaskPriority, 'danger' | 'warn' | 'info' | 'success'> = {
      urgent: 'danger',
      high: 'warn',
      medium: 'info',
      low: 'success',
    };
    return map[p];
  }

  protected priorityBg(p: TaskPriority): string {
    const map: Record<TaskPriority, string> = {
      urgent: '#FEE2E2',
      high: '#FEF3C7',
      medium: '#DBEAFE',
      low: '#D1FAE5',
    };
    return map[p];
  }

  protected priorityFg(p: TaskPriority): string {
    const map: Record<TaskPriority, string> = {
      urgent: '#991B1B',
      high: '#92400E',
      medium: '#1E40AF',
      low: '#065F46',
    };
    return map[p];
  }
}
