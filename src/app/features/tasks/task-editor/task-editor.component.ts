import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Chip } from 'primeng/chip';
import { Task, TASK_PRIORITIES, TASK_STATUSES, ChecklistItem } from '../../../models/task.model';
import { TaskService } from '../../../services/task.service';

@Component({
  selector: 'app-task-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    Dialog,
    InputText,
    Textarea,
    Select,
    DatePicker,
    Button,
    Checkbox,
    Chip,
  ],
  template: `
    <p-dialog
      [header]="task() ? 'Edit Task' : 'New Task'"
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [style]="{ width: '42rem' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      <form [formGroup]="form" (ngSubmit)="onSave()" class="flex flex-col gap-4 pt-2">
        <!-- Title -->
        <div class="flex flex-col gap-1">
          <label for="title" class="text-sm font-medium">Title *</label>
          <input pInputText id="title" formControlName="title" placeholder="Task title" />
        </div>

        <!-- Owner + Priority + Status row -->
        <div class="grid grid-cols-3 gap-3">
          <div class="flex flex-col gap-1">
            <label for="owner" class="text-sm font-medium">Owner *</label>
            <input pInputText id="owner" formControlName="owner" placeholder="Owner name" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="priority" class="text-sm font-medium">Priority</label>
            <p-select
              id="priority"
              formControlName="priority"
              [options]="priorities"
              optionLabel="label"
              optionValue="value"
              placeholder="Select"
            />
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
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="startDate" class="text-sm font-medium">Start Date</label>
            <p-datepicker id="startDate" formControlName="startDate" dateFormat="yy-mm-dd" [showIcon]="true" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="dueDate" class="text-sm font-medium">Due Date</label>
            <p-datepicker id="dueDate" formControlName="dueDate" dateFormat="yy-mm-dd" [showIcon]="true" />
          </div>
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1">
          <label for="description" class="text-sm font-medium">Description</label>
          <textarea pTextarea id="description" formControlName="description" rows="3"></textarea>
        </div>

        <!-- Milestones -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="currentMilestone" class="text-sm font-medium">Current Milestone</label>
            <input pInputText id="currentMilestone" formControlName="currentMilestone" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="nextMilestone" class="text-sm font-medium">Next Milestone</label>
            <input pInputText id="nextMilestone" formControlName="nextMilestone" />
          </div>
        </div>

        <!-- Delay Risk -->
        <div class="flex flex-col gap-1">
          <label for="delayRisk" class="text-sm font-medium">Delay Risk</label>
          <input pInputText id="delayRisk" formControlName="delayRisk" />
        </div>

        <!-- Labels -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Labels</label>
          <div class="flex flex-wrap items-center gap-1">
            @for (label of labelsArray.controls; track $index) {
              <p-chip [label]="label.value" [removable]="true" (onRemove)="removeLabel($index)" />
            }
            <div class="flex items-center gap-1">
              <input
                pInputText
                class="w-28"
                placeholder="Add label"
                [formControl]="newLabelControl"
                (keydown.enter)="addLabel(); $event.preventDefault()"
              />
              <p-button icon="pi pi-plus" [rounded]="true" [text]="true" size="small" (onClick)="addLabel()" />
            </div>
          </div>
        </div>

        <!-- Checklist -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Checklist</label>
          <div class="flex flex-col gap-2">
            @for (item of checklistArray.controls; track $index) {
              <div class="flex items-center gap-2">
                <p-checkbox [formControl]="getChecklistCompleted($index)" [binary]="true" />
                <input
                  pInputText
                  class="flex-1"
                  [formControl]="getChecklistTitle($index)"
                />
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  [text]="true"
                  size="small"
                  (onClick)="removeChecklist($index)"
                  ariaLabel="Remove checklist item"
                />
              </div>
            }
            <div class="flex items-center gap-1">
              <input
                pInputText
                class="flex-1"
                placeholder="New checklist item"
                [formControl]="newChecklistControl"
                (keydown.enter)="addChecklist(); $event.preventDefault()"
              />
              <p-button icon="pi pi-plus" [rounded]="true" [text]="true" size="small" (onClick)="addChecklist()" />
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 border-t pt-3">
          @if (task()) {
            <p-button
              label="Delete"
              severity="danger"
              [outlined]="true"
              (onClick)="onDelete()"
            />
          }
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="onVisibleChange(false)" />
          <p-button
            label="Save"
            type="submit"
            [disabled]="form.invalid"
          />
        </div>
      </form>
    </p-dialog>
  `,
})
export class TaskEditorComponent implements OnInit {
  private readonly taskService = inject(TaskService);

