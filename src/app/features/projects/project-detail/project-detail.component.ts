import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { Tag } from 'primeng/tag';
import { Project, ProjectStatus } from '../../../models/project.model';
import { Task } from '../../../models/task.model';
import { ProjectService } from '../../../services/project.service';
import { TaskService } from '../../../services/task.service';
import { TaskBoardComponent } from '../../tasks/task-board/task-board.component';
import { TaskEditorComponent } from '../../tasks/task-editor/task-editor.component';
import { TaskGridComponent } from '../../tasks/task-grid/task-grid.component';

@Component({
  selector: 'app-project-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Button,
    Tag,
    DatePipe,
    FormsModule,
    SelectButton,
    TaskBoardComponent,
    TaskGridComponent,
    TaskEditorComponent,
  ],
  template: `
    @if (project(); as p) {
      <header class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <div class="mb-3 flex items-center gap-2">
          <a routerLink="/projects" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >← Projects</a
          >
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ p.name }}</h1>
            @if (p.isHot) {
              <span title="Hot project">🔥</span>
            }
            <p-tag [value]="p.status" [severity]="statusSeverity(p.status)" [rounded]="true" />
          </div>
          <div class="flex items-center gap-2">
            <p-button
              [label]="p.isHot ? 'Unmark Hot' : 'Mark Hot'"
              [severity]="p.isHot ? 'danger' : 'secondary'"
              [outlined]="true"
              size="small"
              (onClick)="onToggleHot()"
            />
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
        @if (p.description) {
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ p.description }}</p>
        }
        <div class="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          @if (p.startDate) {
            <span>Start: {{ p.startDate | date: 'mediumDate' }}</span>
          }
          @if (p.endDate) {
            <span>End: {{ p.endDate | date: 'mediumDate' }}</span>
          }
          @if (p.members?.length) {
            <span>{{ p.members!.length }} members</span>
          }
        </div>
        @if (p.members?.length) {
          <div class="mt-2 flex flex-wrap gap-2">
            @for (m of p.members; track m.id) {
              <span
                class="rounded-full bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700"
                [title]="m.role"
              >
                {{ m.user?.displayName ?? m.userId }} — {{ m.role }}
              </span>
            }
          </div>
        }
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
        [projectId]="p.id"
        (visibleChange)="editorVisible.set($event)"
        (saved)="onTaskSaved()"
      />
    }
  `,
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);

  readonly project = signal<Project | null>(null);
  readonly activeView = signal<'board' | 'grid'>('board');
  readonly editorVisible = signal(false);
  readonly selectedTask = signal<Task | null>(null);

  readonly viewOptions = [
    { label: 'Board', value: 'board' },
    { label: 'Table', value: 'grid' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.projectService.getProject(id).subscribe({
      next: (p) => this.project.set(p),
    });
    this.taskService.loadTasks({ projectId: id });
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
    this.taskService.loadTasks({ projectId: id });
  }

  onToggleHot(): void {
    const p = this.project();
    if (p) {
      this.projectService.toggleHot(p.id);
      this.project.set({ ...p, isHot: !p.isHot });
    }
  }

  statusSeverity(s: ProjectStatus): 'danger' | 'warn' | 'info' | 'success' | 'secondary' {
    const map: Record<ProjectStatus, 'danger' | 'warn' | 'info' | 'success' | 'secondary'> = {
      draft: 'secondary',
      active: 'info',
      'on-hold': 'warn',
      completed: 'success',
      archived: 'danger',
    };
    return map[s];
  }
}
