import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { take } from 'rxjs/operators';
import { Project, PROJECT_STATUSES } from '../../../models/project.model';
import { ProjectService } from '../../../services/project.service';

@Component({
  selector: 'app-project-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Dialog, InputText, Textarea, Select, DatePicker, Button],
  template: `
    <p-dialog
      [header]="project() ? 'Edit Project' : 'New Project'"
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [style]="{ width: '36rem' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      <form [formGroup]="form" (ngSubmit)="onSave()" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="name" class="text-sm font-medium">Project Name *</label>
          <input pInputText id="name" formControlName="name" placeholder="Project name" />
        </div>

        <div class="flex flex-col gap-1">
          <label for="status" class="text-sm font-medium">Status</label>
          <p-select
            id="status"
            formControlName="status"
            [options]="statuses"
            optionLabel="label"
            optionValue="value"
            placeholder="Select"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="startDate" class="text-sm font-medium">Start Date</label>
            <p-datepicker
              id="startDate"
              formControlName="startDate"
              dateFormat="yy-mm-dd"
              [showIcon]="true"
              appendTo="body"
              [autoZIndex]="true"
              [baseZIndex]="12000"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="endDate" class="text-sm font-medium">End Date</label>
            <p-datepicker
              id="endDate"
              formControlName="endDate"
              dateFormat="yy-mm-dd"
              [showIcon]="true"
              [minDate]="form.controls.startDate.value || undefined"
              appendTo="body"
              [autoZIndex]="true"
              [baseZIndex]="12000"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label for="description" class="text-sm font-medium">Description</label>
          <textarea pTextarea id="description" formControlName="description" rows="3"></textarea>
        </div>

        <div class="flex justify-end gap-2 border-t pt-3">
          @if (project()) {
            <p-button label="Delete" severity="danger" [outlined]="true" (onClick)="onDelete()" />
          }
          <p-button
            label="Cancel"
            severity="secondary"
            [outlined]="true"
            (onClick)="onVisibleChange(false)"
          />
          <p-button label="Save" type="submit" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class ProjectEditorComponent {
  private readonly projectService = inject(ProjectService);

  readonly project = input<Project | null>(null);
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly saved = output<void>();

  readonly statuses = PROJECT_STATUSES;

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<'draft' | 'active' | 'on-hold' | 'completed' | 'archived'>('draft', {
      nonNullable: true,
    }),
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
    description: new FormControl('', { nonNullable: true }),
  });

  onVisibleChange(val: boolean): void {
    this.visibleChange.emit(val);
    if (val) this.patchForm();
  }

  onSave(): void {
    console.info('[ProjectEditor] Save clicked', {
      visible: this.visible(),
      editingProjectId: this.project()?.id ?? null,
      formValid: this.form.valid,
      formValue: this.form.getRawValue(),
    });

    if (this.form.invalid) {
      console.warn('[ProjectEditor] Save blocked because form is invalid', {
        errors: this.collectFormErrors(),
      });
      return;
    }
    const raw = this.form.getRawValue();

    const data: Record<string, unknown> = {
      name: raw.name,
      status: raw.status,
      description: raw.description || undefined,
      startDate: raw.startDate ? raw.startDate.toISOString().split('T')[0] : undefined,
      endDate: raw.endDate ? raw.endDate.toISOString().split('T')[0] : undefined,
    };

    const existing = this.project();
    if (existing) {
      console.info('[ProjectEditor] Updating project', { projectId: existing.id, data });
      this.projectService
        .updateProject(existing.id, data as Partial<Project>)
        .pipe(take(1))
        .subscribe({
          next: () => {
            console.info('[ProjectEditor] Update project succeeded', { projectId: existing.id });
            this.saved.emit();
            this.visibleChange.emit(false);
          },
          error: (error) => {
            console.error('[ProjectEditor] Update project failed', error);
          },
        });
    } else {
      console.info('[ProjectEditor] Creating project', { data });
      this.projectService
        .createProject(data as Partial<Project>)
        .pipe(take(1))
        .subscribe({
          next: (created) => {
            console.info('[ProjectEditor] Create project succeeded', {
              projectId: created.id,
              created,
            });
            this.saved.emit();
            this.visibleChange.emit(false);
          },
          error: (error) => {
            console.error('[ProjectEditor] Create project failed', error);
          },
        });
    }
  }

  onDelete(): void {
    const existing = this.project();
    if (existing) {
      this.projectService
        .deleteProject(existing.id)
        .pipe(take(1))
        .subscribe(() => {
          this.saved.emit();
          this.visibleChange.emit(false);
        });
    }
  }

  private patchForm(): void {
    const p = this.project();
    if (p) {
      this.form.patchValue({
        name: p.name,
        status: p.status,
        description: p.description ?? '',
        startDate: p.startDate ? new Date(p.startDate) : null,
        endDate: p.endDate ? new Date(p.endDate) : null,
      });
    } else {
      this.form.reset({ status: 'draft' });
    }
  }

  private collectFormErrors(): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(this.form.controls)
        .filter(([, control]) => control.invalid)
        .map(([key, control]) => [key, control.errors]),
    );
  }
}
