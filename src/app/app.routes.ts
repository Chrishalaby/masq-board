import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/tasks/task-shell/task-shell.component').then((m) => m.TaskShellComponent),
  },
];
