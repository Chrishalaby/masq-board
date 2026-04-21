import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Reminder {
  id: string;
  title: string;
  remindAt: string;
  sent: boolean;
  userId: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reminders`;

  private readonly remindersSignal = signal<Reminder[]>([]);
  readonly reminders = this.remindersSignal.asReadonly();

  loadReminders(): void {
    this.http.get<Reminder[]>(this.baseUrl).subscribe({
      next: (reminders) => this.remindersSignal.set(reminders),
    });
  }

  createReminder(data: { title: string; remindAt: string }): Observable<Reminder> {
    return this.http.post<Reminder>(this.baseUrl, data).pipe(
      tap((created) => {
        this.remindersSignal.update((list) => [...list, created]);
      }),
    );
  }

  deleteReminder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.remindersSignal.update((list) => list.filter((r) => r.id !== id));
      }),
    );
  }
}
