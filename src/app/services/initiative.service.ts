import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Initiative } from '../models/initiative.model';

@Injectable({ providedIn: 'root' })
export class InitiativeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/initiatives`;

  private readonly initiativesSignal = signal<Initiative[]>([]);

  readonly initiatives = this.initiativesSignal.asReadonly();

  loadInitiatives(departmentId?: string, assignedUserId?: string): void {
    let params = new HttpParams();
    if (departmentId) params = params.set('departmentId', departmentId);
    if (assignedUserId) params = params.set('assignedUserId', assignedUserId);
    this.http.get<Initiative[]>(this.baseUrl, { params }).subscribe({
      next: (list) => this.initiativesSignal.set(list),
    });
  }

  getInitiative(id: string): Observable<Initiative> {
    return this.http.get<Initiative>(`${this.baseUrl}/${id}`);
  }

  createInitiative(data: {
    name: string;
    description?: string;
    departmentId: string;
  }): Observable<Initiative> {
    return this.http.post<Initiative>(this.baseUrl, data).pipe(
      tap((created) => {
        this.initiativesSignal.update((list) => [created, ...list]);
      }),
    );
  }

  updateInitiative(
    id: string,
    data: Partial<{ name: string; description: string }>,
  ): Observable<Initiative> {
    return this.http.patch<Initiative>(`${this.baseUrl}/${id}`, data).pipe(
      tap((updated) => {
        this.initiativesSignal.update((list) =>
          list.map((i) => (i.id === updated.id ? updated : i)),
        );
      }),
    );
  }

  deleteInitiative(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.initiativesSignal.update((list) => list.filter((i) => i.id !== id));
      }),
    );
  }

  setExclusions(id: string, userIds: string[]): Observable<Initiative> {
    return this.http.patch<Initiative>(`${this.baseUrl}/${id}/exclusions`, { userIds }).pipe(
      tap((updated) => {
        this.initiativesSignal.update((list) =>
          list.map((i) => (i.id === updated.id ? updated : i)),
        );
      }),
    );
  }
}
