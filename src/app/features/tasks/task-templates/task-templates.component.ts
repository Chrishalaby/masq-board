import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { take } from 'rxjs';
import { TaskTemplate } from '../../../models/task-template.model';
import { TASK_PRIORITIES } from '../../../models/task.model';
import { TaskTemplateService } from '../../../services/task-template.service';

@Component({
  selector: 'app-task-templates',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Button,
    Dialog,
    InputText,
    Select,
    Textarea,
    ToggleSwitch,
  ],
  template: `
    <div class="mx-auto max-w-4xl p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Task Templates</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Default tasks automatically created when a new project is added.
          </p>
        </div>
        @if (templateService.isAdmin()) {
          <p-button label="New Template" icon="pi pi-plus" (onClick)="openEditor()" />
        }
      </div>

      @if (templateService.templates().length === 0) {
        <div
          class="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-600"
        >
          <i class="pi pi-file-edit mb-2 text-4xl text-gray-400"></i>
          <p class="text-gray-500 dark:text-gray-400">No task templates yet.</p>
          @if (templateService.isAdmin()) {
            <p class="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Create a template to auto-generate tasks for new projects.
            </p>
          }
        </div>
      } @else {
        <div class="flex flex-col gap-3">
          @for (tpl of templateService.templates(); track tpl.id) {
            <div
              class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900 dark:text-white">{{ tpl.title }}</span>
                  <span
                    class="rounded px-1.5 py-0.5 text-xs font-medium"
                    [class]="priorityClass(tpl.priority)"
                  >
                    {{ tpl.priority }}
                  </span>
                  @if (!tpl.isActive) {
                    <span
                      class="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    >
                      Inactive
                    </span>
                  }
                </div>
                @if (tpl.description) {
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ tpl.description }}</p>
                }
                @if (tpl.checklist?.length) {
                  <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {{ tpl.checklist!.length }} milestone{{ tpl.checklist!.length > 1 ? 's' : '' }}
                  </p>
                }
              </div>
              @if (templateService.isAdmin()) {
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-pencil"
                    [text]="true"
                    [rounded]="true"
                    size="small"
                    (onClick)="openEditor(tpl)"
                    ariaLabel="Edit template"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [text]="true"
                    [rounded]="true"
                    severity="danger"
                    size="small"
                    (onClick)="onDelete(tpl)"
                    ariaLabel="Delete template"
                  />
                </div>
              }
            </div>
          }
        </div>
      }

      <div class="mt-6">
        <a
          routerLink="/tasks"
          class="text-sm text-primary-600 hover:underline dark:text-primary-400"
        >
          ← Back to Tasks
        </a>
      </div>
    </div>

    <!-- Editor Dialog -->
    <p-dialog
      [header]="editingTemplate() ? 'Edit Template' : 'New Template'"
      [visible]="editorVisible()"
      (visibleChange)="editorVisible.set($event)"
      [modal]="true"
      [style]="{ width: '36rem' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      <form [formGroup]="form" (ngSubmit)="onSave()" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="tplTitle" class="text-sm font-medium">Title *</label>
          <input
            pInputText
            id="tplTitle"
            formControlName="title"
            placeholder="Task template title"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="tplPriority" class="text-sm font-medium">Priority</label>
          <p-select
            id="tplPriority"
            formControlName="priority"
            [options]="priorities"
            optionLabel="label"
            optionValue="value"
            appendTo="body"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="tplDesc" class="text-sm font-medium">Description</label>
          <textarea pTextarea id="tplDesc" formControlName="description" rows="2"></textarea>
        </div>

        <div class="flex items-center gap-2">
          <p-toggleswitch formControlName="isActive" />
          <label class="text-sm font-medium">Active</label>
        </div>

        <!-- Milestones -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Milestones</label>
          <div class="flex flex-col gap-2">
            @for (item of checklistArray.controls; track $index) {
              <div class="flex items-center gap-2">
                <input pInputText class="flex-1" [formControl]="getChecklistTitle($index)" />
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  [text]="true"
                  size="small"
                  (onClick)="removeChecklist($index)"
                  ariaLabel="Remove milestone"
                />
              </div>
            }
            <div class="flex items-center gap-1">
              <input
                pInputText
                class="flex-1"
                placeholder="New milestone"
                [formControl]="newChecklistControl"
                (keydown.enter)="addChecklist(); $event.preventDefault()"
              />
              <p-button
                icon="pi pi-plus"
                [rounded]="true"
                [text]="true"
                size="small"
                (onClick)="addChecklist()"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t pt-3">
          <p-button
            label="Cancel"
            severity="secondary"
            [outlined]="true"
            (onClick)="editorVisible.set(false)"
          />
          <p-button label="Save" type="submit" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class TaskTemplatesComponent implements OnInit {
  readonly templateService = inject(TaskTemplateService);

  readonly priorities = TASK_PRIORITIES;
  readonly editorVisible = signal(false);
  readonly editingTemplate = signal<TaskTemplate | null>(null);
  readonly newChecklistControl = new FormControl('');

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    priority: new FormControl<'low' | 'medium' | 'high' | 'urgent'>('medium', {
      nonNullable: true,
    }),
    isActive: new FormControl(true, { nonNullable: true }),
    checklist: new FormArray<FormControl<string>>([]),
  });

  get checklistArray(): FormArray<FormControl<string>> {
    return this.form.controls.checklist;
  }

  ngOnInit(): void {
    this.templateService.loadTemplates();
    this.templateService.checkAdmin();
  }

  openEditor(tpl?: TaskTemplate): void {
    this.editingTemplate.set(tpl ?? null);
    this.checklistArray.clear();

    if (tpl) {
      this.form.patchValue({
        title: tpl.title,
        description: tpl.description ?? '',
        priority: tpl.priority,
        isActive: tpl.isActive,
      });
      tpl.checklist?.forEach((c) =>
        this.checklistArray.push(new FormControl(c.title, { nonNullable: true })),
      );
    } else {
      this.form.reset({ priority: 'medium', isActive: true });
    }

    this.editorVisible.set(true);
  }

  addChecklist(): void {
    const value = this.newChecklistControl.value?.trim();
    if (value) {
      this.checklistArray.push(new FormControl(value, { nonNullable: true }));
      this.newChecklistControl.reset();
    }
  }

  removeChecklist(i: number): void {
    this.checklistArray.removeAt(i);
  }

  getChecklistTitle(i: number): FormControl<string> {
    return this.checklistArray.at(i);
  }

  onSave(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();

    const data: Partial<TaskTemplate> = {
      title: raw.title,
      description: raw.description || undefined,
      priority: raw.priority,
      isActive: raw.isActive,
      checklist: raw.checklist.map((title) => ({ title, completed: false })),
    };

    const existing = this.editingTemplate();
    if (existing) {
      this.templateService
        .updateTemplate(existing.id, data)
        .pipe(take(1))
        .subscribe(() => this.editorVisible.set(false));
    } else {
      this.templateService
        .createTemplate(data)
        .pipe(take(1))
        .subscribe(() => this.editorVisible.set(false));
    }
  }

  onDelete(tpl: TaskTemplate): void {
    this.templateService.deleteTemplate(tpl.id).pipe(take(1)).subscribe();
  }

  priorityClass(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'medium':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  }
}
