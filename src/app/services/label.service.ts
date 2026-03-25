import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Label } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class LabelService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/labels`;

  private readonly labelsSignal = signal<Label[]>([]);
  private readonly isAdminSignal = signal(false);

  readonly labels = this.labelsSignal.asReadonly();
  readonly isAdmin = this.isAdminSignal.asReadonly();

  loadLabels(): void {
    this.http.get<Label[]>(this.baseUrl).subscribe({
      next: (labels) => this.labelsSignal.set(labels),
    });
  }

  checkAdmin(): void {
    this.http.get<{ isAdmin: boolean }>(`${this.baseUrl}/admin-check`).subscribe({
      next: (res) => this.isAdminSignal.set(res.isAdmin),
    });
  }

  createLabel(name: string, color?: string): Observable<Label> {
    return this.http.post<Label>(this.baseUrl, { name, color }).pipe(
      tap((created) => {
        this.labelsSignal.update((list) => [...list, created]);
      }),
    );
  }

  updateLabel(id: string, data: Partial<Label>): Observable<Label> {
    return this.http.patch<Label>(`${this.baseUrl}/${id}`, data).pipe(
      tap((updated) => {
        this.labelsSignal.update((list) => list.map((l) => (l.id === updated.id ? updated : l)));
      }),
    );
  }

  deleteLabel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.labelsSignal.update((list) => list.filter((l) => l.id !== id));
      }),
    );
  }
}
