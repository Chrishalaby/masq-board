import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  userId: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/todos`;

  private readonly todosSignal = signal<TodoItem[]>([]);
  readonly todos = this.todosSignal.asReadonly();

  loadTodos(): void {
    this.http.get<TodoItem[]>(this.baseUrl).subscribe({
      next: (todos) => this.todosSignal.set(todos),
    });
  }

  addTodo(title: string): Observable<TodoItem> {
    return this.http.post<TodoItem>(this.baseUrl, { title }).pipe(
      tap((created) => {
        this.todosSignal.update((list) => [...list, created]);
      }),
    );
  }

  toggleTodo(item: TodoItem): Observable<TodoItem> {
    return this.http
      .patch<TodoItem>(`${this.baseUrl}/${item.id}`, { completed: !item.completed })
      .pipe(
        tap((updated) => {
          this.todosSignal.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
        }),
      );
  }

  deleteTodo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.todosSignal.update((list) => list.filter((t) => t.id !== id));
      }),
    );
  }
}
