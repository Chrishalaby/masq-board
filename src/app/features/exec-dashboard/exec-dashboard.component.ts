import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { Task, TaskPriority, TaskStatus } from '../../models/task.model';
import { UserAssignment } from '../../models/user-assignment.model';
import { UserService } from '../../services/user.service';

interface DashboardStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
}

@Component({
  selector: 'app-exec-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ChartModule],
  template: `
    <div class="mx-auto max-w-7xl px-6 py-6">
      <div class="mb-4">
        <a routerLink="/" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >← Home</a
        >
      </div>

      @if (!hasAccess()) {
        <div
          class="rounded-xl border border-dashed border-gray-300 p-16 text-center dark:border-gray-600"
        >
          <i class="pi pi-lock text-5xl text-gray-300 dark:text-gray-600"></i>
          <h1 class="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h1>
          <p class="mt-2 text-gray-500 dark:text-gray-400">
            You do not have permission to access the Executive Dashboard.
          </p>
        </div>
      } @else {
        <h1 class="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Executive Dashboard
        </h1>
        <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">{{ accessLevelLabel() }}</p>

        <!-- KPI Summary Cards -->
        <div class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div
            class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <p class="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
            <p class="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {{ stats().total }}
            </p>
          </div>
          <div
            class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <p class="text-sm text-gray-500 dark:text-gray-400">Completed</p>
            <p class="mt-1 text-3xl font-bold text-green-600">
              {{ stats().byStatus['completed'] }}
            </p>
          </div>
          <div
            class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <p class="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
            <p class="mt-1 text-3xl font-bold text-blue-600">
              {{ stats().byStatus['in-progress'] }}
            </p>
          </div>
          <div
            class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <p class="text-sm text-gray-500 dark:text-gray-400">Urgent</p>
            <p class="mt-1 text-3xl font-bold text-red-600">
              {{ stats().byPriority['urgent'] }}
            </p>
          </div>
        </div>

        <!-- Charts Row 1: Status + Priority -->
        <div class="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div
            class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <h2 class="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
              Tasks by Status
            </h2>
            <p-chart type="pie" [data]="statusChartData()" [options]="pieOptions" height="300px" />
          </div>
          <div
            class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <h2 class="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
              Tasks by Priority
            </h2>
            <p-chart
              type="pie"
              [data]="priorityChartData()"
              [options]="pieOptions"
              height="300px"
            />
          </div>
        </div>

        <!-- Charts Row 2: By Project + By Initiative -->
        <div class="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div
            class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <h2 class="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
              Tasks by Project
            </h2>
            @if (projectChartData().labels.length) {
              <p-chart
                type="bar"
                [data]="projectChartData()"
                [options]="barOptions"
                height="300px"
              />
            } @else {
              <p class="py-8 text-center text-sm text-gray-400">No project data.</p>
            }
          </div>
          <div
            class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <h2 class="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
              Tasks by Initiative
            </h2>
            @if (initiativeChartData().labels.length) {
              <p-chart
                type="bar"
                [data]="initiativeChartData()"
                [options]="barOptions"
                height="300px"
              />
            } @else {
              <p class="py-8 text-center text-sm text-gray-400">No initiative data.</p>
            }
          </div>
        </div>

        <!-- Completion Rate by Project -->
        <div
          class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 class="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
            Completion Rate by Project
          </h2>
          @if (completionChartData().labels.length) {
            <p-chart
              type="bar"
              [data]="completionChartData()"
              [options]="percentBarOptions"
              height="300px"
            />
          } @else {
            <p class="py-8 text-center text-sm text-gray-400">No project data.</p>
          }
        </div>
      }
    </div>
  `,
})
export class ExecDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  private readonly allTasks = signal<Task[]>([]);
  private readonly currentUser = this.userService.currentUser;
  private readonly myAssignments = signal<UserAssignment[]>([]);

  readonly hasAccess = computed(() => {
    const user = this.currentUser();
    if (!user) return false;
    return user.isGeneralSupervisor || user.canAccessExecDashboard || user.isAdmin;
  });

  readonly accessLevelLabel = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    if (user.isGeneralSupervisor) return 'Viewing all tasks across all initiatives and projects';
    if (this.myAssignments().length > 0) return "Viewing your tasks and your assignees' tasks";
    return 'Viewing your tasks';
  });

  readonly visibleTasks = computed(() => {
    const user = this.currentUser();
    const tasks = this.allTasks();
    if (!user) return [];

    if (user.isGeneralSupervisor) return tasks;

    const assignableIds = new Set(this.myAssignments().map((a) => a.canAssignToUserId));
    assignableIds.add(user.id);

    if (assignableIds.size > 1) {
      return tasks.filter(
        (t) =>
          (t.assigneeId && assignableIds.has(t.assigneeId)) ||
          t.assignees?.some((a) => assignableIds.has(a.userId)),
      );
    }

    return tasks.filter(
      (t) => t.assigneeId === user.id || t.assignees?.some((a) => a.userId === user.id),
    );
  });

  readonly stats = computed((): DashboardStats => {
    const tasks = this.visibleTasks();
    const byStatus: Record<TaskStatus, number> = {
      'not-started': 0,
      'on-hold': 0,
      'in-progress': 0,
      completed: 0,
    };
    const byPriority: Record<TaskPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    for (const t of tasks) {
      byStatus[t.status]++;
      byPriority[t.priority]++;
    }
    return { total: tasks.length, byStatus, byPriority };
  });

  readonly statusChartData = computed(() => {
    const s = this.stats().byStatus;
    return {
      labels: ['Not Started', 'On Hold', 'In Progress', 'Completed'],
      datasets: [
        {
          data: [s['not-started'], s['on-hold'], s['in-progress'], s['completed']],
          backgroundColor: ['#9ca3af', '#f59e0b', '#3b82f6', '#22c55e'],
        },
      ],
    };
  });

  readonly priorityChartData = computed(() => {
    const p = this.stats().byPriority;
    return {
      labels: ['Low', 'Medium', 'High', 'Urgent'],
      datasets: [
        {
          data: [p.low, p.medium, p.high, p.urgent],
          backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
        },
      ],
    };
  });

  readonly projectChartData = computed(() => {
    const tasks = this.visibleTasks().filter((t) => t.projectId && t.project);
    const groups = new Map<string, { completed: number; total: number }>();
    for (const t of tasks) {
      const name = t.project?.name ?? t.projectId!;
      const g = groups.get(name) ?? { completed: 0, total: 0 };
      g.total++;
      if (t.status === 'completed') g.completed++;
      groups.set(name, g);
    }
    const labels = [...groups.keys()];
    return {
      labels,
      datasets: [
        {
          label: 'Completed',
          data: labels.map((l) => groups.get(l)!.completed),
          backgroundColor: '#22c55e',
        },
        {
          label: 'Remaining',
          data: labels.map((l) => groups.get(l)!.total - groups.get(l)!.completed),
          backgroundColor: '#94a3b8',
        },
      ],
    };
  });

  readonly initiativeChartData = computed(() => {
    const tasks = this.visibleTasks().filter((t) => t.initiativeId && t.initiative);
    const groups = new Map<string, { completed: number; total: number }>();
    for (const t of tasks) {
      const name = t.initiative?.name ?? t.initiativeId!;
      const g = groups.get(name) ?? { completed: 0, total: 0 };
      g.total++;
      if (t.status === 'completed') g.completed++;
      groups.set(name, g);
    }
    const labels = [...groups.keys()];
    return {
      labels,
      datasets: [
        {
          label: 'Completed',
          data: labels.map((l) => groups.get(l)!.completed),
          backgroundColor: '#22c55e',
        },
        {
          label: 'Remaining',
          data: labels.map((l) => groups.get(l)!.total - groups.get(l)!.completed),
          backgroundColor: '#94a3b8',
        },
      ],
    };
  });

  readonly completionChartData = computed(() => {
    const tasks = this.visibleTasks().filter((t) => t.projectId && t.project);
    const groups = new Map<string, { completed: number; total: number }>();
    for (const t of tasks) {
      const name = t.project?.name ?? t.projectId!;
      const g = groups.get(name) ?? { completed: 0, total: 0 };
      g.total++;
      if (t.status === 'completed') g.completed++;
      groups.set(name, g);
    }
    const labels = [...groups.keys()];
    return {
      labels,
      datasets: [
        {
          label: 'Completion %',
          data: labels.map((l) => {
            const g = groups.get(l)!;
            return g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0;
          }),
          backgroundColor: '#6366f1',
        },
      ],
    };
  });

  readonly pieOptions = {
    plugins: { legend: { position: 'bottom' as const } },
    responsive: true,
    maintainAspectRatio: false,
  };

  readonly barOptions = {
    plugins: { legend: { position: 'top' as const } },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  readonly percentBarOptions = {
    plugins: { legend: { display: false } },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v: number) => `${v}%` },
      },
    },
  };

  constructor() {
    // Load assignments when user becomes available
    effect(() => {
      const user = this.currentUser();
      if (user) {
        untracked(() => {
          this.userService
            .getAssignments({ userId: user.id })
            .subscribe({ next: (rows) => this.myAssignments.set(rows) });
        });
      }
    });
  }

  ngOnInit(): void {
    this.userService.loadCurrentUser();

    // Load ALL tasks for the dashboard
    this.http.get<Task[]>(`${environment.apiUrl}/tasks`).subscribe({
      next: (tasks) => this.allTasks.set(tasks),
    });
  }
}
