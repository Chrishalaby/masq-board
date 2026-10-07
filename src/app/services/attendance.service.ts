import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { currentUtcOffsetMinutes } from '../features/attendance/attendance-format';
import {
  AttendanceAccess,
  AttendanceAccessChange,
  AttendanceDay,
  AttendanceEmployee,
  AttendanceExportLink,
  AttendanceReportFilter,
  AttendanceReportPage,
  AttendanceReportQuery,
} from '../models/attendance.model';

interface ExportLinkResponse {
  readonly token: string;
  readonly expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/attendance`;

  today(): Observable<AttendanceDay> {
    const params = new HttpParams().set('utcOffsetMinutes', currentUtcOffsetMinutes());
    return this.http.get<AttendanceDay>(`${this.baseUrl}/me`, { params });
  }

  checkIn(): Observable<AttendanceDay> {
    return this.http.post<AttendanceDay>(`${this.baseUrl}/check-in`, {
      utcOffsetMinutes: currentUtcOffsetMinutes(),
    });
  }

  checkOut(): Observable<AttendanceDay> {
    return this.http.post<AttendanceDay>(`${this.baseUrl}/check-out`, {
      utcOffsetMinutes: currentUtcOffsetMinutes(),
    });
  }

  report(query: AttendanceReportQuery): Observable<AttendanceReportPage> {
    let params = new HttpParams()
      .set('from', query.from)
      .set('to', query.to)
      .set('page', query.page)
      .set('pageSize', query.pageSize)
      .set('sortField', query.sortField)
      .set('sortOrder', query.sortOrder);
    if (query.userId) params = params.set('userId', query.userId);
    return this.http.get<AttendanceReportPage>(`${this.baseUrl}/reports`, { params });
  }

  reportEmployees(): Observable<AttendanceEmployee[]> {
    return this.http.get<AttendanceEmployee[]>(`${this.baseUrl}/reports/employees`);
  }

  createExportLink(filter: AttendanceReportFilter): Observable<AttendanceExportLink> {
    const body = {
      from: filter.from,
      to: filter.to,
      ...(filter.userId ? { userId: filter.userId } : {}),
    };
    return this.http.post<ExportLinkResponse>(`${this.baseUrl}/reports/export-link`, body).pipe(
      map((link) => ({
        url: `${this.baseUrl}/reports/download?token=${encodeURIComponent(link.token)}`,
        expiresAt: link.expiresAt,
      })),
    );
  }

  updateAccess(change: AttendanceAccessChange): Observable<AttendanceAccess> {
    return this.http.put<AttendanceAccess>(`${this.baseUrl}/access`, change);
  }
}
