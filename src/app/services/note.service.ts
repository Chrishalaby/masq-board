import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Note } from '../models/note.model';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notes`;

  readonly notes = signal<Note[]>([]);

  loadNotes(): void {
    this.http.get<Note[]>(this.base).subscribe((data) => this.notes.set(data));
  }

  loadByTaggedUser(userId: string): void {
    this.http
      .get<Note[]>(this.base, { params: { taggedUserId: userId } })
      .subscribe((data) => this.notes.set(data));
  }

  createNote(data: Partial<Note> & { taggedUserIds?: string[] }): Observable<Note> {
    return this.http.post<Note>(this.base, data).pipe(tap(() => this.loadNotes()));
  }

  updateNote(id: string, data: Partial<Note> & { taggedUserIds?: string[] }): Observable<Note> {
    return this.http.patch<Note>(`${this.base}/${id}`, data).pipe(tap(() => this.loadNotes()));
  }

  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(tap(() => this.loadNotes()));
  }
}
