import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { SelectButton } from 'primeng/selectbutton';
import { Button } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { TaskBoardComponent } from '../task-board/task-board.component';
import { TaskGridComponent } from '../task-grid/task-grid.component';
import { TaskEditorComponent } from '../task-editor/task-editor.component';
import { Task } from '../../../models/task.model';

@Component({
  selector: 'app-task-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    SelectButton,
    Button,
    TaskBoardComponent,
    TaskGridComponent,
    TaskEditorComponent,
  ],
  template: `
    <header class="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-700">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Task Board</h1>
      <div class="flex items-center gap-3">
        <p-selectbutton
          [options]="viewOptions"
          [(ngModel)]="activeView"
          optionLabel="label"
          optionValue="value"
          [allowEmpty]="false"
        />
        <p-button label="New Task" icon="pi pi-plus" (onClick)="openNewTask()" />
      </div>
    </header>

    @switch (activeView()) {
      @case ('board') {
        <app-task-board (taskClick)="openEditTask($event)" />
      }
      @case ('grid') {
        <app-task-grid (taskClick)="openEditTask($event)" />
      }
    }

    <app-task-editor
      [task]="selectedTask()"
      [visible]="editorVisible()"
      (visibleChange)="editorVisible.set($event)"
      (saved)="onSaved()"
    />
  `,
})
export class TaskShellComponent {
  readonly viewOptions = [
    { label: 'Board', value: 'board' },
    { label: 'Table', value: 'grid' },
  ];

  readonly activeView = signal<'board' | 'grid'>('board');
  readonly editorVisible = signal(false);
  readonly selectedTask = signal<Task | null>(null);

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
  }
}
