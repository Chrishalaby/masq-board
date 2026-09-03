import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ChangeItTicketStatusPayload,
  CreateItCommentPayload,
  CreateItTicketPayload,
  ItCategory,
  ItCategoryPayload,
  ItTicket,
  ItTicketComment,
  UpdateItTicketPayload,
} from '../models/it-ticket.model';

@Injectable({ providedIn: 'root' })
export class ItSupportService {
  private readonly http = inject(HttpClient);
  private readonly ticketsUrl = `${environment.apiUrl}/it-tickets`;
  private readonly categoriesUrl = `${environment.apiUrl}/it-categories`;

  private readonly ticketsSignal = signal<ItTicket[]>([]);
  private readonly categoriesSignal = signal<ItCategory[]>([]);
  private readonly loadingSignal = signal(false);

  readonly tickets = this.ticketsSignal.asReadonly();
  readonly categories = this.categoriesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  loadTickets(): void {
    this.loadingSignal.set(true);
    this.http.get<ItTicket[]>(this.ticketsUrl).subscribe({
      next: (tickets) => {
        this.ticketsSignal.set(tickets);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  loadCategories(): void {
    this.http.get<ItCategory[]>(this.categoriesUrl).subscribe({
      next: (categories) => this.categoriesSignal.set(categories),
    });
  }

  getTicket(id: string): Observable<ItTicket> {
    return this.http.get<ItTicket>(`${this.ticketsUrl}/${id}`);
  }

  createTicket(data: CreateItTicketPayload): Observable<ItTicket> {
    return this.http
      .post<ItTicket>(this.ticketsUrl, data)
      .pipe(tap((created) => this.ticketsSignal.update((list) => [created, ...list])));
  }

  updateTicket(id: string, data: UpdateItTicketPayload): Observable<ItTicket> {
    return this.http
      .patch<ItTicket>(`${this.ticketsUrl}/${id}`, data)
      .pipe(tap((updated) => this.replaceTicket(updated)));
  }

  changeStatus(id: string, data: ChangeItTicketStatusPayload): Observable<ItTicket> {
    return this.http
      .patch<ItTicket>(`${this.ticketsUrl}/${id}/status`, data)
      .pipe(tap((updated) => this.replaceTicket(updated)));
  }

  uploadAttachments(
    id: string,
    files: readonly File[],
    options: { notify?: boolean } = {},
  ): Observable<ItTicket> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    const params: Record<string, string> = options.notify === false ? { notify: 'false' } : {};
    return this.http
      .post<ItTicket>(`${this.ticketsUrl}/${id}/attachments`, formData, { params })
      .pipe(tap((updated) => this.replaceTicket(updated)));
  }

  deleteAttachment(id: string, index: number): Observable<ItTicket> {
    return this.http
      .delete<ItTicket>(`${this.ticketsUrl}/${id}/attachments/${index}`)
      .pipe(tap((updated) => this.replaceTicket(updated)));
  }

  getComments(ticketId: string): Observable<ItTicketComment[]> {
    return this.http.get<ItTicketComment[]>(`${this.ticketsUrl}/${ticketId}/comments`);
  }

  addComment(ticketId: string, input: CreateItCommentPayload): Observable<ItTicketComment> {
    const formData = new FormData();
    formData.append('body', input.body);
    if (input.mentionIds.length > 0) {
      formData.append('mentionIds', JSON.stringify(input.mentionIds));
    }
    for (const file of input.files) {
      formData.append('files', file, file.name);
    }
    return this.http.post<ItTicketComment>(`${this.ticketsUrl}/${ticketId}/comments`, formData);
  }

  deleteTicket(id: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(`${this.ticketsUrl}/${id}`)
      .pipe(tap(() => this.ticketsSignal.update((list) => list.filter((t) => t.id !== id))));
  }

  createCategory(data: ItCategoryPayload): Observable<ItCategory> {
    return this.http
      .post<ItCategory>(this.categoriesUrl, data)
      .pipe(
        tap((created) => this.categoriesSignal.update((list) => this.sorted([...list, created]))),
      );
  }

  updateCategory(id: string, data: Partial<ItCategoryPayload>): Observable<ItCategory> {
    return this.http
      .patch<ItCategory>(`${this.categoriesUrl}/${id}`, data)
      .pipe(
        tap((updated) =>
          this.categoriesSignal.update((list) =>
            this.sorted(list.map((c) => (c.id === updated.id ? updated : c))),
          ),
        ),
      );
  }

  deleteCategory(id: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(`${this.categoriesUrl}/${id}`)
      .pipe(tap(() => this.categoriesSignal.update((list) => list.filter((c) => c.id !== id))));
  }

  private replaceTicket(updated: ItTicket): void {
    this.ticketsSignal.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
  }

  private sorted(categories: ItCategory[]): ItCategory[] {
    return [...categories].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  }
}
