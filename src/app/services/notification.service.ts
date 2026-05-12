import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AppNotification, NotificationCategory } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  private readonly notificationsSignal = signal<AppNotification[]>([]);
  private readonly loadingSignal = signal(false);

  readonly notifications = this.notificationsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  readonly unreadCount = computed(
    () => this.notificationsSignal().filter((n) => n.status === 'unread').length,
  );

  readonly byCategory = computed(() => {
    const result = new Map<NotificationCategory, AppNotification[]>();
    for (const n of this.notificationsSignal()) {
      if (n.status === 'dismissed') continue;
      const list = result.get(n.category) ?? [];
      list.push(n);
      result.set(n.category, list);
    }
    return result;
  });

  loadNotifications(): void {
    this.loadingSignal.set(true);
    this.http.get<AppNotification[]>(this.baseUrl).subscribe({
      next: (items) => {
        this.notificationsSignal.set(items);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadingSignal.set(false);
      },
    });
  }

  markAsRead(id: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.baseUrl}/${id}/read`, {}).pipe(
      tap({
        next: (updated) =>
          this.notificationsSignal.update((items) => items.map((n) => (n.id === id ? updated : n))),
      }),
    );
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/mark-all-read`, {}).pipe(
      tap({
        next: () =>
          this.notificationsSignal.update((items) =>
            items.map((n) => (n.status === 'unread' ? { ...n, status: 'read' } : n)),
          ),
      }),
    );
  }

  dismiss(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap({
        next: () =>
          this.notificationsSignal.update((items) =>
            items.map((n) => (n.id === id ? { ...n, status: 'dismissed' } : n)),
          ),
      }),
    );
  }
}
