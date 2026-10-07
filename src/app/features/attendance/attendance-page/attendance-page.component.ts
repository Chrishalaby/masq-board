import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { AttendanceClockComponent } from '../attendance-clock/attendance-clock.component';
import { AttendanceReportsComponent } from '../attendance-reports/attendance-reports.component';

@Component({
  selector: 'app-attendance-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AttendanceClockComponent, AttendanceReportsComponent],
  template: `
    <div class="mx-auto max-w-6xl px-6 py-8">
      <div class="mb-4">
        <a routerLink="/" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >← Home</a
        >
      </div>

      <header class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Attendance</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ subtitle() }}</p>
      </header>

      @if (canCheckIn()) {
        <app-attendance-clock class="block max-w-xl" />
      }

      @if (canViewReports()) {
        <app-attendance-reports class="block" [class.mt-10]="canCheckIn()" />
      }
    </div>
  `,
})
export class AttendancePageComponent {
  private readonly userService = inject(UserService);

  readonly canCheckIn = computed(() => this.userService.currentUser()?.canUseAttendance ?? false);
  readonly canViewReports = computed(
    () => this.userService.currentUser()?.canViewAttendanceReports ?? false,
  );

  readonly subtitle = computed(() =>
    this.canCheckIn()
      ? 'Check in when you start work and check out when you leave.'
      : 'Check-in and check-out reports for all employees.',
  );
}
