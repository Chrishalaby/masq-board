import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Task, TASK_STATUSES, TaskStatus } from '../../../models/task.model';
import { User } from '../../../models/user.model';
import { TaskService } from '../../../services/task.service';
import { TaskCardComponent } from '../task-card/task-card.component';

@Component({
  selector: 'app-task-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DragDropModule, TaskCardComponent],
  template: `
    <div class="flex gap-4 overflow-x-auto p-4" role="region" aria-label="Task board">
      @for (col of columns; track col.value) {
        <div class="flex w-72 min-w-72 flex-col rounded-lg bg-gray-50 dark:bg-gray-900">
          <div
            class="flex items-center justify-between rounded-t-lg px-4 py-3"
            [class]="columnHeaderClass(col.value)"
          >
            <h3 class="text-sm font-semibold">{{ col.label }}</h3>
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full bg-white/30 text-xs font-bold"
            >
              {{ tasksByStatus()[col.value].length }}
            </span>
          </div>

          <div
            class="flex min-h-24 flex-1 flex-col gap-2 p-2"
            cdkDropList
            [cdkDropListData]="col.value"
            [id]="col.value"
            [cdkDropListConnectedTo]="connectedLists"
            (cdkDropListDropped)="onDrop($event)"
          >
            @for (task of tasksByStatus()[col.value]; track task.id) {
              <div cdkDrag [cdkDragData]="task">
                <app-task-card
                  [task]="task"
                  (cardClick)="taskClick.emit($event)"
                  (setupClick)="setupClick.emit($event)"
                  (linksClick)="linksClick.emit($event)"
                  (assigneeClick)="assigneeClick.emit($event)"
                />
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class TaskBoardComponent {
  private readonly taskService = inject(TaskService);

  readonly taskClick = output<Task>();
  readonly setupClick = output<Task>();
  readonly linksClick = output<Task>();
  readonly assigneeClick = output<{ user: User; event: MouseEvent }>();
  readonly tasksByStatus = this.taskService.tasksByStatus;
  readonly columns = TASK_STATUSES;
  readonly connectedLists = TASK_STATUSES.map((s) => s.value);

  protected columnHeaderClass(status: TaskStatus): string {
    const map: Record<TaskStatus, string> = {
      'not-started': 'bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      'on-hold': 'bg-amber-400 text-white dark:bg-amber-700',
      'in-progress': 'bg-blue-400 text-white dark:bg-blue-700',
      completed: 'bg-green-400 text-white dark:bg-green-700',
    };
    return map[status];
  }

  onDrop(event: CdkDragDrop<TaskStatus>): void {
    const task = event.item.data as Task;
    const newStatus = event.container.data;
    const prevStatus = event.previousContainer.data;

    if (prevStatus === newStatus) {
      // Vertical reorder within same column
      const columnTasks = [...this.tasksByStatus()[newStatus]];
      moveItemInArray(columnTasks, event.previousIndex, event.currentIndex);
      const items = columnTasks.map((t, i) => ({ id: t.id, sortOrder: i }));
      this.taskService.reorderTasks(items);
    } else {
      // Horizontal move: change status, then reorder in destination column
      this.taskService.moveTask(task.id, newStatus);
      // After moving, reorder in destination to place at drop index
      const destTasks = [...this.tasksByStatus()[newStatus].filter((t) => t.id !== task.id)];
      destTasks.splice(event.currentIndex, 0, task);
      const items = destTasks.map((t, i) => ({ id: t.id, sortOrder: i }));
      this.taskService.reorderTasks(items);
    }
  }
}
