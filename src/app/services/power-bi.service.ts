import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SILENT_HTTP_ERRORS } from '../interceptors/error.interceptor';
import {
  PowerBiAdminReport,
  PowerBiEmbed,
  PowerBiRefresh,
  PowerBiReportPayload,
  PowerBiReportSummary,
} from '../models/power-bi.model';

@Injectable({ providedIn: 'root' })
export class PowerBiService {
  private readonly http = inject(HttpClient);
  private readonly reportsUrl = `${environment.apiUrl}/power-bi/reports`;
  private readonly adminUrl = `${environment.apiUrl}/power-bi/admin/reports`;

  private readonly myReportsSignal = signal<PowerBiReportSummary[] | null>(null);
  private readonly adminReportsSignal = signal<PowerBiAdminReport[]>([]);

  readonly myReports = this.myReportsSignal.asReadonly();
  readonly adminReports = this.adminReportsSignal.asReadonly();

  loadMyReports(): Observable<PowerBiReportSummary[]> {
    return this.http
      .get<PowerBiReportSummary[]>(this.reportsUrl, { context: this.silent() })
      .pipe(tap((reports) => this.myReportsSignal.set(reports)));
  }

  embed(id: string): Observable<PowerBiEmbed> {
    return this.http.get<PowerBiEmbed>(`${this.reportsUrl}/${id}/embed`, {
      context: this.silent(),
    });
  }

  refreshStatus(id: string, since?: string): Observable<PowerBiRefresh> {
    const params = since ? new HttpParams().set('since', since) : undefined;
    return this.http.get<PowerBiRefresh>(`${this.reportsUrl}/${id}/refresh`, {
      params,
      context: this.silent(),
    });
  }

  startRefresh(id: string): Observable<PowerBiRefresh> {
    return this.http.post<PowerBiRefresh>(`${this.reportsUrl}/${id}/refresh`, null, {
      context: this.silent(),
    });
  }

  loadAdminReports(): void {
    this.http.get<PowerBiAdminReport[]>(this.adminUrl).subscribe({
      next: (reports) => this.adminReportsSignal.set(reports),
    });
  }

  createReport(data: PowerBiReportPayload): Observable<PowerBiAdminReport> {
    return this.http
      .post<PowerBiAdminReport>(this.adminUrl, data)
      .pipe(
        tap((created) => this.adminReportsSignal.update((list) => this.sorted([...list, created]))),
      );
  }

  updateReport(id: string, data: Partial<PowerBiReportPayload>): Observable<PowerBiAdminReport> {
    return this.http
      .patch<PowerBiAdminReport>(`${this.adminUrl}/${id}`, data)
      .pipe(
        tap((updated) =>
          this.adminReportsSignal.update((list) =>
            this.sorted(list.map((report) => (report.id === updated.id ? updated : report))),
          ),
        ),
      );
  }

  deleteReport(id: string): Observable<{ success: boolean }> {
    return this.http
      .delete<{ success: boolean }>(`${this.adminUrl}/${id}`)
      .pipe(
        tap(() =>
          this.adminReportsSignal.update((list) => list.filter((report) => report.id !== id)),
        ),
      );
  }

  private silent(): HttpContext {
    return new HttpContext().set(SILENT_HTTP_ERRORS, true);
  }

  private sorted(reports: PowerBiAdminReport[]): PowerBiAdminReport[] {
    return [...reports].sort((a, b) => a.title.localeCompare(b.title));
  }
}
