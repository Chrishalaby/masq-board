import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { Toast } from 'primeng/toast';
import { Initiative } from '../../../models/initiative.model';
import { Task } from '../../../models/task.model';
import { User } from '../../../models/user.model';
import { InitiativeService } from '../../../services/initiative.service';
import { TaskService } from '../../../services/task.service';
import { UserService } from '../../../services/user.service';
import { CallPopoverComponent } from '../../../shared/call-popover/call-popover.component';
import { CpmChartComponent } from '../../projects/cpm-chart/cpm-chart.component';
import { TaskBoardComponent } from '../../tasks/task-board/task-board.component';
import { TaskEditorComponent } from '../../tasks/task-editor/task-editor.component';
import { TaskGridComponent } from '../../tasks/task-grid/task-grid.component';

@Component({
  selector: 'app-initiative-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    RouterLink,
    FormsModule,
    Button,
    SelectButton,
    Toast,
    TaskBoardComponent,
    TaskGridComponent,
    TaskEditorComponent,
    CpmChartComponent,
    CallPopoverComponent,
  ],
  template: `
    <p-toast />

    @if (initiative(); as ini) {
      <header class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <div class="mb-3 flex items-center gap-2">
          <a
            routerLink="/departments"
            class="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >← Department Management</a
          >
        </div>
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ ini.name }}</h1>
          <div class="flex items-center gap-2">
            <p-selectbutton
              [options]="viewOptions"
              [(ngModel)]="activeView"
              optionLabel="label"
              optionValue="value"
              [allowEmpty]="false"
            />
            <p-button label="New Task" icon="pi pi-plus" size="small" (onClick)="openNewTask()" />
          </div>
        </div>
        @if (ini.description) {
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ ini.description }}</p>
        }
      </header>

      @switch (activeView()) {
        @case ('board') {
          <app-task-board
            (taskClick)="openEditTask($event)"
            (assigneeClick)="onAssigneeClick($event)"
          />
        }
        @case ('grid') {
          <app-task-grid
            (taskClick)="openEditTask($event)"
            (assigneeClick)="onAssigneeClick($event)"
          />
        }
      }

      <app-cpm-chart [tasks]="initiativeTasks()" />

      <app-task-editor
        [task]="selectedTask()"
        [visible]="editorVisible()"
        [initiativeId]="ini.id"
        (visibleChange)="editorVisible.set($event)"
        (saved)="onTaskSaved()"
      />

      <app-call-popover />
    }
  `,
})
export class InitiativeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly initiativeService = inject(InitiativeService);
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);

  readonly initiative = signal<Initiative | null>(null);
  readonly initiativeTasks = this.taskService.tasks;
  readonly activeView = signal<'board' | 'grid'>('board');
  readonly editorVisible = signal(false);
  readonly selectedTask = signal<Task | null>(null);
  readonly callPopover = viewChild(CallPopoverComponent);

  readonly viewOptions = [
    { label: 'Board', value: 'board' },
    { label: 'Table', value: 'grid' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.initiativeService.getInitiative(id).subscribe({
      next: (ini) => this.initiative.set(ini),
    });
    this.taskService.loadTasks({ initiativeId: id });
    this.userService.loadUsers();
  }

  openNewTask(): void {
    this.selectedTask.set(null);
    this.editorVisible.set(true);
  }

  openEditTask(task: Task): void {
    this.selectedTask.set(task);
    this.editorVisible.set(true);
  }

  onTaskSaved(): void {
    this.selectedTask.set(null);
    const id = this.route.snapshot.paramMap.get('id')!;
    this.taskService.loadTasks({ initiativeId: id });
  }

  onAssigneeClick(data: { user: User; event: MouseEvent }): void {
    this.callPopover()?.show(data.user, data.event);
  }
}
