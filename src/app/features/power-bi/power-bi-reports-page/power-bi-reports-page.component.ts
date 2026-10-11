import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { filter, take } from 'rxjs';
import { PowerBiService } from '../../../services/power-bi.service';
import { UserService } from '../../../services/user.service';
import { PowerBiRefreshControlComponent } from '../power-bi-refresh-control/power-bi-refresh-control.component';
import { PowerBiReportViewerComponent } from '../power-bi-report-viewer/power-bi-report-viewer.component';

const PILL_SELECTED = 'border-indigo-600 bg-indigo-600 text-white';
const PILL_IDLE =
  'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700';

@Component({
  selector: 'app-power-bi-reports-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Button, PowerBiReportViewerComponent, PowerBiRefreshControlComponent],
  template: `
    <div class="flex h-full min-h-[44rem] flex-col px-6 py-6">
      <div class="mb-3">
        <a routerLink="/" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >← Home</a
        >
      </div>

      <h1 class="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>

      @if (loadFailed()) {
        <div class="flex flex-wrap items-center gap-3" role="alert">
          <p class="text-sm text-gray-700 dark:text-gray-300">Your reports could not be loaded.</p>
          <p-button label="Try again" icon="pi pi-refresh" size="small" (onClick)="load()" />
        </div>
      } @else if (reports() === null) {
        <p class="text-sm text-gray-700 dark:text-gray-300" role="status">Loading your reports…</p>
      } @else if (active(); as report) {
        <div role="tablist" aria-label="Your reports" class="flex flex-wrap gap-2">
          @for (item of reports(); track item.id; let index = $index) {
            <button
              #tab
              type="button"
              role="tab"
              aria-controls="power-bi-report-panel"
              class="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              [class]="item.id === report.id ? pillSelected : pillIdle"
              [id]="tabId(item.id)"
              [attr.aria-selected]="item.id === report.id"
              [tabindex]="item.id === report.id ? 0 : -1"
              (click)="select(item.id)"
              (keydown)="onTabKeydown($event, index)"
            >
              {{ item.title }}
            </button>
          }
        </div>

        <section
          id="power-bi-report-panel"
          role="tabpanel"
          class="mt-4 flex min-h-0 flex-1 flex-col gap-3"
          [attr.aria-labelledby]="tabId(report.id)"
        >
          @if (report.canRefresh) {
            <app-power-bi-refresh-control
              [reportId]="report.id"
              (completed)="viewer.reloadData()"
            />
          }
          <app-power-bi-report-viewer
            #viewer
            class="min-h-0 flex-1"
            [reportId]="report.id"
            [title]="report.title"
          />
        </section>
      } @else {
        <div
          class="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="font-medium text-gray-900 dark:text-gray-100">
            No reports have been shared with you yet.
          </p>
          <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
            An administrator chooses who can see each Power BI report. Ask them to add you to the
            reports you need.
          </p>
        </div>
      }
    </div>
  `,
})
export class PowerBiReportsPageComponent {
  private readonly powerBiService = inject(PowerBiService);
  private readonly userService = inject(UserService);

  protected readonly pillSelected = PILL_SELECTED;
  protected readonly pillIdle = PILL_IDLE;

  protected readonly reports = this.powerBiService.myReports;
  protected readonly loadFailed = signal(false);

  private readonly selectedId = signal<string | null>(null);
  private readonly tabs = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  protected readonly active = computed(() => {
    const reports = this.reports() ?? [];
    return reports.find((report) => report.id === this.selectedId()) ?? reports[0] ?? null;
  });

  constructor() {
    toObservable(this.userService.currentUser)
      .pipe(
        filter((user) => user !== null),
        take(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.load());
  }

  protected load(): void {
    this.loadFailed.set(false);
    this.powerBiService.loadMyReports().subscribe({
      error: () => this.loadFailed.set(true),
    });
  }

  protected tabId(reportId: string): string {
    return `power-bi-report-tab-${reportId}`;
  }

  protected select(reportId: string): void {
    this.selectedId.set(reportId);
  }

  protected onTabKeydown(event: KeyboardEvent, index: number): void {
    const count = this.tabs().length;
    const target = this.targetIndex(event.key, index, count);
    if (target === null) return;

    event.preventDefault();
    this.tabs()[target]?.nativeElement.focus();
  }

  private targetIndex(key: string, index: number, count: number): number | null {
    switch (key) {
      case 'ArrowRight':
        return (index + 1) % count;
      case 'ArrowLeft':
        return (index - 1 + count) % count;
      case 'Home':
        return 0;
      case 'End':
        return count - 1;
      default:
        return null;
    }
  }
}