  readonly task = input<Task | null>(null);
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly saved = output<void>();

  readonly priorities = TASK_PRIORITIES;
  readonly statuses = TASK_STATUSES;

  readonly newLabelControl = new FormControl('');
  readonly newChecklistControl = new FormControl('');

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    owner: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    priority: new FormControl<'low' | 'medium' | 'high' | 'urgent'>('medium', { nonNullable: true }),
    status: new FormControl<'not-started' | 'in-progress' | 'blocked' | 'completed'>('not-started', {
      nonNullable: true,
    }),
    startDate: new FormControl<Date | null>(null),
    dueDate: new FormControl<Date | null>(null),
    description: new FormControl('', { nonNullable: true }),
    currentMilestone: new FormControl('', { nonNullable: true }),
    nextMilestone: new FormControl('', { nonNullable: true }),
    delayRisk: new FormControl('', { nonNullable: true }),
    labels: new FormArray<FormControl<string>>([]),
    checklist: new FormArray<FormGroup<{ title: FormControl<string>; completed: FormControl<boolean> }>>([]),
  });

  get labelsArray(): FormArray<FormControl<string>> {
    return this.form.controls.labels;
  }

  get checklistArray(): FormArray<FormGroup<{ title: FormControl<string>; completed: FormControl<boolean> }>> {
    return this.form.controls.checklist;
  }

  ngOnInit(): void {
    this.patchForm();
  }

  onVisibleChange(val: boolean): void {
    this.visibleChange.emit(val);
    if (val) this.patchForm();
  }

  addLabel(): void {
    const value = this.newLabelControl.value?.trim();
    if (value) {
      this.labelsArray.push(new FormControl(value, { nonNullable: true }));
      this.newLabelControl.reset();
    }
  }

  removeLabel(i: number): void {
    this.labelsArray.removeAt(i);
  }

  addChecklist(): void {
    const value = this.newChecklistControl.value?.trim();
    if (value) {
      this.checklistArray.push(
        new FormGroup({
          title: new FormControl(value, { nonNullable: true }),
          completed: new FormControl(false, { nonNullable: true }),
        }),
      );
      this.newChecklistControl.reset();
    }
  }

  removeChecklist(i: number): void {
    this.checklistArray.removeAt(i);
  }

  getChecklistTitle(i: number): FormControl<string> {
    return this.checklistArray.at(i).controls.title;
  }

  getChecklistCompleted(i: number): FormControl<boolean> {
    return this.checklistArray.at(i).controls.completed;
  }

  onSave(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();

    const taskData = {
      title: raw.title,
      description: raw.description,
      owner: raw.owner,
      priority: raw.priority,
      status: raw.status,
      startDate: raw.startDate ? this.formatDate(raw.startDate) : undefined,
      dueDate: raw.dueDate ? this.formatDate(raw.dueDate) : undefined,
      currentMilestone: raw.currentMilestone || undefined,
      nextMilestone: raw.nextMilestone || undefined,
      delayRisk: raw.delayRisk || undefined,
      labels: raw.labels.length ? raw.labels : undefined,
      checklist: raw.checklist.length ? raw.checklist : undefined,
    };

    const existingTask = this.task();
    if (existingTask) {
      this.taskService.updateTask({ ...taskData, id: existingTask.id } as Task);
    } else {
      this.taskService.addTask(taskData as Omit<Task, 'id'>);
    }
    this.saved.emit();
    this.visibleChange.emit(false);
  }

  onDelete(): void {
    const existingTask = this.task();
    if (existingTask) {
      this.taskService.deleteTask(existingTask.id);
      this.saved.emit();
      this.visibleChange.emit(false);
    }
  }

  private patchForm(): void {
    const t = this.task();
    this.labelsArray.clear();
    this.checklistArray.clear();

    if (t) {
      this.form.patchValue({
        title: t.title,
        owner: t.owner,
        priority: t.priority,
        status: t.status,
        startDate: t.startDate ? new Date(t.startDate) : null,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        description: t.description,
        currentMilestone: t.currentMilestone ?? '',
        nextMilestone: t.nextMilestone ?? '',
        delayRisk: t.delayRisk ?? '',
      });
      t.labels?.forEach((l) => this.labelsArray.push(new FormControl(l, { nonNullable: true })));
      t.checklist?.forEach((c) =>
        this.checklistArray.push(
          new FormGroup({
            title: new FormControl(c.title, { nonNullable: true }),
            completed: new FormControl(c.completed, { nonNullable: true }),
          }),
        ),
      );
    } else {
      this.form.reset({ priority: 'medium', status: 'not-started' });
    }
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
