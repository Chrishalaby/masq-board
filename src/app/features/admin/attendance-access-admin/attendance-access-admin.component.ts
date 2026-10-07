import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { AttendanceAccessChange } from '../../../models/attendance.model';
import { User } from '../../../models/user.model';
import { AttendanceService } from '../../../services/attendance.service';
import { UserService } from '../../../services/user.service';

type AccessKind = 'checkIn' | 'reports';

interface PendingAccess {
  readonly checkIn?: boolean;
  readonly reports?: boolean;
}

interface AccessRow {
  readonly user: User;
  readonly checkIn: boolean;
  readonly reports: boolean;
}

@Component({
  selector: 'app-attendance-access-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, Checkbox, InputText],
  template: `
    <div class="py-4">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Attendance Access</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Choose who can check in and out, and who can see the attendance reports of all employees.
          Nobody has either permission until it is ticked here.
        </p>
      </div>

      <div class="mb-3 flex flex-wrap items-center gap-3">
        <input
          pInputText
          type="search"
          class="w-64"
          placeholder="Search people"
          aria-label="Search people"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
        <p-button
          label="Allow check-in for everyone shown"
          severity="secondary"
          size="small"
          [text]="true"
          [disabled]="rows().length === 0"
          (onClick)="setCheckInForShown(true)"
        />
        <p-button
          label="Remove check-in for everyone shown"
          severity="secondary"
          size="small"
          [text]="true"
          [disabled]="rows().length === 0"
          (onClick)="setCheckInForShown(false)"
        />
      </div>

      <p class="mb-2 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
        {{ checkInCount() }} can check in and out · {{ reportCount() }} can view reports
      </p>

      <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th
                scope="col"
                class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300"
              >
                Name
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300"
              >
                Email
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300"
              >
                Check in and out
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300"
              >
                View reports
              </th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.user.id) {
              <tr class="border-t border-gray-100 dark:border-gray-700">
                <td class="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                  {{ row.user.displayName }}
                </td>
                <td class="px-4 py-2 text-gray-500 dark:text-gray-400">{{ row.user.email }}</td>
                <td class="px-4 py-2 text-center">
                  <p-checkbox
                    [binary]="true"
                    [ngModel]="row.checkIn"
                    (ngModelChange)="toggle('checkIn', row.user.id, $event)"
                    [ariaLabel]="'Allow ' + row.user.displayName + ' to check in and out'"
                  />
                </td>
                <td class="px-4 py-2 text-center">
                  <p-checkbox
                    [binary]="true"
                    [ngModel]="row.reports"
                    (ngModelChange)="toggle('reports', row.user.id, $event)"
                    [ariaLabel]="'Allow ' + row.user.displayName + ' to view attendance reports'"
                  />
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No people match the search.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex flex-wrap items-center justify-end gap-3">
        @if (changeCount() > 0) {
          <span class="text-sm text-gray-600 dark:text-gray-300" role="status">
            {{ changeCount() }} unsaved {{ changeCount() === 1 ? 'change' : 'changes' }}
          </span>
        }
        <p-button
          label="Discard"
          severity="secondary"
          [text]="true"
          [disabled]="changeCount() === 0 || saving()"
          (onClick)="discard()"
        />
        <p-button
          label="Save changes"
          [disabled]="changeCount() === 0"
          [loading]="saving()"
          (onClick)="save()"
        />
      </div>
    </div>
  `,
})
export class AttendanceAccessAdminComponent {
  private readonly attendanceService = inject(AttendanceService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);

  readonly search = signal('');
  readonly saving = signal(false);

  private readonly pending = signal<ReadonlyMap<string, PendingAccess>>(new Map());

  private readonly allRows = computed<AccessRow[]>(() => {
    const pending = this.pending();
    return this.userService.users().map((user) => {
      const change = pending.get(user.id);
      return {
        user,
        checkIn: change?.checkIn ?? user.canUseAttendance,
        reports: change?.reports ?? user.canViewAttendanceReports,
      };
    });
  });

  readonly rows = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.allRows();
    return this.allRows().filter(
      ({ user }) =>
        user.displayName.toLowerCase().includes(term) || user.email.toLowerCase().includes(term),
    );
  });

  readonly checkInCount = computed(() => this.allRows().filter((row) => row.checkIn).length);
  readonly reportCount = computed(() => this.allRows().filter((row) => row.reports).length);

  readonly change = computed<AttendanceAccessChange>(() => {
    const rows = this.allRows();
    const ids = (predicate: (row: AccessRow) => boolean) =>
      rows.filter(predicate).map((row) => row.user.id);
    return {
      grantCheckIn: ids((row) => row.checkIn && !row.user.canUseAttendance),
      revokeCheckIn: ids((row) => !row.checkIn && row.user.canUseAttendance),
      grantReports: ids((row) => row.reports && !row.user.canViewAttendanceReports),
      revokeReports: ids((row) => !row.reports && row.user.canViewAttendanceReports),
    };
  });

  readonly changeCount = computed(() => {
    const change = this.change();
    return (
      change.grantCheckIn.length +
      change.revokeCheckIn.length +
      change.grantReports.length +
      change.revokeReports.length
    );
  });

  toggle(kind: AccessKind, userId: string, allowed: boolean): void {
    this.pending.update((current) => {
      const next = new Map(current);
      next.set(userId, { ...next.get(userId), [kind]: allowed });
      return next;
    });
  }

  setCheckInForShown(allowed: boolean): void {
    const shown = this.rows().map((row) => row.user.id);
    this.pending.update((current) => {
      const next = new Map(current);
      for (const userId of shown) {
        next.set(userId, { ...next.get(userId), checkIn: allowed });
      }
      return next;
    });
  }

  discard(): void {
    this.pending.set(new Map());
  }

  save(): void {
    const change = this.change();
    if (this.changeCount() === 0 || this.saving()) return;

    const affectsMe = this.affectsCurrentUser(change);
    this.saving.set(true);
    this.attendanceService.updateAccess(change).subscribe({
      next: (access) => {
        this.saving.set(false);
        this.userService.applyAttendanceAccess(access);
        this.pending.set(new Map());
        if (affectsMe) this.userService.loadCurrentUser();
        this.messageService.add({ severity: 'success', summary: 'Attendance access updated' });
      },
      error: () => this.saving.set(false),
    });
  }

  private affectsCurrentUser(change: AttendanceAccessChange): boolean {
    const me = this.userService.currentUser()?.id;
    if (!me) return false;
    return [
      change.grantCheckIn,
      change.revokeCheckIn,
      change.grantReports,
      change.revokeReports,
    ].some((ids) => ids.includes(me));
  }
}
