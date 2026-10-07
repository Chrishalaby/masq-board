import { DatePipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { catchError, filter, of, switchMap, tap } from 'rxjs';
import {
  AttendanceEmployee,
  AttendanceExportLink,
  AttendanceReportFilter,
  AttendanceReportPage,
  AttendanceReportQuery,
  AttendanceReportRow,
  AttendanceReportSortField,
} from '../../../models/attendance.model';
import { AttendanceService } from '../../../services/attendance.service';
import {
  datePipeTimezone,
  formatDuration,
  monthRange,
  toDateOnly,
  utcOffsetLabel,
} from '../attendance-format';

type PeriodMode = 'month' | 'range';

interface TableState {
  readonly first: number;
  readonly rows: number;
  readonly sortField: AttendanceReportSortField;
  readonly sortOrder: 1 | -1;
}

const MAX_RANGE_DAYS = 366;
const DAY_MS = 86_400_000;
const WORK_DAY_START_HOUR = 4;
const SORT_FIELDS: readonly AttendanceReportSortField[] = ['date', 'employee', 'duration'];
const DEFAULT_TABLE: TableState = { first: 0, rows: 25, sortField: 'date', sortOrder: -1 };

@Component({
  selector: 'app-attendance-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, Button, DatePicker, Select, SelectButton, TableModule],
  template: `
    <section aria-labelledby="attendance-reports-heading">
      <div class="mb-4">
        <h2
          id="attendance-reports-heading"
          class="text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          Reports
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Check-in and check-out activity for all employees, shown in each employee's local time.
        </p>
      </div>

      <div class="mb-4 flex flex-wrap items-end gap-4">
        <div class="flex flex-col gap-1">
          <label for="attendanceEmployee" class="text-sm font-medium">Employee</label>
          <p-select
            inputId="attendanceEmployee"
            class="w-64"
            [ngModel]="employeeId()"
            (ngModelChange)="setEmployee($event)"
            [options]="employees()"
            optionLabel="displayName"
            optionValue="id"
            placeholder="All employees"
            [showClear]="true"
            [filter]="true"
            filterBy="displayName,email"
          />
        </div>

        <div class="flex flex-col gap-1">
          <span id="attendancePeriodLabel" class="text-sm font-medium">Period</span>
          <p-selectbutton
            [ngModel]="periodMode()"
            (ngModelChange)="setPeriodMode($event)"
            [options]="periodOptions"
            optionLabel="label"
            optionValue="value"
            [allowEmpty]="false"
            ariaLabelledBy="attendancePeriodLabel"
          />
        </div>

        @if (periodMode() === 'month') {
          <div class="flex flex-col gap-1">
            <label for="attendanceMonth" class="text-sm font-medium">Month</label>
            <p-datepicker
              inputId="attendanceMonth"
              [ngModel]="month()"
              (ngModelChange)="setMonth($event)"
              view="month"
              dateFormat="MM yy"
              [readonlyInput]="true"
              [showIcon]="true"
              appendTo="body"
            />
          </div>
        } @else {
          <div class="flex w-72 flex-col gap-1">
            <label for="attendanceRange" class="text-sm font-medium">Date range</label>
            <p-datepicker
              inputId="attendanceRange"
              [fluid]="true"
              [ngModel]="range()"
              (ngModelChange)="setRange($event)"
              selectionMode="range"
              dateFormat="dd M yy"
              placeholder="Start date – end date"
              [readonlyInput]="true"
              [showIcon]="true"
              appendTo="body"
            />
          </div>
        }

        <div class="ml-auto">
          <p-button
            label="Export to Excel"
            icon="pi pi-file-excel"
            severity="secondary"
            [loading]="exporting()"
            [disabled]="!canExport()"
            (onClick)="exportReport()"
          />
        </div>
      </div>

      @if (rangeHint(); as hint) {
        <p class="mb-3 text-sm text-amber-700 dark:text-amber-400" role="status">{{ hint }}</p>
      }

      @if (exportLink(); as link) {
        <p
          class="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"
          role="status"
        >
          Your Excel file is on its way. If the download does not start,
          <a
            class="font-medium underline"
            [href]="link.url"
            target="_blank"
            rel="noopener noreferrer"
            >open it in your browser</a
          >. The link works for {{ exportLinkMinutes() }} minutes.
        </p>
      }

      @if (page(); as report) {
        <p class="mb-2 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
          @if (report.total === 0) {
            No records
          } @else {
            {{ report.total }} {{ report.total === 1 ? 'record' : 'records' }} ·
            {{ duration(report.totalMinutes) }} recorded
          }
        </p>
      }

      <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <p-table
          [value]="rows()"
          [lazy]="true"
          [lazyLoadOnInit]="false"
          (onLazyLoad)="onLazyLoad($event)"
          [totalRecords]="page()?.total ?? 0"
          [paginator]="true"
          [alwaysShowPaginator]="false"
          [rows]="table().rows"
          [first]="table().first"
          [rowsPerPageOptions]="[25, 50, 100]"
          [sortField]="table().sortField"
          [sortOrder]="table().sortOrder"
          [loading]="loading()"
          styleClass="p-datatable-sm"
          [tableStyle]="{ 'min-width': '52rem' }"
        >
          <ng-template #header>
            <tr>
              <th pSortableColumn="employee">Employee <p-sortIcon field="employee" /></th>
              <th pSortableColumn="date">Date <p-sortIcon field="date" /></th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th pSortableColumn="duration">Duration <p-sortIcon field="duration" /></th>
              <th>Time zone</th>
            </tr>
          </ng-template>
          <ng-template #body let-row>
            <tr>
              <td>
                <span class="font-medium">{{ row.employeeName }}</span>
                <span class="block text-xs text-gray-500 dark:text-gray-400">{{
                  row.employeeEmail
                }}</span>
              </td>
              <td>{{ row.workDate | date: 'EEE, d MMM y' }}</td>
              <td>{{ row.checkInAt | date: 'HH:mm' : timezone(row) }}</td>
              <td>
                @if (row.checkOutAt) {
                  {{ row.checkOutAt | date: 'HH:mm' : timezone(row) }}
                } @else if (row.workDate === currentWorkDate) {
                  <span class="text-gray-500 dark:text-gray-400">Still checked in</span>
                } @else {
                  <span class="text-amber-700 dark:text-amber-400">
                    <i class="pi pi-exclamation-triangle mr-1 text-xs" aria-hidden="true"></i>No
                    check-out
                  </span>
                }
              </td>
              <td>{{ duration(row.durationMinutes) }}</td>
              <td class="text-gray-500 dark:text-gray-400">{{ zone(row) }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="6" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                @if (loadFailed()) {
                  The report could not be loaded.
                  <button
                    type="button"
                    class="ml-1 font-medium text-blue-600 underline dark:text-blue-400"
                    (click)="reload()"
                  >
                    Try again
                  </button>
                } @else if (!filter()) {
                  Choose a start and an end date to see the report.
                } @else if (!loading()) {
                  No attendance was recorded for this period.
                }
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </section>
  `,
})
export class AttendanceReportsComponent implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly periodOptions: { label: string; value: PeriodMode }[] = [
    { label: 'Month', value: 'month' },
    { label: 'Custom range', value: 'range' },
  ];
  readonly currentWorkDate = toDateOnly(new Date(Date.now() - WORK_DAY_START_HOUR * 3_600_000));

  readonly employees = signal<AttendanceEmployee[]>([]);
  readonly employeeId = signal<string | null>(null);
  readonly periodMode = signal<PeriodMode>('month');
  readonly month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly range = signal<(Date | null)[] | null>(null);
  readonly table = signal<TableState>(DEFAULT_TABLE);

  readonly page = signal<AttendanceReportPage | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly exporting = signal(false);
  readonly exportLink = signal<AttendanceExportLink | null>(null);
  readonly exportLinkMinutes = signal(0);

  private readonly reloadTick = signal(0);
  private downloadFrame: HTMLIFrameElement | null = null;
  private exportLinkTimer: ReturnType<typeof setTimeout> | null = null;

  readonly rangeTooLong = computed(() => {
    const [start, end] = this.range() ?? [];
    if (this.periodMode() !== 'range' || !start || !end) return false;
    return Math.round((end.getTime() - start.getTime()) / DAY_MS) > MAX_RANGE_DAYS;
  });

  readonly rangeHint = computed(() =>
    this.rangeTooLong() ? 'Choose a date range of one year or less.' : '',
  );

  readonly filter = computed<AttendanceReportFilter | null>(() => {
    const userId = this.employeeId();
    if (this.periodMode() === 'month') {
      return { ...monthRange(this.month()), userId };
    }
    const [start, end] = this.range() ?? [];
    if (!start || !end || this.rangeTooLong()) return null;
    return { from: toDateOnly(start), to: toDateOnly(end), userId };
  });

  private readonly query = computed<AttendanceReportQuery | null>(() => {
    this.reloadTick();
    const filter = this.filter();
    if (!filter) return null;
    const table = this.table();
    return {
      ...filter,
      page: Math.floor(table.first / table.rows),
      pageSize: table.rows,
      sortField: table.sortField,
      sortOrder: table.sortOrder === 1 ? 'asc' : 'desc',
    };
  });

  readonly rows = computed<AttendanceReportRow[]>(() => this.page()?.rows ?? []);
  readonly canExport = computed(() => !!this.filter() && (this.page()?.total ?? 0) > 0);

  constructor() {
    toObservable(this.query)
      .pipe(
        tap((query) => {
          if (!query) {
            this.page.set(null);
            this.loading.set(false);
          }
        }),
        filter((query): query is AttendanceReportQuery => query !== null),
        tap(() => this.loading.set(true)),
        switchMap((query) =>
          this.attendanceService.report(query).pipe(
            tap(() => this.loadFailed.set(false)),
            catchError(() => {
              this.loadFailed.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((page) => {
        this.loading.set(false);
        this.page.set(page);
      });

    effect(() => {
      this.filter();
      untracked(() => this.clearExportLink());
    });

    this.destroyRef.onDestroy(() => {
      this.clearExportLink();
      this.downloadFrame?.remove();
    });
  }

  ngOnInit(): void {
    this.attendanceService.reportEmployees().subscribe({
      next: (employees) => this.employees.set(employees),
    });
  }

  setEmployee(employeeId: string | null): void {
    this.employeeId.set(employeeId ?? null);
    this.resetPaging();
  }

  setPeriodMode(mode: PeriodMode): void {
    this.periodMode.set(mode);
    this.resetPaging();
  }

  setMonth(month: Date | null): void {
    if (!month) return;
    this.month.set(new Date(month.getFullYear(), month.getMonth(), 1));
    this.resetPaging();
  }

  setRange(range: (Date | null)[] | null): void {
    this.range.set(range);
    this.resetPaging();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const current = this.table();
    const sortField = SORT_FIELDS.find((field) => field === event.sortField) ?? current.sortField;
    const next: TableState = {
      first: event.first ?? 0,
      rows: event.rows ?? current.rows,
      sortField,
      sortOrder: event.sortOrder === 1 ? 1 : -1,
    };
    if (
      next.first !== current.first ||
      next.rows !== current.rows ||
      next.sortField !== current.sortField ||
      next.sortOrder !== current.sortOrder
    ) {
      this.table.set(next);
    }
  }

  reload(): void {
    this.reloadTick.update((tick) => tick + 1);
  }

  exportReport(): void {
    const filter = this.filter();
    if (!filter || this.exporting()) return;

    this.exporting.set(true);
    this.attendanceService.createExportLink(filter).subscribe({
      next: (link) => {
        this.exporting.set(false);
        this.showExportLink(link);
        this.startDownload(link.url);
      },
      error: () => this.exporting.set(false),
    });
  }

  timezone(row: AttendanceReportRow): string {
    return datePipeTimezone(row.utcOffsetMinutes);
  }

  zone(row: AttendanceReportRow): string {
    return utcOffsetLabel(row.utcOffsetMinutes);
  }

  duration(minutes: number | null): string {
    return formatDuration(minutes);
  }

  private resetPaging(): void {
    if (this.table().first !== 0) {
      this.table.update((table) => ({ ...table, first: 0 }));
    }
  }

  private showExportLink(link: AttendanceExportLink): void {
    this.clearExportLink();
    this.exportLink.set(link);
    const remaining = Math.max(new Date(link.expiresAt).getTime() - Date.now(), 0);
    this.exportLinkMinutes.set(Math.max(Math.round(remaining / 60_000), 1));
    this.exportLinkTimer = setTimeout(() => this.exportLink.set(null), remaining);
  }

  private clearExportLink(): void {
    if (this.exportLinkTimer !== null) {
      clearTimeout(this.exportLinkTimer);
      this.exportLinkTimer = null;
    }
    this.exportLink.set(null);
  }

  private startDownload(url: string): void {
    this.downloadFrame?.remove();
    const frame = this.document.createElement('iframe');
    frame.hidden = true;
    frame.title = 'Attendance report download';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.src = url;
    this.document.body.appendChild(frame);
    this.downloadFrame = frame;
  }
}
