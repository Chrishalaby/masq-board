import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserAssignment } from '../models/user-assignment.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;
  private readonly assignmentsUrl = `${environment.apiUrl}/user-assignments`;

  private readonly usersSignal = signal<User[]>([]);
  private readonly currentUserSignal = signal<User | null>(null);

  readonly users = this.usersSignal.asReadonly();
  readonly currentUser = this.currentUserSignal.asReadonly();

  loadUsers(departmentId?: string): void {
    let params = new HttpParams();
    if (departmentId) params = params.set('departmentId', departmentId);
    this.http.get<User[]>(this.baseUrl, { params }).subscribe({
      next: (users) => this.usersSignal.set(users),
    });
  }

  loadCurrentUser(): void {
    this.http.get<User>(`${this.baseUrl}/me`).subscribe({
      next: (user) => this.currentUserSignal.set(user),
    });
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  /** Admin: update user fields (departmentId, isAdmin, isGeneralSupervisor, etc.) */
  updateUser(
    id: string,
    data: Partial<
      Pick<
        User,
        'displayName' | 'departmentId' | 'isAdmin' | 'isGeneralSupervisor' | 'isActive' | 'jobTitle'
      >
    >,
  ): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}`, data).pipe(
      tap((updated) => {
        this.usersSignal.update((users) => users.map((u) => (u.id === updated.id ? updated : u)));
        if (this.currentUserSignal()?.id === updated.id) {
          this.currentUserSignal.set(updated);
        }
      }),
    );
  }

  // --- User Assignments ---

  getAssignments(query: { userId?: string; departmentId?: string }): Observable<UserAssignment[]> {
    let params = new HttpParams();
    if (query.userId) params = params.set('userId', query.userId);
    if (query.departmentId) params = params.set('departmentId', query.departmentId);
    return this.http.get<UserAssignment[]>(this.assignmentsUrl, { params });
  }

  createAssignment(data: {
    userId: string;
    canAssignToUserId: string;
    departmentId: string;
  }): Observable<UserAssignment> {
    return this.http.post<UserAssignment>(this.assignmentsUrl, data);
  }

  deleteAssignment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.assignmentsUrl}/${id}`);
  }
}
