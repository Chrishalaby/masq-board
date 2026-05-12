import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';
import { take } from 'rxjs/operators';
import { Project, PROJECT_STATUSES, ProjectStatus } from '../../../models/project.model';
import { ProjectService } from '../../../services/project.service';
import { DynamicsSyncDialogComponent } from '../dynamics-sync-dialog/dynamics-sync-dialog.component';
import { ProjectCardComponent } from '../project-card/project-card.component';
import { ProjectEditorComponent } from '../project-editor/project-editor.component';

@Component({
  selector: 'app-project-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    FormsModule,
    Button,
    Select,
    Toast,
    ProjectCardComponent,
    ProjectEditorComponent,
    DynamicsSyncDialogComponent,
  ],
  template: `
    <p-toast />

    <header
      class="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-700"
    >
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
      <div class="flex items-center gap-3">
        <p-select
          [(ngModel)]="statusFilter"
          [options]="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All Statuses"
          [showClear]="true"
          (onChange)="onFilterChange()"
        />
        <p-button label="New Project" icon="pi pi-plus" (onClick)="openNewProject()" />
        <p-button
          label="Sync from Dynamics"
          icon="pi pi-sync"
          severity="secondary"
          [outlined]="true"
          (onClick)="openDynamicsSync()"
        />
      </div>
    </header>

    <!-- Pending Apollo Projects -->
    @if (pendingApolloProjects().length > 0) {
      <section
        aria-label="Pending Apollo Projects"
        class="mx-6 mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950"
      >
        <h2
          class="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400"
        >
          <i class="pi pi-clock"></i>
          Pending Apollo Projects ({{ pendingApolloProjects().length }})
        </h2>
        <div class="flex flex-col gap-2">
          @for (project of pendingApolloProjects(); track project.id) {
            <div
              class="flex items-center justify-between rounded border border-amber-200 bg-white px-4 py-2 dark:border-amber-800 dark:bg-gray-900"
            >
              <div class="flex flex-col">
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ project.name }}</span>
                @if (project.description) {
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{
                    project.description
                  }}</span>
                }
                <span class="text-xs text-amber-600 dark:text-amber-400">
                  Apollo ID: {{ project.apolloProjectId }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <p-button
                  label="Accept"
                  icon="pi pi-check"
                  size="small"
                  severity="success"
                  [loading]="isAccepting(project.id)"
                  (onClick)="acceptProject(project)"
                />
                <p-button
                  label="Dismiss"
                  icon="pi pi-times"
                  size="small"
                  severity="secondary"
                  [outlined]="true"
                  [loading]="isDismissing(project.id)"
                  (onClick)="dismissProject(project)"
                />
              </div>
            </div>
          }
        </div>
      </section>
    }

    <div class="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      @for (project of activeProjects(); track project.id) {
        <app-project-card [project]="project" (cardClick)="onProjectClick($event)" />
      } @empty {
        <p class="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
          No projects found. Create one to get started.
        </p>
      }
    </div>

    <app-project-editor
      [project]="selectedProject()"
      [visible]="editorVisible()"
      (visibleChange)="editorVisible.set($event)"
      (saved)="onSaved()"
    />

    <app-dynamics-sync-dialog (closed)="onSaved()" />
  `,
})
export class ProjectShellComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  /** All non-pending projects (excludes Apollo pending-approval ones) */
  readonly activeProjects = computed(() =>
    this.projectService.projects().filter((p) => !p.isPendingApproval),
  );

  readonly pendingApolloProjects = this.projectService.pendingApolloProjects;
  private readonly _accepting = signal<Set<string>>(new Set());
  private readonly _dismissing = signal<Set<string>>(new Set());
  readonly editorVisible = signal(false);
  readonly selectedProject = signal<Project | null>(null);
  readonly statusFilter = signal<ProjectStatus | null>(null);
  readonly dynamicsSyncDialog = viewChild(DynamicsSyncDialogComponent);

  readonly statusOptions = PROJECT_STATUSES;

  ngOnInit(): void {
    this.projectService.loadProjects();
  }

  openNewProject(): void {
    this.selectedProject.set(null);
    this.editorVisible.set(true);
  }

  onProjectClick(project: Project): void {
    this.router.navigate(['/projects', project.id]);
  }

  onSaved(): void {
    this.selectedProject.set(null);
    this.projectService.loadProjects();
  }

  onFilterChange(): void {
    const status = this.statusFilter() ?? undefined;
    this.projectService.loadProjects({ status });
  }

  openDynamicsSync(): void {
    this.dynamicsSyncDialog()?.open();
  }

  isAccepting(projectId: string): boolean {
    return this._accepting().has(projectId);
  }

  isDismissing(projectId: string): boolean {
    return this._dismissing().has(projectId);
  }

  acceptProject(project: Project): void {
    this._accepting.update((s) => new Set([...s, project.id]));
    this.projectService
      .acceptApolloProject(project.id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this._accepting.update((s) => {
            const next = new Set(s);
            next.delete(project.id);
            return next;
          });
          this.messageService.add({
            severity: 'success',
            summary: 'Project Accepted',
            detail: `"${project.name}" has been created as a full project.`,
            life: 4000,
          });
        },
        error: () => {
          this._accepting.update((s) => {
            const next = new Set(s);
            next.delete(project.id);
            return next;
          });
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to accept project. Please try again.',
            life: 5000,
          });
        },
      });
  }

  dismissProject(project: Project): void {
    this._dismissing.update((s) => new Set([...s, project.id]));
    this.projectService
      .dismissApolloProject(project.id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this._dismissing.update((s) => {
            const next = new Set(s);
            next.delete(project.id);
            return next;
          });
        },
        error: () => {
          this._dismissing.update((s) => {
            const next = new Set(s);
            next.delete(project.id);
            return next;
          });
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to dismiss project.',
            life: 5000,
          });
        },
      });
  }
}
