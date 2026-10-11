import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Chip } from 'primeng/chip';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { take } from 'rxjs';
import {
  PowerBiAdminReport,
  PowerBiReportPayload,
  PowerBiReportUser,
} from '../../../models/power-bi.model';
import { PowerBiService } from '../../../services/power-bi.service';
import { UserService } from '../../../services/user.service';
import { buildEmbedUrl, isGuid, isPowerBiEmbedUrl } from '../../power-bi/power-bi-format';

type ReportField = 'title' | 'reportId' | 'groupId' | 'datasetId' | 'embedUrl';

interface ReportFormValue {
  readonly title: string;
  readonly reportId: string;
  readonly groupId: string;
  readonly datasetId: string;
  readonly embedUrl: string;
  readonly userIds: string[];
}

const TITLE_MAX_LENGTH = 150;

function textOf(control: AbstractControl): string {
  return String(control.value ?? '').trim();
}

function requiredText(control: AbstractControl): ValidationErrors | null {
  return textOf(control) ? null : { required: true };
}

function guid(control: AbstractControl): ValidationErrors | null {
  const value = textOf(control);
  return !value || isGuid(value) ? null : { guid: true };
}

function powerBiEmbedUrl(control: AbstractControl): ValidationErrors | null {
  const value = textOf(control);
  return !value || isPowerBiEmbedUrl(value) ? null : { embedUrl: true };
}

