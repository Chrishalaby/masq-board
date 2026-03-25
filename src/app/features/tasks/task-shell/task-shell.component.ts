import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { Task } from '../../../models/task.model';
import { User } from '../../../models/user.model';
import { TaskService } from '../../../services/task.service';
import { ContextMenuComponent } from '../../../shared/context-menu/context-menu.component';
import { TaskBoardComponent } from '../task-board/task-board.component';
import { TaskEditorComponent } from '../task-editor/task-editor.component';
import { TaskGridComponent } from '../task-grid/task-grid.component';

@Component({
  selector: 'app-task-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    SelectButton,
    Button,
    TaskBoardComponent,
    TaskGridComponent,
    TaskEditorComponent,
    ContextMenuComponent,
  ],
  template: `
    <header
      class="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-700"
    >
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">All Tasks</h1>
      <div class="flex items-center gap-3">
        <p-selectbutton
          [options]="viewOptions"
          [(ngModel)]="activeView"
          optionLabel="label"
          optionValue="value"
          [allowEmpty]="false"
        />
        <p-button label="New Task" icon="pi pi-plus" (onClick)="openNewTask()" />
        <a routerLink="/task-templates">
          <p-button
            label="Templates"
            icon="pi pi-file-edit"
            [outlined]="true"
            severity="secondary"
          />
        </a>
        <a routerLink="/labels">
          <p-button label="Labels" icon="pi pi-tag" [outlined]="true" severity="secondary" />
        </a>
      </div>
    </header>

    @switch (activeView()) {
      @case ('board') {
        <app-task-board
          (taskClick)="openEditTask($event)"
          (assigneeRightClick)="onAssigneeRightClick($event)"
        />
      }
      @case ('grid') {
        <app-task-grid
          (taskClick)="openEditTask($event)"
          (assigneeRightClick)="onAssigneeRightClick($event)"
        />
      }
    }

    <app-task-editor
      [task]="selectedTask()"
      [visible]="editorVisible()"
      (visibleChange)="editorVisible.set($event)"
      (saved)="onSaved()"
    />

    <app-context-menu (viewDetails)="openEditTask($event)" />
  `,
})
export class TaskShellComponent implements OnInit {
  private readonly taskService = inject(TaskService);

  readonly viewOptions = [
    { label: 'Board', value: 'board' },
    { label: 'Table', value: 'grid' },
  ];

  readonly activeView = signal<'board' | 'grid'>('board');
  readonly editorVisible = signal(false);
  readonly selectedTask = signal<Task | null>(null);
  readonly contextMenu = viewChild(ContextMenuComponent);

  ngOnInit(): void {
    this.taskService.loadTasks();
  }

  openNewTask(): void {
    this.selectedTask.set(null);
    this.editorVisible.set(true);
  }

  openEditTask(task: Task): void {
    this.selectedTask.set(task);
    this.editorVisible.set(true);
  }

  onSaved(): void {
    this.selectedTask.set(null);
    this.taskService.loadTasks();
  }

  onAssigneeRightClick(data: { user: User; event: MouseEvent }): void {
    this.contextMenu()?.openForUser(data.user, data.event.target as HTMLElement, data.event);
  }
}
