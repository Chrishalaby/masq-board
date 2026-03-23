import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DynamicsJob {
  readonly No: string;
  readonly Description: string;
  readonly Status: string;
  readonly Starting_Date?: string;
  readonly Ending_Date?: string;
  readonly Bill_to_Customer_No?: string;
  readonly [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class DynamicsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/integrations/dynamics`;

  private readonly jobsSignal = signal<DynamicsJob[]>([]);
  private readonly loadingSignal = signal(false);

  readonly jobs = this.jobsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  loadJobs(): void {
    this.loadingSignal.set(true);
    this.http.get<DynamicsJob[]>(`${this.baseUrl}/jobs`).subscribe({
      next: (jobs) => {
        this.jobsSignal.set(jobs);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  importJobs(jobNos?: string[]): Observable<{ imported: number; skipped: number }> {
    return this.http.post<{ imported: number; skipped: number }>(`${this.baseUrl}/import`, {
      jobNos,
    });
  }

  exportProject(projectId: string): Observable<{ success: boolean; dynamicsNo?: string }> {
    return this.http.post<{ success: boolean; dynamicsNo?: string }>(
      `${this.baseUrl}/export/${projectId}`,
      {},
    );
  }
}
