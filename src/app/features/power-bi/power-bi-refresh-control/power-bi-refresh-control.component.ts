import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Button } from 'primeng/button';
import { EMPTY, expand, Observable, retry, Subscription, switchMap, timer } from 'rxjs';
import { PowerBiRefresh } from '../../../models/power-bi.model';
import { PowerBiService } from '../../../services/power-bi.service';
import { apiErrorMessage } from '../power-bi-format';

const POLL_INTERVAL_MS = 5000;
const POLL_RETRIES = 2;
const START_FAILED = 'The refresh could not be started. Try again in a moment.';
const STATUS_LOST =
  'The refresh status could not be checked. The refresh may still be running in Power BI.';

interface RefreshStatusLine {
  readonly tone: 'neutral' | 'success' | 'error';
  readonly text: string;
}

@Component({
  selector: 'app-power-bi-refresh-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p-button
        [label]="busy() ? 'Refreshing…' : 'Refresh data'"
        icon="pi pi-refresh"
        size="small"
        [loading]="busy()"
        (onClick)="refresh()"
      />

      <p class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300" role="status">
        @if (status(); as current) {
          @switch (current.tone) {
            @case ('success') {
              <i
                class="pi pi-check-circle text-green-700 dark:text-green-400"
                aria-hidden="true"
              ></i>
            }
            @case ('error') {
              <i class="pi pi-times-circle text-red-700 dark:text-red-400" aria-hidden="true"></i>
            }
          }
          <span>{{ current.text }}</span>
        }
      </p>
    </div>
  `,
})
export class PowerBiRefreshControlComponent {
  private readonly powerBiService = inject(PowerBiService);
  private readonly locale = inject(LOCALE_ID);

  readonly reportId = input.required<string>();
  readonly completed = output<void>();

  protected readonly view = signal<PowerBiRefresh | null>(null);
  protected readonly starting = signal(false);
  protected readonly problem = signal<string | null>(null);
  protected readonly busy = computed(() => this.starting() || this.view()?.status === 'refreshing');

  protected readonly status = computed<RefreshStatusLine | null>(() => {
    const problem = this.problem();
    if (problem) return { tone: 'error', text: problem };
    if (this.starting()) return { tone: 'neutral', text: 'Starting the refresh…' };

    const view = this.view();
    if (!view) return null;

    switch (view.status) {
      case 'refreshing':
        return {
          tone: 'neutral',
          text: view.startedAt
            ? `Refreshing the data in Power BI, started at ${this.format(view.startedAt, 'HH:mm')}…`
            : 'Refreshing the data in Power BI…',
        };
      case 'success':
        return { tone: 'success', text: `Data refreshed successfully${this.on(view.finishedAt)}.` };
      case 'failed':
        return {
          tone: 'error',
          text: `The last refresh failed${this.on(view.finishedAt)}${
            view.message ? `: ${view.message}` : '.'
          }`,
        };
      case 'never':
        return { tone: 'neutral', text: 'This data has not been refreshed yet.' };
    }
  });

  private watching: Subscription | null = null;

  constructor() {
    toObservable(this.reportId)
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        this.view.set(null);
        this.starting.set(false);
        this.problem.set(null);
        this.watch(id, this.powerBiService.refreshStatus(id), false);
      });

    inject(DestroyRef).onDestroy(() => this.watching?.unsubscribe());
  }

  protected refresh(): void {
    if (this.busy()) return;

    const id = this.reportId();
    this.starting.set(true);
    this.problem.set(null);
    this.watch(id, this.powerBiService.startRefresh(id), true);
  }

  private on(value: string | null): string {
    return value ? ` on ${this.format(value, 'd MMM y, HH:mm')}` : '';
  }

  private format(value: string, pattern: string): string {
    return formatDate(value, pattern, this.locale);
  }

  private watch(id: string, first: Observable<PowerBiRefresh>, requested: boolean): void {
    this.watching?.unsubscribe();
    let sawRefreshing = false;

    this.watching = first
      .pipe(
        expand((view) =>
          view.status === 'refreshing'
            ? timer(POLL_INTERVAL_MS).pipe(
                switchMap(() =>
                  this.powerBiService
                    .refreshStatus(id, view.startedAt ?? undefined)
                    .pipe(retry({ count: POLL_RETRIES, delay: POLL_INTERVAL_MS })),
                ),
              )
            : EMPTY,
        ),
      )
      .subscribe({
        next: (view) => {
          this.starting.set(false);
          this.view.set(view);
          if (view.status === 'refreshing') {
            sawRefreshing = true;
          } else if (sawRefreshing && view.status === 'success') {
            this.completed.emit();
          }
        },
        error: (error: unknown) => {
          this.starting.set(false);
          this.view.set(null);
          if (sawRefreshing) {
            this.problem.set(STATUS_LOST);
          } else if (requested) {
            this.problem.set(apiErrorMessage(error, START_FAILED));
          }
        },
      });
  }
}
