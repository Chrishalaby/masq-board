import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { TaskTemplate } from '../models/task-template.model';

@Injectable({ providedIn: 'root' })
export class TaskTemplateService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/task-templates`;

  private readonly templatesSignal = signal<TaskTemplate[]>([]);
  private readonly isAdminSignal = signal(false);

  readonly templates = this.templatesSignal.asReadonly();
  readonly isAdmin = this.isAdminSignal.asReadonly();

  loadTemplates(): void {
    this.http.get<TaskTemplate[]>(this.baseUrl).subscribe({
      next: (templates) => this.templatesSignal.set(templates),
    });
  }

  checkAdmin(): void {
    this.http.get<{ isAdmin: boolean }>(`${this.baseUrl}/admin-check`).subscribe({
      next: (res) => this.isAdminSignal.set(res.isAdmin),
    });
  }

  createTemplate(data: Partial<TaskTemplate>): Observable<TaskTemplate> {
    return this.http.post<TaskTemplate>(this.baseUrl, data).pipe(
      tap((created) => {
        this.templatesSignal.update((list) => [...list, created]);
      }),
    );
  }

  updateTemplate(id: string, data: Partial<TaskTemplate>): Observable<TaskTemplate> {
    return this.http.patch<TaskTemplate>(`${this.baseUrl}/${id}`, data).pipe(
      tap((updated) => {
        this.templatesSignal.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
      }),
    );
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.templatesSignal.update((list) => list.filter((t) => t.id !== id));
      }),
    );
  }
}
