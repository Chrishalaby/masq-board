import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Task, TaskStatus } from '../models/task.model';

interface QueryTaskParams {
  status?: TaskStatus;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  initiativeId?: string;
  standaloneOnly?: boolean;
}

interface ReorderItem {
  id: string;
  sortOrder: number;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tasks`;

  private readonly tasksSignal = signal<Task[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly tasks = this.tasksSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly tasksByStatus = computed(() => {
    const tasks = this.tasksSignal();
    const grouped: Record<TaskStatus, Task[]> = {
      'not-started': [],
      'on-hold': [],
      'in-progress': [],
      completed: [],
    };
    for (const task of tasks) {
      grouped[task.status].push(task);
    }
    // Sort each column by sortOrder ascending, then by createdAt descending as tiebreaker
    for (const status of Object.keys(grouped) as TaskStatus[]) {
      if (status === 'in-progress') {
        // In Progress column: always sort by due date ascending (no due date goes last)
        grouped[status].sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      } else {
        grouped[status].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
    }
    return grouped;
  });

  loadTasks(query?: QueryTaskParams): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    let params = new HttpParams();
    if (query?.status) params = params.set('status', query.status);
    if (query?.priority) params = params.set('priority', query.priority);
    if (query?.assigneeId) params = params.set('assigneeId', query.assigneeId);
    if (query?.projectId) params = params.set('projectId', query.projectId);
    if (query?.initiativeId) params = params.set('initiativeId', query.initiativeId);
    if (query?.standaloneOnly) params = params.set('standaloneOnly', 'true');

    this.http.get<Task[]>(this.baseUrl, { params }).subscribe({
      next: (tasks) => {
        this.tasksSignal.set(tasks);
        this.loadingSignal.set(false);
      },
      error: (err) => {
        this.errorSignal.set(err.message || 'Failed to load tasks');
        this.loadingSignal.set(false);
      },
    });
  }

  getTask(id: string): Task | undefined {
    return this.tasksSignal().find((t) => t.id === id);
  }

  addTask(task: Partial<Task>): Observable<Task> {
    const payload = this.toApiPayload(task);
    return this.http.post<Task>(this.baseUrl, payload).pipe(
      tap({
        next: (created) => {
          this.tasksSignal.update((tasks) => [created, ...tasks]);
        },
        error: (err) => {
          this.errorSignal.set(err.message);
        },
      }),
    );
  }

  updateTask(task: Task): Observable<Task> {
    const payload = this.toApiPayload(task);
    const url = `${this.baseUrl}/${task.id}`;
    return this.http.patch<Task>(url, payload).pipe(
      tap({
        next: (updated) => {
          this.tasksSignal.update((tasks) => tasks.map((t) => (t.id === updated.id ? updated : t)));
        },
        error: (err) => {
          this.errorSignal.set(err.message);
        },
      }),
    );
  }

  deleteTask(id: string): Observable<void> {
    const url = `${this.baseUrl}/${id}`;
    return this.http.delete<void>(url).pipe(
      tap({
        next: () => {
          this.tasksSignal.update((tasks) => tasks.filter((t) => t.id !== id));
        },
        error: (err) => {
          this.errorSignal.set(err.message);
        },
      }),
    );
  }

  moveTask(taskId: string, newStatus: TaskStatus): void {
    // Optimistic update
    this.tasksSignal.update((tasks) =>
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );

    this.http.patch<Task>(`${this.baseUrl}/${taskId}/status`, { status: newStatus }).subscribe({
      next: (updated) => {
        this.tasksSignal.update((tasks) => tasks.map((t) => (t.id === updated.id ? updated : t)));
      },
      error: (err) => {
        this.errorSignal.set(err.message);
        this.loadTasks(); // Reload on error to reset optimistic update
      },
    });
  }

  addDependency(taskId: string, dependsOnTaskId: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${taskId}/dependencies`, { dependsOnTaskId }).pipe(
      tap({
        next: () => this.loadTasks(),
        error: (err) => this.errorSignal.set(err.message),
      }),
    );
  }

  removeDependency(taskId: string, depId: string): void {
    this.http.delete(`${this.baseUrl}/${taskId}/dependencies/${depId}`).subscribe({
      next: () => this.loadTasks(),
      error: (err) => this.errorSignal.set(err.message),
    });
  }

  reorderTasks(items: ReorderItem[]): void {
    // Optimistic update
    this.tasksSignal.update((tasks) =>
      tasks.map((t) => {
        const item = items.find((i) => i.id === t.id);
        return item ? { ...t, sortOrder: item.sortOrder } : t;
      }),
    );

    this.http.patch(`${this.baseUrl}/reorder`, { items }).subscribe({
      error: (err) => {
        this.errorSignal.set(err.message);
        this.loadTasks();
      },
    });
  }

  uploadFile(taskId: string, file: File): Observable<{ url: string; name: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http
      .post<{ url: string; name: string }>(`${this.baseUrl}/${taskId}/upload`, formData)
      .pipe(
        tap({
          next: () => this.loadTasks(),
          error: (err) => this.errorSignal.set(err.message),
        }),
      );
  }

  private toApiPayload(task: Partial<Task>): Record<string, unknown> {
    return {
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      startDate: task.startDate || undefined,
      dueDate: task.dueDate || undefined,
      isRecurring: task.isRecurring ?? undefined,
      isCritical: task.isCritical ?? undefined,
      delayRisk: task.delayRisk || undefined,
      linkedFiles: task.linkedFiles,
      linkedFileNames: task.linkedFileNames,
      projectId: task.projectId || undefined,
      initiativeId: task.initiativeId || undefined,
      assigneeId: task.assigneeId || undefined,
      assignees: task.assignees?.map((a) => ({
        userId: a.userId,
        role: a.role ?? null,
      })),
      labelIds: task.labels?.map((l) => l.id) || undefined,
      checklist: task.checklist?.map((c, i) => ({
        title: c.title,
        completed: c.completed,
        sortOrder: c.sortOrder ?? i,
        assigneeId: c.assigneeId || undefined,
        deadline: c.deadline || undefined,
      })),
    };
  }
}
