import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Task, TaskPriority, TaskStatus } from '../../../models/task.model';
import { TaskService } from '../../../services/task.service';

@Component({
  selector: 'app-task-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TableModule, Tag],
  template: `
    <p-table
      [value]="tasks()"
      [paginator]="true"
      [rows]="15"
      [rowHover]="true"
      [sortField]="'dueDate'"
      [sortOrder]="1"
      styleClass="p-datatable-sm p-datatable-striped"
      [tableStyle]="{ 'min-width': '70rem' }"
    >
      <ng-template #header>
        <tr>
          <th pSortableColumn="title">Task Name <p-sortIcon field="title" /></th>
          <th pSortableColumn="owner">Owner <p-sortIcon field="owner" /></th>
          <th pSortableColumn="priority">Priority <p-sortIcon field="priority" /></th>
          <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
          <th pSortableColumn="startDate">Start Date <p-sortIcon field="startDate" /></th>
          <th pSortableColumn="dueDate">Due Date <p-sortIcon field="dueDate" /></th>
          <th>Current Milestone</th>
          <th>Next Milestone</th>
          <th>Delay Risk</th>
        </tr>
      </ng-template>
      <ng-template #body let-task>
        <tr
          class="cursor-pointer"
          (click)="taskClick.emit(task)"
          (keydown.enter)="taskClick.emit(task)"
          tabindex="0"
          [attr.aria-label]="'Open task: ' + task.title"
        >
          <td class="font-medium">{{ task.title }}</td>
          <td>{{ task.owner }}</td>
          <td>
            <p-tag
              [value]="task.priority"
              [severity]="prioritySeverity(task.priority)"
              [rounded]="true"
            />
          </td>
          <td>
            <p-tag [value]="statusLabel(task.status)" [severity]="statusSeverity(task.status)" />
          </td>
          <td>{{ task.startDate | date: 'mediumDate' }}</td>
          <td>{{ task.dueDate | date: 'mediumDate' }}</td>
          <td>{{ task.currentMilestone }}</td>
          <td>{{ task.nextMilestone }}</td>
          <td>
            @if (task.delayRisk) {
              <span class="text-sm text-red-600 dark:text-red-400">⚠ {{ task.delayRisk }}</span>
            }
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class TaskGridComponent {
  private readonly taskService = inject(TaskService);

  readonly taskClick = output<Task>();
  readonly tasks = this.taskService.tasks;

  protected prioritySeverity(p: TaskPriority): 'danger' | 'warn' | 'info' | 'success' {
    const map: Record<TaskPriority, 'danger' | 'warn' | 'info' | 'success'> = {
      urgent: 'danger',
      high: 'warn',
      medium: 'info',
      low: 'success',
    };
    return map[p];
  }

  protected statusSeverity(s: TaskStatus): 'danger' | 'warn' | 'info' | 'success' | 'secondary' {
    const map: Record<TaskStatus, 'danger' | 'warn' | 'info' | 'success' | 'secondary'> = {
      'not-started': 'secondary',
      'in-progress': 'info',
      blocked: 'danger',
      completed: 'success',
    };
    return map[s];
  }

  protected statusLabel(s: TaskStatus): string {
    const map: Record<TaskStatus, string> = {
      'not-started': 'Not Started',
      'in-progress': 'In Progress',
      blocked: 'Blocked',
      completed: 'Completed',
    };
    return map[s];
  }
}
