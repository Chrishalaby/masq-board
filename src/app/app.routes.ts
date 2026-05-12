import { Routes } from '@angular/router';
import { adminGuard } from './auth/admin.guard';

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
    path: 'personal-assistant',
    loadComponent: () =>
      import('./features/personal-assistant/personal-assistant.component').then(
        (m) => m.PersonalAssistantComponent,
      ),
  },
  {
    path: 'task-templates',
    loadComponent: () =>
      import('./features/tasks/task-templates/task-templates.component').then(
        (m) => m.TaskTemplatesComponent,
      ),
  },
  {
    path: 'labels',
    loadComponent: () =>
      import('./features/tasks/labels/labels.component').then((m) => m.LabelsComponent),
  },
  {
    path: 'notes',
    loadComponent: () =>
      import('./features/notes/notes-board/notes-board.component').then(
        (m) => m.NotesBoardComponent,
      ),
  },
  {
    path: 'departments',
    loadComponent: () =>
      import('./features/departments/department-management/department-management.component').then(
        (m) => m.DepartmentManagementComponent,
      ),
  },
  {
    path: 'departments/initiatives/:id',
    loadComponent: () =>
      import('./features/departments/initiative-detail/initiative-detail.component').then(
        (m) => m.InitiativeDetailComponent,
      ),
  },
  {
    path: 'departments/:id',
    loadComponent: () =>
      import('./features/departments/department-management/department-management.component').then(
        (m) => m.DepartmentManagementComponent,
      ),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-panel/admin-panel.component').then(
        (m) => m.AdminPanelComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: 'exec-dashboard',
    loadComponent: () =>
      import('./features/exec-dashboard/exec-dashboard.component').then(
        (m) => m.ExecDashboardComponent,
      ),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./features/notifications/notification-center/notification-center.component').then(
        (m) => m.NotificationCenterComponent,
      ),
  },
];
