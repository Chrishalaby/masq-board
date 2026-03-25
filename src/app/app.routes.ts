import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
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
  {
    path: 'task-templates',
    loadComponent: () =>
      import('./features/tasks/task-templates/task-templates.component').then(
        (m) => m.TaskTemplatesComponent,
      ),
  },
  {
    path: 'notes',
    loadComponent: () =>
      import('./features/notes/notes-board/notes-board.component').then(
        (m) => m.NotesBoardComponent,
      ),
  },
];
