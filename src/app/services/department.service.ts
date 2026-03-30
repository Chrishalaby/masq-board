import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Department } from '../models/department.model';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/departments`;

  private readonly departmentsSignal = signal<Department[]>([]);

  readonly departments = this.departmentsSignal.asReadonly();

  loadDepartments(): void {
    this.http.get<Department[]>(this.baseUrl).subscribe({
      next: (depts) => this.departmentsSignal.set(depts),
    });
  }

  getDepartment(id: string): Observable<Department> {
    return this.http.get<Department>(`${this.baseUrl}/${id}`);
  }

  createDepartment(data: {
    name: string;
    description?: string;
    headOfDepartmentId?: string;
  }): Observable<Department> {
    return this.http.post<Department>(this.baseUrl, data).pipe(
      tap((created) => {
        this.departmentsSignal.update((depts) => [created, ...depts]);
      }),
    );
  }

  updateDepartment(
    id: string,
    data: Partial<{ name: string; description: string; headOfDepartmentId: string }>,
  ): Observable<Department> {
    return this.http.patch<Department>(`${this.baseUrl}/${id}`, data).pipe(
      tap((updated) => {
        this.departmentsSignal.update((depts) =>
          depts.map((d) => (d.id === updated.id ? updated : d)),
        );
      }),
    );
  }

  deleteDepartment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.departmentsSignal.update((depts) => depts.filter((d) => d.id !== id));
      }),
    );
  }
}
