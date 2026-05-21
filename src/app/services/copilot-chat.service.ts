import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { CopilotConversation, CopilotMessage } from '../models/copilot-chat.model';

@Injectable({ providedIn: 'root' })
export class CopilotChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/copilot-chat`;

  private readonly conversationsSignal = signal<CopilotConversation[]>([]);
  private readonly activeConversationSignal = signal<CopilotConversation | null>(null);
  private readonly sendingSignal = signal(false);

  readonly conversations = this.conversationsSignal.asReadonly();
  readonly activeConversation = this.activeConversationSignal.asReadonly();
  readonly sending = this.sendingSignal.asReadonly();

  loadConversations(): void {
    this.http
      .get<CopilotConversation[]>(this.baseUrl)
      .subscribe((data) => this.conversationsSignal.set(data));
  }

  loadConversation(id: string): void {
    this.http
      .get<CopilotConversation>(`${this.baseUrl}/${id}`)
      .subscribe((data) => this.activeConversationSignal.set(data));
  }

  createConversation(title?: string): Observable<CopilotConversation> {
    return this.http.post<CopilotConversation>(this.baseUrl, { title }).pipe(
      tap((created) => {
        this.conversationsSignal.update((list) => [created, ...list]);
        this.activeConversationSignal.set({ ...created, messages: [] });
      }),
    );
  }

  deleteConversation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.conversationsSignal.update((list) => list.filter((c) => c.id !== id));
        if (this.activeConversationSignal()?.id === id) {
          this.activeConversationSignal.set(null);
        }
      }),
    );
  }

  sendMessage(conversationId: string, content: string): Observable<CopilotMessage> {
    this.sendingSignal.set(true);

    // Optimistically add user message to the active conversation
    const userMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      conversationId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    this.activeConversationSignal.update((conv) => {
      if (!conv) return conv;
      return {
        ...conv,
        messages: [...(conv.messages || []), userMsg],
      };
    });

    return this.http
      .post<CopilotMessage>(`${this.baseUrl}/${conversationId}/messages`, {
        content,
      })
      .pipe(
        tap({
          next: (assistantMsg) => {
            this.sendingSignal.set(false);
            this.activeConversationSignal.update((conv) => {
              if (!conv) return conv;
              return {
                ...conv,
                messages: [...(conv.messages || []), assistantMsg],
              };
            });
            // Update conversation title in the list if it changed
            this.loadConversations();
          },
          error: () => this.sendingSignal.set(false),
        }),
      );
  }

  clearActiveConversation(): void {
    this.activeConversationSignal.set(null);
  }
}
