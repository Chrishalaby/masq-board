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
  standaloneOnly?: boolean;
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
      'in-progress': [],
      blocked: [],
      completed: [],
    };
    for (const task of tasks) {
      grouped[task.status].push(task);
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

  private toApiPayload(task: Partial<Task>): Record<string, unknown> {
    return {
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      startDate: task.startDate || undefined,
      dueDate: task.dueDate || undefined,
      currentMilestone: task.currentMilestone || undefined,
      nextMilestone: task.nextMilestone || undefined,
      delayRisk: task.delayRisk || undefined,
      projectId: task.projectId || undefined,
      assigneeId: task.assigneeId || undefined,
      labelIds: task.labels?.map((l) => l.id) || undefined,
      checklist: task.checklist?.map((c) => ({
        title: c.title,
        completed: c.completed,
      })),
    };
  }
}