@Component({
  selector: 'app-power-bi-reports-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Chip, Dialog, InputText, MultiSelect],
  template: `
    <div class="py-4">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-100">Power BI Reports</h2>
          <p class="text-sm text-gray-300">
            Each person only sees the reports they are assigned to here. Being an admin does not
            include any report.
          </p>
        </div>
        <p-button label="New Report" icon="pi pi-plus" size="small" (onClick)="openNew()" />
      </div>

      <div class="flex flex-col gap-3">
        @for (report of reports(); track report.id) {
          <div
            class="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-gray-900 dark:text-gray-100">{{ report.title }}</p>
              <dl
                class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-gray-600 dark:text-gray-300"
              >
                <dt>Report ID</dt>
                <dd class="font-mono break-all">{{ report.reportId }}</dd>
                <dt>Group ID</dt>
                <dd class="font-mono break-all">{{ report.groupId }}</dd>
                <dt>Dataset ID</dt>
                <dd class="break-all" [class.font-mono]="report.datasetId">
                  {{ report.datasetId ?? 'Not set, so there is no Refresh button' }}
                </dd>
              </dl>
              <div class="mt-3 flex flex-wrap items-center gap-1">
                @for (user of report.users; track user.id) {
                  <p-chip [label]="user.displayName" />
                } @empty {
                  <span class="text-sm text-amber-700 dark:text-amber-400">
                    <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>
                    Nobody is assigned, so nobody can see this report yet.
                  </span>
                }
              </div>
            </div>
            <div class="flex shrink-0 gap-1">
              <p-button
                icon="pi pi-pencil"
                severity="secondary"
                [text]="true"
                size="small"
                [ariaLabel]="'Edit report ' + report.title"
                (onClick)="openEdit(report)"
              />
              <p-button
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                size="small"
                [ariaLabel]="'Delete report ' + report.title"
                (onClick)="confirmDelete(report)"
              />
            </div>
          </div>
        } @empty {
          <p class="py-8 text-center text-sm text-gray-300">
            No reports yet. Add one, then choose who can see it.
          </p>
        }
      </div>
    </div>

    <p-dialog
      [header]="editing() ? 'Edit Report' : 'New Report'"
      [(visible)]="dialogVisible"
      closeAriaLabel="Close"
      [modal]="true"
      [style]="{ width: '40rem' }"
      [breakpoints]="{ '720px': '95vw' }"
      [draggable]="false"
    >
      <form class="flex flex-col gap-4 pt-2" [formGroup]="form">
        <div class="flex flex-col gap-1">
          <label for="pbiTitle" class="text-sm font-medium">Report Title *</label>
          <input
            pInputText
            id="pbiTitle"
            class="w-full"
            formControlName="title"
            autocomplete="off"
            [attr.maxlength]="titleMaxLength"
            [attr.aria-invalid]="showError('title')"
            [attr.aria-describedby]="showError('title') ? 'pbiTitleError' : null"
          />
          @if (showError('title')) {
            <small id="pbiTitleError" class="text-red-400">
              Enter the name people will see on the Reports page.
            </small>
          }
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label for="pbiReportId" class="text-sm font-medium">Report ID *</label>
            <input
              pInputText
              id="pbiReportId"
              class="w-full font-mono text-sm"
              formControlName="reportId"
              autocomplete="off"
              spellcheck="false"
              placeholder="00000000-0000-0000-0000-000000000000"
              [attr.aria-invalid]="showError('reportId')"
              [attr.aria-describedby]="showError('reportId') ? 'pbiReportIdError' : null"
            />
            @if (showError('reportId')) {
              <small id="pbiReportIdError" class="text-red-400">
                Enter the report ID from Power BI, for example 7c3d7a0e-0f3b-4a63-9d55-1f0c2f1a8b11.
              </small>
            }
          </div>

          <div class="flex flex-col gap-1">
            <label for="pbiGroupId" class="text-sm font-medium">Group ID (workspace) *</label>
            <input
              pInputText
              id="pbiGroupId"
              class="w-full font-mono text-sm"
              formControlName="groupId"
              autocomplete="off"
              spellcheck="false"
              placeholder="00000000-0000-0000-0000-000000000000"
              [attr.aria-invalid]="showError('groupId')"
              [attr.aria-describedby]="showError('groupId') ? 'pbiGroupIdError' : null"
            />
            @if (showError('groupId')) {
              <small id="pbiGroupIdError" class="text-red-400">
                Enter the workspace ID from Power BI, in the same format as the report ID.
              </small>
            }
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label for="pbiDatasetId" class="text-sm font-medium">Dataset ID</label>
          <input
            pInputText
            id="pbiDatasetId"
            class="w-full font-mono text-sm"
            formControlName="datasetId"
            autocomplete="off"
            spellcheck="false"
            placeholder="00000000-0000-0000-0000-000000000000"
            [attr.aria-invalid]="showError('datasetId')"
            aria-describedby="pbiDatasetIdHelp"
          />
          <small id="pbiDatasetIdHelp" class="text-gray-300">
            @if (showError('datasetId')) {
              <span class="text-red-400">
                This is not a dataset ID. Use the same format as the report ID, or leave it empty.
              </span>
            } @else {
              Used by the Refresh button. Leave it empty to show the report without one.
            }
          </small>
        </div>

        <div class="flex flex-col gap-1">
          <label for="pbiEmbedUrl" class="text-sm font-medium">Embed URL *</label>
          <div class="flex flex-wrap gap-2">
            <input
              pInputText
              id="pbiEmbedUrl"
              class="min-w-0 flex-1 text-sm"
              formControlName="embedUrl"
              autocomplete="off"
              spellcheck="false"
              inputmode="url"
              placeholder="https://app.powerbi.com/reportEmbed?reportId=…&groupId=…"
              [attr.aria-invalid]="showError('embedUrl')"
              aria-describedby="pbiEmbedUrlHelp"
            />
            <p-button
              label="Auto Generate Embed URL"
              icon="pi pi-bolt"
              size="small"
              severity="secondary"
              [disabled]="!canGenerateEmbedUrl()"
              (onClick)="generateEmbedUrl()"
            />
          </div>
          <small id="pbiEmbedUrlHelp" class="text-gray-300">
            @if (showError('embedUrl')) {
              <span class="text-red-400">
                Enter an address that starts with https://app.powerbi.com/, or generate it from the
                IDs.
              </span>
            } @else {
              Auto Generate builds it from the Report ID and Group ID.
            }
          </small>
        </div>

        <div class="flex flex-col gap-1">
          <label for="pbiUsers" class="text-sm font-medium">Who can see this report</label>
          <p-multiselect
            inputId="pbiUsers"
            formControlName="userIds"
            [options]="userOptions()"
            optionLabel="displayName"
            optionValue="id"
            placeholder="Select people"
            [filter]="true"
            filterBy="displayName,email"
            display="chip"
            selectedItemsLabel="{0} people selected"
            [maxSelectedLabels]="6"
            appendTo="body"
            [fluid]="true"
          />
        </div>
      </form>
      <ng-template #footer>
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="dialogVisible.set(false)"
        />
        <p-button label="Save" [loading]="saving()" (onClick)="onSave()" />
      </ng-template>
    </p-dialog>

    <p-dialog
      header="Delete report"
      [(visible)]="deleteDialogVisible"
      closeAriaLabel="Close"
      [modal]="true"
      [style]="{ width: '28rem' }"
      [breakpoints]="{ '520px': '95vw' }"
      [draggable]="false"
    >
      <p class="text-sm text-gray-200">{{ deleteMessage() }}</p>
      <ng-template #footer>
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="deleteDialogVisible.set(false)"
        />
        <p-button
          label="Delete"
          severity="danger"
          [loading]="deleting()"
          (onClick)="deleteReport()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class PowerBiReportsAdminComponent implements OnInit {
  private readonly powerBiService = inject(PowerBiService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly titleMaxLength = TITLE_MAX_LENGTH;

  readonly reports = this.powerBiService.adminReports;

  readonly dialogVisible = signal(false);
  readonly editing = signal<PowerBiAdminReport | null>(null);
  readonly saving = signal(false);
  private readonly submitted = signal(false);

  readonly deleteDialogVisible = signal(false);
  readonly deleting = signal(false);
  private readonly deleteTarget = signal<PowerBiAdminReport | null>(null);

  readonly deleteMessage = computed(() => {
    const report = this.deleteTarget();
    if (!report) return '';

    const people = report.users.length;
    const affected =
      people > 0 ? ` ${people} ${people === 1 ? 'person' : 'people'} will no longer see it.` : '';
    return `Remove "${report.title}" from MASQ Collab?${affected} The report itself stays in Power BI.`;
  });

  readonly form = this.formBuilder.group({
    title: ['', [requiredText, Validators.maxLength(TITLE_MAX_LENGTH)]],
    reportId: ['', [requiredText, guid]],
    groupId: ['', [requiredText, guid]],
    datasetId: ['', [guid]],
    embedUrl: ['', [requiredText, powerBiEmbedUrl]],
    userIds: [[] as string[]],
  });

  readonly userOptions = computed<PowerBiReportUser[]>(() => {
    const active = this.userService
      .users()
      .map(({ id, displayName, email }) => ({ id, displayName, email }));
    const activeIds = new Set(active.map((user) => user.id));
    const assignedOnly = (this.editing()?.users ?? []).filter((user) => !activeIds.has(user.id));
    return [...active, ...assignedOnly];
  });

  ngOnInit(): void {
    this.powerBiService.loadAdminReports();
  }

  openNew(): void {
    this.editing.set(null);
    this.resetForm({
      title: '',
      reportId: '',
      groupId: '',
      datasetId: '',
      embedUrl: '',
      userIds: [],
    });
  }

  openEdit(report: PowerBiAdminReport): void {
    this.editing.set(report);
    this.resetForm({
      title: report.title,
      reportId: report.reportId,
      groupId: report.groupId,
      datasetId: report.datasetId ?? '',
      embedUrl: report.embedUrl,
      userIds: report.users.map((user) => user.id),
    });
  }

  showError(field: ReportField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  canGenerateEmbedUrl(): boolean {
    const { reportId, groupId } = this.form.controls;
    return isGuid(reportId.value) && isGuid(groupId.value);
  }

  generateEmbedUrl(): void {
    if (!this.canGenerateEmbedUrl()) return;
    const { reportId, groupId, embedUrl } = this.form.controls;
    embedUrl.setValue(buildEmbedUrl(reportId.value, groupId.value));
    embedUrl.markAsDirty();
  }

  onSave(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.saving()) return;

    const value = this.form.getRawValue();
    const payload: PowerBiReportPayload = {
      title: value.title.trim(),
      reportId: value.reportId.trim(),
      groupId: value.groupId.trim(),
      datasetId: value.datasetId.trim() || null,
      embedUrl: value.embedUrl.trim(),
      userIds: value.userIds,
    };
    const editing = this.editing();
    this.saving.set(true);

    const request = editing
      ? this.powerBiService.updateReport(editing.id, payload)
      : this.powerBiService.createReport(payload);

    request.pipe(take(1)).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: editing ? 'Report updated' : 'Report added',
        });
      },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete(report: PowerBiAdminReport): void {
    this.deleteTarget.set(report);
    this.deleteDialogVisible.set(true);
  }

  deleteReport(): void {
    const report = this.deleteTarget();
    if (!report || this.deleting()) return;

    this.deleting.set(true);
    this.powerBiService
      .deleteReport(report.id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'Report deleted' });
        },
        error: () => this.deleting.set(false),
      });
  }

  private resetForm(value: ReportFormValue): void {
    this.submitted.set(false);
    this.form.reset(value);
    this.dialogVisible.set(true);
  }
}
