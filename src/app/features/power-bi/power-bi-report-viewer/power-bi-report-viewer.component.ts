import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Button } from 'primeng/button';
import { IReportEmbedConfiguration, models, service } from 'powerbi-client';
import { PowerBIEmbedModule, PowerBIReportEmbedComponent } from 'powerbi-client-angular';
import {
  catchError,
  EMPTY,
  expand,
  map,
  Observable,
  retry,
  startWith,
  Subject,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { PowerBiEmbed } from '../../../models/power-bi.model';
import { PowerBiService } from '../../../services/power-bi.service';
import { apiErrorMessage, tokenRenewalDelayMs } from '../power-bi-format';

type ViewerState = 'connecting' | 'embedded' | 'error';
type EmbedEventHandler = (event?: service.ICustomEvent<unknown>) => void;

const RENEWAL_RETRIES = 3;
const RENEWAL_RETRY_DELAY_MS = 30_000;
const CONNECT_FAILED = 'The report could not be loaded. Try again in a moment.';
const SETTINGS_HINT =
  "If this keeps happening, ask an administrator to check the report's settings.";

@Component({
  selector: 'app-power-bi-report-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PowerBIEmbedModule, Button],
  host: { class: 'block' },
  template: `
    <div
      class="relative h-full overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 [&_iframe]:border-0"
    >
      @if (embedConfig(); as config) {
        <powerbi-report
          class="block h-full"
          cssClassName="h-full w-full"
          [embedConfig]="config"
          [eventHandlers]="eventHandlers"
        />
      }

      @if (state() === 'connecting') {
        <div
          class="absolute inset-0 flex items-center justify-center gap-3 bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200"
          role="status"
        >
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
          <span>Loading {{ title() }}…</span>
        </div>
      }

      @if (state() === 'error') {
        <div
          class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center dark:bg-gray-900"
          role="alert"
        >
          <i
            class="pi pi-exclamation-triangle text-2xl text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          ></i>
          <p class="font-medium text-gray-900 dark:text-gray-100">
            {{ title() }} could not be opened
          </p>
          <p class="max-w-xl text-sm text-gray-700 dark:text-gray-300">{{ errorMessage() }}</p>
          <p-button label="Try again" icon="pi pi-refresh" size="small" (onClick)="retry()" />
        </div>
      }
    </div>
  `,
})
export class PowerBiReportViewerComponent {
  private readonly powerBiService = inject(PowerBiService);

  readonly reportId = input.required<string>();
  readonly title = input.required<string>();

  protected readonly state = signal<ViewerState>('connecting');
  protected readonly errorMessage = signal('');
  protected readonly embedConfig = signal<IReportEmbedConfiguration | null>(null);

  protected readonly eventHandlers = new Map<string, EmbedEventHandler>([
    ['loaded', () => (this.loaded = true)],
    ['error', (event) => this.onEmbedError(event)],
  ]);

  private readonly embedComponent = viewChild(PowerBIReportEmbedComponent);
  private readonly retries = new Subject<void>();
  private loaded = false;

  constructor() {
    toObservable(this.reportId)
      .pipe(
        switchMap((id) =>
          this.retries.pipe(
            startWith(undefined),
            map(() => id),
          ),
        ),
        tap(() => this.reset()),
        switchMap((id) =>
          this.embedTokens(id).pipe(
            map((embed, index) => ({ embed, isRenewal: index > 0 })),
            catchError((error: unknown) => {
              this.fail(apiErrorMessage(error, CONNECT_FAILED));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ embed, isRenewal }) => {
        if (isRenewal) {
          this.renewToken(embed);
        } else {
          this.show(embed);
        }
      });

    afterRenderEffect(() => {
      const title = this.title();
      this.embedComponent()?.getReport()?.setComponentTitle(title);
    });

    inject(DestroyRef).onDestroy(() => this.releaseEmbed());
  }

  reloadData(): void {
    const report = this.embedComponent()?.getReport();
    if (!report) return;
    report.refresh().catch(() => report.reload().catch(() => undefined));
  }

  protected retry(): void {
    this.retries.next();
  }

  private embedTokens(id: string): Observable<PowerBiEmbed> {
    return this.powerBiService
      .embed(id)
      .pipe(
        expand((embed) =>
          timer(tokenRenewalDelayMs(embed.expiresAt, Date.now())).pipe(
            switchMap(() =>
              this.powerBiService
                .embed(id)
                .pipe(retry({ count: RENEWAL_RETRIES, delay: RENEWAL_RETRY_DELAY_MS })),
            ),
          ),
        ),
      );
  }

  private show(embed: PowerBiEmbed): void {
    this.embedConfig.set({
      type: 'report',
      id: embed.reportId,
      embedUrl: embed.embedUrl,
      accessToken: embed.accessToken,
      tokenType: embed.tokenType === 'Embed' ? models.TokenType.Embed : models.TokenType.Aad,
    });
    this.state.set('embedded');
  }

  private renewToken(embed: PowerBiEmbed): void {
    this.embedComponent()
      ?.getReport()
      ?.setAccessToken(embed.accessToken)
      .catch(() => undefined);
  }

  private onEmbedError(event?: service.ICustomEvent<unknown>): void {
    if (this.loaded) return;

    const detail = event?.detail as models.IError | undefined;
    if ((detail?.level ?? models.TraceType.Error) < models.TraceType.Error) return;

    const reason = detail?.detailedMessage || detail?.message;
    this.fail(
      reason
        ? `Power BI could not open this report (${reason}). ${SETTINGS_HINT}`
        : `Power BI could not open this report. ${SETTINGS_HINT}`,
    );
  }

  private reset(): void {
    this.releaseEmbed();
    this.loaded = false;
    this.embedConfig.set(null);
    this.errorMessage.set('');
    this.state.set('connecting');
  }

  private fail(message: string): void {
    this.releaseEmbed();
    this.embedConfig.set(null);
    this.errorMessage.set(message);
    this.state.set('error');
  }

  private releaseEmbed(): void {
    const report = this.embedComponent()?.getReport();
    if (report) report.service.reset(report.element);
  }
}
