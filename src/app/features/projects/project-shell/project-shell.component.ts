import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { Project, PROJECT_STATUSES, ProjectStatus } from '../../../models/project.model';
import { ProjectService } from '../../../services/project.service';
import { ProjectCardComponent } from '../project-card/project-card.component';
import { ProjectEditorComponent } from '../project-editor/project-editor.component';

@Component({
  selector: 'app-project-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, Select, ProjectCardComponent, ProjectEditorComponent],
  template: `
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
      </div>
    </header>

    <div class="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      @for (project of projects(); track project.id) {
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
  `,
})
export class ProjectShellComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);

  readonly projects = this.projectService.projects;
  readonly editorVisible = signal(false);
  readonly selectedProject = signal<Project | null>(null);
  readonly statusFilter = signal<ProjectStatus | null>(null);

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
}
