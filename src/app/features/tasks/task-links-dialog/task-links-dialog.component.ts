import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { take } from 'rxjs/operators';
import { Task } from '../../../models/task.model';
import { TaskService } from '../../../services/task.service';

@Component({
  selector: 'app-task-links-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Dialog, InputText, Button],
  template: `
    <p-dialog
      header="Files"
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [style]="{ width: '36rem' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      @if (task(); as t) {
        <div class="flex flex-col gap-4 pt-2">
          <!-- Existing files -->
          @if (t.linkedFiles?.length) {
            <div class="flex flex-col gap-2">
              @for (url of t.linkedFiles; track url; let i = $index) {
                <div
                  class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <i class="pi pi-file text-gray-400"></i>
                  <a
                    [href]="url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex-1 truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
                    [title]="url"
                  >
                    {{ fileNameAt(t, i) }}
                  </a>
                  <p-button
                    icon="pi pi-external-link"
                    [text]="true"
                    size="small"
                    (onClick)="openLink(url)"
                    ariaLabel="Open file"
                  />
                </div>
              }
            </div>
          } @else {
            <p class="text-center text-sm text-gray-500 dark:text-gray-400">No files yet.</p>
          }

          <!-- Add URL -->
          <div class="border-t border-gray-200 pt-3 dark:border-gray-700">
            <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Add Link</label
            >
            <div class="flex items-center gap-2">
              <input
                pInputText
                class="flex-1"
                placeholder="https://..."
                [formControl]="newUrlControl"
                (keydown.enter)="addUrl(); $event.preventDefault()"
              />
              <p-button
                icon="pi pi-plus"
                [rounded]="true"
                [text]="true"
                (onClick)="addUrl()"
                ariaLabel="Add URL"
              />
            </div>
          </div>

          <!-- Upload file -->
          <div class="border-t border-gray-200 pt-3 dark:border-gray-700">
            <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Upload File</label
            >
            <div class="flex items-center gap-2">
              <input #fileInput type="file" class="hidden" (change)="onFileSelected($event)" />
              <p-button
                icon="pi pi-upload"
                label="Upload to SharePoint"
                [outlined]="true"
                size="small"
                (onClick)="fileInput.click()"
                [loading]="uploading()"
              />
              @if (uploadStatus()) {
                <span
                  class="text-xs"
                  [class.text-green-600]="!uploadError()"
                  [class.text-red-500]="uploadError()"
                >
                  {{ uploadStatus() }}
                </span>
              }
            </div>
          </div>
        </div>
      }
    </p-dialog>
  `,
})
export class TaskLinksDialogComponent {
  private readonly taskService = inject(TaskService);

  readonly task = input<Task | null>(null);
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly linkAdded = output<void>();

  readonly newUrlControl = new FormControl('');
  readonly uploading = signal(false);
  readonly uploadStatus = signal<string | null>(null);
  readonly uploadError = signal(false);

  addUrl(): void {
    const url = this.newUrlControl.value?.trim();
    const t = this.task();
    if (!url || !t) return;

    const linkedFiles = [...(t.linkedFiles || []), url];
    this.taskService
      .updateTask({ ...t, linkedFiles } as Task)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.newUrlControl.reset();
          this.linkAdded.emit();
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const t = this.task();
    if (!file || !t) return;

    this.uploading.set(true);
    this.uploadStatus.set(null);
    this.uploadError.set(false);

    this.taskService
      .uploadFile(t.id, file)
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.uploading.set(false);
          this.uploadStatus.set(`Uploaded: ${result.name}`);
          this.linkAdded.emit();
          input.value = '';
        },
        error: (err) => {
          this.uploading.set(false);
          this.uploadStatus.set(err?.error?.message || 'Upload failed');
          this.uploadError.set(true);
          input.value = '';
        },
      });
  }

  openLink(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  fileNameAt(task: Task, index: number): string {
    const names = task.linkedFileNames;
    if (names?.[index]) return names[index];
    return this.urlLabel(task.linkedFiles?.[index] ?? '');
  }

  urlLabel(url: string): string {
    try {
      const u = new URL(url);
      const filename = u.pathname.split('/').pop();
      return filename || u.hostname;
    } catch {
      return url;
    }
  }
}
