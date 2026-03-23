import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import { DynamicsService } from '../../../services/dynamics.service';
import { ProjectService } from '../../../services/project.service';

@Component({
  selector: 'app-dynamics-sync-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, Button, Checkbox, Tag, ProgressSpinner, FormsModule],
  template: `
    <p-dialog
      header="Import from Dynamics 365"
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [style]="{ width: '48rem' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      @if (dynamicsService.loading()) {
        <div class="flex items-center justify-center py-12">
          <p-progressSpinner ariaLabel="Loading jobs" />
        </div>
      } @else if (dynamicsService.jobs().length === 0) {
        <p class="py-8 text-center text-gray-500 dark:text-gray-400">
          No jobs found in Dynamics 365.
        </p>
      } @else {
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ dynamicsService.jobs().length }} jobs available · {{ selectedCount() }} selected
          </span>
          <p-button
            label="Select All"
            severity="secondary"
            [outlined]="true"
            size="small"
            (onClick)="toggleSelectAll()"
          />
        </div>

        <div class="max-h-96 space-y-2 overflow-y-auto">
          @for (job of dynamicsService.jobs(); track job.No) {
            <div
              class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <p-checkbox
                [binary]="true"
                [ngModel]="isSelected(job.No)"
                (ngModelChange)="toggleSelect(job.No)"
              />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900 dark:text-gray-100">
                    {{ job.No }}
                  </span>
                  <p-tag [value]="job.Status" severity="info" [rounded]="true" />
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ job.Description || 'No description' }}
                </p>
                @if (job.Starting_Date || job.Ending_Date) {
                  <p class="text-xs text-gray-400 dark:text-gray-500">
                    @if (job.Starting_Date) {
                      Start: {{ job.Starting_Date }}
                    }
                    @if (job.Ending_Date) {
                      · End: {{ job.Ending_Date }}
                    }
                  </p>
                }
              </div>
            </div>
          }
        </div>
      }

      <div class="mt-4 flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
        <p-button
          label="Cancel"
          severity="secondary"
          [outlined]="true"
          (onClick)="onVisibleChange(false)"
        />
        <p-button
          label="Import Selected"
          icon="pi pi-download"
          [disabled]="selectedCount() === 0 || importing()"
          [loading]="importing()"
          (onClick)="onImport()"
        />
      </div>
    </p-dialog>
  `,
})
export class DynamicsSyncDialogComponent {
  readonly dynamicsService = inject(DynamicsService);
  private readonly projectService = inject(ProjectService);
  private readonly messageService = inject(MessageService);

  readonly visible = signal(false);
  readonly importing = signal(false);
  readonly closed = output<void>();

  private readonly selectedJobs = signal(new Set<string>());

  readonly selectedCount = computed(() => this.selectedJobs().size);

  open(): void {
    this.visible.set(true);
    this.selectedJobs.set(new Set());
    this.dynamicsService.loadJobs();
  }

  onVisibleChange(val: boolean): void {
    this.visible.set(val);
    if (!val) this.closed.emit();
  }

  isSelected(jobNo: string): boolean {
    return this.selectedJobs().has(jobNo);
  }

  toggleSelect(jobNo: string): void {
    this.selectedJobs.update((set) => {
      const next = new Set(set);
      if (next.has(jobNo)) {
        next.delete(jobNo);
      } else {
        next.add(jobNo);
      }
      return next;
    });
  }

  toggleSelectAll(): void {
    const allJobs = this.dynamicsService.jobs();
    if (this.selectedJobs().size === allJobs.length) {
      this.selectedJobs.set(new Set());
    } else {
      this.selectedJobs.set(new Set(allJobs.map((j) => j.No)));
    }
  }

  onImport(): void {
    const jobNos = [...this.selectedJobs()];
    if (!jobNos.length) return;

    this.importing.set(true);
    this.dynamicsService.importJobs(jobNos).subscribe({
      next: (result: { imported: number; skipped: number }) => {
        this.importing.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Import Complete',
          detail: `${result.imported} job(s) imported, ${result.skipped} skipped`,
        });
        this.projectService.loadProjects();
        this.onVisibleChange(false);
      },
      error: () => {
        this.importing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Import Failed',
          detail: 'Could not import jobs from Dynamics 365',
        });
      },
    });
  }
}
