import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'projects',
    pathMatch: 'full',
  },
  {
    path: 'projects',
    loadComponent: () =>
      import('./features/projects/project-shell/project-shell.component').then(
        (m) => m.ProjectShellComponent,
      ),
  },
  {
    path: 'projects/:id',
    loadComponent: () =>
      import('./features/projects/project-detail/project-detail.component').then(
        (m) => m.ProjectDetailComponent,
      ),
  },
  {
    path: 'tasks',
    loadComponent: () =>
      import('./features/tasks/task-shell/task-shell.component').then((m) => m.TaskShellComponent),
  },
];
