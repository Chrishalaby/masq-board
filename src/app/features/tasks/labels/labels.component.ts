import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { take } from 'rxjs';
import { Label } from '../../../models/task.model';
import { LabelService } from '../../../services/label.service';

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
];

@Component({
  selector: 'app-labels',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Button, Dialog, InputText],
  template: `
    <div class="mx-auto max-w-3xl p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <div class="mb-3 flex items-center gap-2">
            <a routerLink="/tasks" class="text-sm text-blue-600 hover:underline dark:text-blue-400">
              ← Tasks
            </a>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Labels</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage labels that can be applied to tasks.
          </p>
        </div>
        @if (labelService.isAdmin()) {
          <p-button label="New Label" icon="pi pi-plus" (onClick)="openEditor()" />
        }
      </div>

      @if (labelService.labels().length === 0) {
        <div
          class="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-600"
        >
          <i class="pi pi-tag mb-2 text-4xl text-gray-400"></i>
          <p class="text-gray-500 dark:text-gray-400">No labels yet.</p>
        </div>
      } @else {
        <div class="flex flex-col gap-2">
          @for (label of labelService.labels(); track label.id) {
            <div
              class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <div class="flex items-center gap-3">
                <span
                  class="inline-block h-4 w-4 rounded-full"
                  [style.background-color]="label.color || '#6b7280'"
                ></span>
                <span class="font-medium text-gray-900 dark:text-white">{{ label.name }}</span>
              </div>
              @if (labelService.isAdmin()) {
                <div class="flex items-center gap-1">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    severity="secondary"
                    size="small"
                    (onClick)="openEditor(label)"
                    ariaLabel="Edit label"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    severity="danger"
                    size="small"
                    (onClick)="onDelete(label)"
                    ariaLabel="Delete label"
                  />
                </div>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Editor Dialog -->
    <p-dialog
      [header]="editingLabel() ? 'Edit Label' : 'New Label'"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '24rem' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      <form [formGroup]="form" (ngSubmit)="onSave()" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="labelName" class="text-sm font-medium">Name *</label>
          <input pInputText id="labelName" formControlName="name" placeholder="Label name" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Color</label>
          <div class="flex flex-wrap gap-2">
            @for (c of presetColors; track c) {
              <button
                type="button"
                class="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                [style.background-color]="c"
                [class.border-gray-900]="form.controls.color.value === c"
                [class.border-transparent]="form.controls.color.value !== c"
                [class.dark:border-white]="form.controls.color.value === c"
                (click)="form.controls.color.setValue(c)"
                [attr.aria-label]="'Color ' + c"
              ></button>
            }
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t pt-3">
          <p-button
            label="Cancel"
            severity="secondary"
            [outlined]="true"
            (onClick)="dialogVisible.set(false)"
          />
          <p-button label="Save" type="submit" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class LabelsComponent implements OnInit {
  readonly labelService = inject(LabelService);

  readonly dialogVisible = signal(false);
  readonly editingLabel = signal<Label | null>(null);
  readonly presetColors = PRESET_COLORS;

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    color: new FormControl('#3b82f6', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.labelService.loadLabels();
    this.labelService.checkAdmin();
  }

  openEditor(label?: Label): void {
    if (label) {
      this.editingLabel.set(label);
      this.form.patchValue({ name: label.name, color: label.color || '#3b82f6' });
    } else {
      this.editingLabel.set(null);
      this.form.reset({ name: '', color: '#3b82f6' });
    }
    this.dialogVisible.set(true);
  }

  onSave(): void {
    if (this.form.invalid) return;
    const { name, color } = this.form.getRawValue();
    const existing = this.editingLabel();

    if (existing) {
      this.labelService
        .updateLabel(existing.id, { name, color })
        .pipe(take(1))
        .subscribe(() => this.dialogVisible.set(false));
    } else {
      this.labelService
        .createLabel(name, color)
        .pipe(take(1))
        .subscribe(() => this.dialogVisible.set(false));
    }
  }

  onDelete(label: Label): void {
    this.labelService.deleteLabel(label.id).pipe(take(1)).subscribe();
  }
}
