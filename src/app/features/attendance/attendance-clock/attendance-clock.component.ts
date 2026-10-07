import { DatePipe, DOCUMENT, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  LOCALE_ID,
  OnInit,
  signal,
} from '@angular/core';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import { AttendanceDay, AttendanceSession } from '../../../models/attendance.model';
import { AttendanceService } from '../../../services/attendance.service';
import { datePipeTimezone, formatDuration } from '../attendance-format';

type TagSeverity = 'success' | 'secondary' | 'warn';

@Component({
  selector: 'app-attendance-clock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, Button, ProgressSpinner, Tag],
  host: { '(document:visibilitychange)': 'onVisibilityChange()' },
  template: `
    <section
      aria-labelledby="attendance-today-heading"
      class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="attendance-today-heading"
            class="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Today
          </h2>
          @if (day(); as today) {
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ today.workDate | date: 'fullDate' }}
            </p>
          }
        </div>
        @if (day()) {
          <p-tag [value]="statusLabel()" [severity]="statusSeverity()" />
        }
      </div>

      @if (day(); as today) {
        <div class="mt-6 flex flex-col items-center gap-3 text-center">
          <p-button
            [label]="buttonLabel()"
            [icon]="today.status === 'checked-in' ? 'pi pi-sign-out' : 'pi pi-sign-in'"
            [severity]="today.status === 'checked-in' ? 'danger' : 'success'"
            size="large"
            [loading]="submitting()"
            (onClick)="toggle()"
          />
          <p class="text-sm text-gray-700 dark:text-gray-300" aria-live="polite">
            {{ statusText() }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            The time is recorded when you press the button.
          </p>
        </div>

        @if (today.sessions.length > 0) {
          <div class="mt-6 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="w-full text-sm">
              <caption class="sr-only">
                Your check-in and check-out times today
              </caption>
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    class="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300"
                  >
                    Check-in
                  </th>
                  <th
                    scope="col"
                    class="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300"
                  >
                    Check-out
                  </th>
                  <th
                    scope="col"
                    class="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300"
                  >
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (session of today.sessions; track session.id) {
                  <tr class="border-t border-gray-100 dark:border-gray-700">
                    <td class="px-4 py-2 text-gray-900 dark:text-gray-100">
                      {{ session.checkInAt | date: 'HH:mm' : timezone(session) }}
                    </td>
                    <td class="px-4 py-2 text-gray-900 dark:text-gray-100">
                      @if (session.checkOutAt) {
                        {{ session.checkOutAt | date: 'HH:mm' : timezone(session) }}
                      } @else {
                        <span class="text-gray-500 dark:text-gray-400">Still checked in</span>
                      }
                    </td>
                    <td class="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                      {{ duration(session.durationMinutes) }}
                    </td>
                  </tr>
                }
              </tbody>
              @if (today.sessions.length > 1) {
                <tfoot>
                  <tr class="border-t border-gray-200 dark:border-gray-600">
                    <th
                      scope="row"
                      colspan="2"
                      class="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300"
                    >
                      Total today
                    </th>
                    <td class="px-4 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                      {{ duration(today.workedMinutes) }}
                    </td>
                  </tr>
                </tfoot>
              }
            </table>
          </div>
        }
      } @else if (loadFailed()) {
        <div class="mt-6 flex flex-col items-center gap-3 text-center" role="alert">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            Your attendance for today could not be loaded.
          </p>
          <p-button label="Try again" severity="secondary" size="small" (onClick)="load()" />
        </div>
      } @else {
        <div class="flex justify-center py-10">
          <p-progressspinner
            strokeWidth="4"
            ariaLabel="Loading your attendance"
            [style]="{ width: '2rem', height: '2rem' }"
          />
        </div>
      }
    </section>
  `,
})
export class AttendanceClockComponent implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly document = inject(DOCUMENT);
  private readonly locale = inject(LOCALE_ID);

  readonly day = signal<AttendanceDay | null>(null);
  readonly submitting = signal(false);
  readonly loadFailed = signal(false);

  readonly lastSession = computed(() => this.day()?.sessions.at(-1) ?? null);

  readonly statusLabel = computed(() => {
    switch (this.day()?.status) {
      case 'checked-in':
        return 'Checked in';
      case 'checked-out':
        return 'Checked out';
      default:
        return 'Not checked in';
    }
  });

  readonly statusSeverity = computed<TagSeverity>(() => {
    switch (this.day()?.status) {
      case 'checked-in':
        return 'success';
      case 'checked-out':
        return 'secondary';
      default:
        return 'warn';
    }
  });

  readonly buttonLabel = computed(() => {
    switch (this.day()?.status) {
      case 'checked-in':
        return 'Check out';
      case 'checked-out':
        return 'Check in again';
      default:
        return 'Check in';
    }
  });

  readonly statusText = computed(() => {
    const today = this.day();
    const last = this.lastSession();
    if (!today || !last) return 'You have not checked in today.';
    if (today.status === 'checked-in') {
      return `Checked in at ${this.time(last.checkInAt, last)}.`;
    }
    return `Checked out at ${this.time(last.checkOutAt ?? last.checkInAt, last)}. Worked ${formatDuration(today.workedMinutes)} today.`;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadFailed.set(false);
    this.attendanceService.today().subscribe({
      next: (day) => this.day.set(day),
      error: () => this.loadFailed.set(this.day() === null),
    });
  }

  toggle(): void {
    const today = this.day();
    if (!today || this.submitting()) return;

    this.submitting.set(true);
    const request =
      today.status === 'checked-in'
        ? this.attendanceService.checkOut()
        : this.attendanceService.checkIn();
    request.subscribe({
      next: (day) => {
        this.day.set(day);
        this.submitting.set(false);
      },
      error: () => {
        this.submitting.set(false);
        this.load();
      },
    });
  }

  onVisibilityChange(): void {
    if (this.document.visibilityState === 'visible' && !this.submitting()) {
      this.load();
    }
  }

  timezone(session: AttendanceSession): string {
    return datePipeTimezone(session.utcOffsetMinutes);
  }

  duration(minutes: number | null): string {
    return formatDuration(minutes);
  }

  private time(instant: string, session: AttendanceSession): string {
    return formatDate(instant, 'HH:mm', this.locale, this.timezone(session));
  }
}
