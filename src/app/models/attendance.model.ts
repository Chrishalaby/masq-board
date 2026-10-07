export type AttendanceStatus = 'not-checked-in' | 'checked-in' | 'checked-out';

export interface AttendanceSession {
  readonly id: string;
  readonly checkInAt: string;
  readonly checkOutAt: string | null;
  readonly utcOffsetMinutes: number;
  readonly durationMinutes: number | null;
}

export interface AttendanceDay {
  readonly workDate: string;
  readonly status: AttendanceStatus;
  readonly sessions: AttendanceSession[];
  readonly workedMinutes: number;
}

export interface AttendanceReportRow {
  readonly id: string;
  readonly userId: string;
  readonly employeeName: string;
  readonly employeeEmail: string;
  readonly workDate: string;
  readonly checkInAt: string;
  readonly checkOutAt: string | null;
  readonly utcOffsetMinutes: number;
  readonly durationMinutes: number | null;
}

export interface AttendanceReportPage {
  readonly rows: AttendanceReportRow[];
  readonly total: number;
  readonly totalMinutes: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface AttendanceEmployee {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
}

export interface AttendanceReportFilter {
  readonly from: string;
  readonly to: string;
  readonly userId: string | null;
}

export type AttendanceReportSortField = 'date' | 'employee' | 'duration';

export interface AttendanceReportQuery extends AttendanceReportFilter {
  readonly page: number;
  readonly pageSize: number;
  readonly sortField: AttendanceReportSortField;
  readonly sortOrder: 'asc' | 'desc';
}

export interface AttendanceAccess {
  readonly checkInUserIds: string[];
  readonly reportUserIds: string[];
}

export interface AttendanceAccessChange {
  readonly grantCheckIn: string[];
  readonly revokeCheckIn: string[];
  readonly grantReports: string[];
  readonly revokeReports: string[];
}

export interface AttendanceExportLink {
  readonly url: string;
  readonly expiresAt: string;
}
