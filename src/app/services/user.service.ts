import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  private readonly usersSignal = signal<User[]>([]);
  private readonly currentUserSignal = signal<User | null>(null);

  readonly users = this.usersSignal.asReadonly();
  readonly currentUser = this.currentUserSignal.asReadonly();

  loadUsers(): void {
    this.http.get<User[]>(this.baseUrl).subscribe({
      next: (users) => this.usersSignal.set(users),
    });
  }

  loadCurrentUser(): void {
    this.http.get<User>(`${this.baseUrl}/me`).subscribe({
      next: (user) => this.currentUserSignal.set(user),
    });
  }

  getUser(id: string) {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }
}
