import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Project, ProjectStatus } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/projects`;

  private readonly projectsSignal = signal<Project[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly projects = this.projectsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly activeProjects = computed(() =>
    this.projectsSignal().filter((p) => p.status === 'active'),
  );

  loadProjects(query?: { status?: ProjectStatus; memberId?: string }): void {
    this.loadingSignal.set(true);
    let params = new HttpParams();
    if (query?.status) params = params.set('status', query.status);
    if (query?.memberId) params = params.set('memberId', query.memberId);

    this.http.get<Project[]>(this.baseUrl, { params }).subscribe({
      next: (projects) => {
        this.projectsSignal.set(projects);
        this.loadingSignal.set(false);
      },
      error: (err) => {
        this.errorSignal.set(err.message);
        this.loadingSignal.set(false);
      },
    });
  }

  getProject(id: string) {
    return this.http.get<Project>(`${this.baseUrl}/${id}`);
  }

  createProject(data: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(this.baseUrl, data).pipe(
      tap({
        next: (created) => {
          this.projectsSignal.update((projects) => [created, ...projects]);
        },
        error: (err) => {
          this.errorSignal.set(err.message);
        },
      }),
    );
  }

  updateProject(id: string, data: Partial<Project>): Observable<Project> {
    const url = `${this.baseUrl}/${id}`;
    return this.http.patch<Project>(url, data).pipe(
      tap({
        next: (updated) => {
          this.projectsSignal.update((projects) =>
            projects.map((p) => (p.id === updated.id ? updated : p)),
          );
        },
        error: (err) => {
          this.errorSignal.set(err.message);
        },
      }),
    );
  }

  deleteProject(id: string): Observable<void> {
    const url = `${this.baseUrl}/${id}`;
    return this.http.delete<void>(url).pipe(
      tap({
        next: () => {
          this.projectsSignal.update((projects) => projects.filter((p) => p.id !== id));
        },
        error: (err) => {
          this.errorSignal.set(err.message);
        },
      }),
    );
  }

  toggleHot(id: string): void {
    this.http.patch<Project>(`${this.baseUrl}/${id}/hot`, {}).subscribe({
      next: (updated) => {
        this.projectsSignal.update((projects) =>
          projects.map((p) => (p.id === updated.id ? updated : p)),
        );
      },
      error: (err) => this.errorSignal.set(err.message),
    });
  }

  addMember(projectId: string, userId: string, role: string): void {
    this.http.post(`${this.baseUrl}/${projectId}/members`, { userId, role }).subscribe({
      next: () => this.loadProjects(),
      error: (err) => this.errorSignal.set(err.message),
    });
  }

  removeMember(projectId: string, memberId: string): void {
    this.http.delete(`${this.baseUrl}/${projectId}/members/${memberId}`).subscribe({
      next: () => this.loadProjects(),
      error: (err) => this.errorSignal.set(err.message),
    });
  }

  bookKickoff(
    projectId: string,
    kickoffTime: string,
    durationMinutes?: number,
  ): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/${projectId}/book-kickoff`, {
      kickoffTime,
      durationMinutes,
    });
  }

  getKickoffAttendance(projectId: string): Observable<{
    meetingId: string | null;
    meetingUrl?: string;
    attendance: {
      email: string;
      displayName: string;
      attended: boolean;
      duration: number;
    }[];
  }> {
    return this.http.get<{
      meetingId: string | null;
      meetingUrl?: string;
      attendance: {
        email: string;
        displayName: string;
        attended: boolean;
        duration: number;
      }[];
    }>(`${this.baseUrl}/${projectId}/kickoff-attendance`);
  }

  linkToDynamics(projectId: string, dynamicsNo: string): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/${projectId}/link-dynamics`, {
      dynamicsNo,
    });
  }
}
