import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Project, ProjectStatus } from '../models/project.model';
import { environment } from '../../environments/environment';

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

  createProject(data: Partial<Project>): void {
    this.http.post<Project>(this.baseUrl, data).subscribe({
      next: (created) => {
        this.projectsSignal.update((projects) => [created, ...projects]);
      },
      error: (err) => this.errorSignal.set(err.message),
    });
  }

  updateProject(id: string, data: Partial<Project>): void {
    this.http.patch<Project>(`${this.baseUrl}/${id}`, data).subscribe({
      next: (updated) => {
        this.projectsSignal.update((projects) =>
          projects.map((p) => (p.id === updated.id ? updated : p)),
        );
      },
      error: (err) => this.errorSignal.set(err.message),
    });
  }

  deleteProject(id: string): void {
    this.http.delete(`${this.baseUrl}/${id}`).subscribe({
      next: () => {
        this.projectsSignal.update((projects) => projects.filter((p) => p.id !== id));
      },
      error: (err) => this.errorSignal.set(err.message),
    });
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
    this.http
      .post(`${this.baseUrl}/${projectId}/members`, { userId, role })
      .subscribe({
        next: () => this.loadProjects(),
        error: (err) => this.errorSignal.set(err.message),
      });
  }

  removeMember(projectId: string, memberId: string): void {
    this.http
      .delete(`${this.baseUrl}/${projectId}/members/${memberId}`)
      .subscribe({
        next: () => this.loadProjects(),
        error: (err) => this.errorSignal.set(err.message),
      });
  }
}
