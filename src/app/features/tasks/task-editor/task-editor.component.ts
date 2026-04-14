import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Chip } from 'primeng/chip';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  Label,
  Task,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskAssigneeRole,
} from '../../../models/task.model';
import { UserAssignment } from '../../../models/user-assignment.model';
import { LabelService } from '../../../services/label.service';
import { ProjectService } from '../../../services/project.service';
import { TaskService } from '../../../services/task.service';
import { UserService } from '../../../services/user.service';

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
    ToggleSwitch,
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

        <!-- Assignees -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Assignees</label>
          <div class="flex flex-col gap-2">
            @for (assignee of assigneesArray.controls; track $index) {
              <div class="flex items-center gap-2">
                <p-select
                  class="flex-1"
                  [options]="assignableUsers()"
                  optionLabel="displayName"
                  optionValue="id"
                  placeholder="Select user"
                  [filter]="true"
                  filterBy="displayName"
                  [formControl]="getAssigneeUserId($index)"
                  appendTo="body"
                />
                <p-select
                  [options]="assigneeRoleOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="No role"
                  [showClear]="true"
                  [formControl]="getAssigneeRole($index)"
                  appendTo="body"
                  [style]="{ width: '10rem' }"
                />
                @if (isAdmin() || !task()) {
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    size="small"
                    (onClick)="removeAssignee($index)"
                    ariaLabel="Remove assignee"
                  />
                }
              </div>
            }
            @if (isAdmin() || !task()) {
              <p-button
                icon="pi pi-plus"
                label="Add Assignee"
                [text]="true"
                size="small"
                (onClick)="addAssignee()"
              />
            }
          </div>
        </div>

        <!-- Project -->
        @if (!initiativeId()) {
          <div class="flex flex-col gap-1">
            <label for="projectId" class="text-sm font-medium">Project</label>
            <p-select
              id="projectId"
              formControlName="projectId"
              [options]="projects()"
              optionLabel="name"
              optionValue="id"
              placeholder="Standalone (no project)"
              [showClear]="true"
              appendTo="body"
            />
          </div>
        }

        <!-- Priority + Status row -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="priority" class="text-sm font-medium">Priority</label>
            <p-select
              id="priority"
              formControlName="priority"
              [options]="priorities"
              optionLabel="label"
              optionValue="value"
              placeholder="Select"
              appendTo="body"
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
              appendTo="body"
            />
          </div>
        </div>

        <!-- Dates -->
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
            <label for="dueDate" class="text-sm font-medium">Due Date</label>
            <p-datepicker
              id="dueDate"
              formControlName="dueDate"
              dateFormat="yy-mm-dd"
              [showIcon]="true"
              [minDate]="form.controls.startDate.value || undefined"
              appendTo="body"
              [autoZIndex]="true"
              [baseZIndex]="12000"
            />
          </div>
        </div>

        <!-- Recurring -->
        <div class="flex items-center gap-2">
          <p-toggleswitch formControlName="isRecurring" inputId="isRecurring" />
          <label for="isRecurring" class="text-sm font-medium">Recurring Every Day</label>
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1">
          <label for="description" class="text-sm font-medium"
            >Description (List All Milestones)</label
          >
          <textarea pTextarea id="description" formControlName="description" rows="3"></textarea>
        </div>

        <!-- Milestones -->
        <div class="grid grid-cols-3 gap-3">
          <div class="flex flex-col gap-1">
            <label for="milestoneAchieved" class="text-sm font-medium">Milestone Achieved</label>
            <input pInputText id="milestoneAchieved" formControlName="milestoneAchieved" />
          </div>
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

        <!-- Linked Files -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Linked Files</label>
          <div class="flex flex-col gap-2">
            @for (url of linkedFilesArray.controls; track $index) {
              <div class="flex items-center gap-2">
                <input pInputText class="flex-1" [formControl]="url" placeholder="https://..." />
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  [text]="true"
                  size="small"
                  (onClick)="removeLinkedFile($index)"
                  ariaLabel="Remove linked file"
                />
              </div>
            }
            <div class="flex items-center gap-1">
              <input
                pInputText
                class="flex-1"
                placeholder="Add a file URL..."
                [formControl]="newLinkedFileControl"
                (keydown.enter)="addLinkedFile(); $event.preventDefault()"
              />
              <p-button
                icon="pi pi-plus"
                [rounded]="true"
                [text]="true"
                size="small"
                (onClick)="addLinkedFile()"
              />
            </div>
            @if (task()) {
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
                @if (uploadError()) {
                  <span class="text-xs text-red-500">{{ uploadError() }}</span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Labels -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Labels</label>
          <div class="flex flex-wrap items-center gap-1">
            @for (label of labelsArray.controls; track $index) {
              <p-chip
                [label]="getLabelDisplay($index)"
                [removable]="true"
                (onRemove)="removeLabel($index)"
              />
            }
            <div class="flex items-center gap-1">
              <p-select
                [options]="availableLabels()"
                optionLabel="name"
                optionValue="id"
                placeholder="Add label"
                [showClear]="true"
                [formControl]="newLabelSelect"
                (onChange)="addLabelFromSelect()"
              />
            </div>
          </div>
        </div>

        <!-- Depending Task -->
        @if (isAdmin() || !task()) {
          <div class="flex flex-col gap-1">
            <label for="dependingTask" class="text-sm font-medium">Depending Task</label>
            <p-select
              id="dependingTask"
              [formControl]="dependingTaskControl"
              [options]="availableTasks()"
              optionLabel="title"
              optionValue="id"
              placeholder="Select a task this depends on"
              [filter]="true"
              filterBy="title"
              [showClear]="true"
              appendTo="body"
            />
          </div>
        }

        <!-- Dependencies -->
        @if (task()) {
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">Dependencies</label>
            @if (task()!.dependencies?.length) {
              <div class="flex flex-col gap-1">
                @for (dep of task()!.dependencies; track dep.id) {
                  <div
                    class="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-sm dark:bg-gray-800"
                  >
                    <span>🔗 {{ dep.dependsOn?.title || dep.dependsOnTaskId }}</span>
                    @if (isAdmin()) {
                      <p-button
                        icon="pi pi-trash"
                        severity="danger"
                        [text]="true"
                        size="small"
                        (onClick)="onRemoveDependency(dep.id)"
                        ariaLabel="Remove dependency"
                      />
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Checklist -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Checklist</label>
          <div class="flex flex-col gap-2">
            @for (item of checklistArray.controls; track $index) {
              <div class="flex items-center gap-2">
                <p-checkbox [formControl]="getChecklistCompleted($index)" [binary]="true" />
                <input pInputText class="flex-1" [formControl]="getChecklistTitle($index)" />
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

        <!-- Actions -->
        <div class="flex justify-end gap-2 border-t pt-3">
          @if (task()) {
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
export class TaskEditorComponent implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private readonly projectService = inject(ProjectService);
  private readonly labelService = inject(LabelService);

  readonly task = input<Task | null>(null);
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly saved = output<void>();
  readonly projectId = input<string | undefined>(undefined);
  readonly initiativeId = input<string | undefined>(undefined);
  /** Optional: pass department users when inside an initiative context */
  readonly departmentId = input<string | undefined>(undefined);

  readonly priorities = TASK_PRIORITIES;
  readonly statuses = TASK_STATUSES;
  readonly assigneeRoleOptions = [
    { label: 'Leader', value: 'leader' as TaskAssigneeRole },
    { label: 'Member', value: 'member' as TaskAssigneeRole },
  ];
  readonly projects = this.projectService.projects;
  readonly availableLabels = this.labelService.labels;

  readonly newLabelSelect = new FormControl<string | null>(null);
  readonly newChecklistControl = new FormControl('');
  readonly newLinkedFileControl = new FormControl('');
  readonly dependingTaskControl = new FormControl<string | null>(null);
  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);

  private selectedLabels: Label[] = [];

  /** Assignments for the current user (populated in ngOnInit) */
  private readonly myAssignments = signal<UserAssignment[]>([]);

  /** Whether the current user is an admin */
  readonly isAdmin = computed(() => this.userService.currentUser()?.isAdmin === true);

  /**
   * Filtered list of users that the current user is allowed to assign tasks to.
   * Rules (evaluated in order):
   *  1. isGeneralSupervisor + no initiative → all users
   *  2. isGeneralSupervisor + initiative   → department users only
   *  3. Has canAssignTo rows               → those users + self
   *  4. Regular user                       → self only
   * Self is always included.
   */
  readonly assignableUsers = computed(() => {
    const allUsers = this.userService.users();
    const me = this.userService.currentUser();
    if (!me) return allUsers; // not loaded yet — show all as fallback

    const self = allUsers.find((u) => u.id === me.id);
    const selfArr = self ? [self] : [];

    if (me.isGeneralSupervisor) {
      if (this.departmentId()) {
        // Interdepartmental dept: show all users
        if (this.departmentId() === environment.interdepartmentalDepartmentId) {
          return allUsers;
        }
        // Inside an initiative: filter to the initiative's department
        const deptUsers = allUsers.filter((u) => u.departmentId === this.departmentId());
        return deptUsers.some((u) => u.id === me.id) ? deptUsers : [...selfArr, ...deptUsers];
      }
      return allUsers;
    }

    const assignments = this.myAssignments();
    if (assignments.length > 0) {
      const assignableIds = new Set(assignments.map((a) => a.canAssignToUserId));
      const assignable = allUsers.filter((u) => assignableIds.has(u.id));
      return assignable.some((u) => u.id === me.id) ? assignable : [...selfArr, ...assignable];
    }

    // Regular user — self only
    return selfArr;
  });

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      // Track task so effect re-runs when task changes
      this.task();
      if (isVisible) {
        untracked(() => this.patchForm());
      }
    });
  }

  readonly availableTasks = computed(() => {
    const allTasks = this.taskService.tasks();
    const currentId = this.task()?.id;
    const existingDepIds = new Set(this.task()?.dependencies?.map((d) => d.dependsOnTaskId) ?? []);
    return allTasks.filter((t) => t.id !== currentId && !existingDepIds.has(t.id));
  });

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    assigneeId: new FormControl<string | null>(null),
    projectId: new FormControl<string | null>(null),
    priority: new FormControl<'low' | 'medium' | 'high' | 'urgent'>('medium', {
      nonNullable: true,
    }),
    status: new FormControl<'not-started' | 'on-hold' | 'in-progress' | 'completed'>(
      'not-started',
      { nonNullable: true },
    ),
    startDate: new FormControl<Date | null>(null),
    dueDate: new FormControl<Date | null>(null),
    isRecurring: new FormControl(false, { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    milestoneAchieved: new FormControl('', { nonNullable: true }),
    currentMilestone: new FormControl('', { nonNullable: true }),
    nextMilestone: new FormControl('', { nonNullable: true }),
    delayRisk: new FormControl('', { nonNullable: true }),
    labels: new FormArray<FormControl<string>>([]),
    linkedFiles: new FormArray<FormControl<string>>([]),
    assignees: new FormArray<
      FormGroup<{ userId: FormControl<string>; role: FormControl<TaskAssigneeRole | null> }>
    >([]),
    checklist: new FormArray<
      FormGroup<{ title: FormControl<string>; completed: FormControl<boolean> }>
    >([]),
  });

  get labelsArray(): FormArray<FormControl<string>> {
    return this.form.controls.labels;
  }

  get assigneesArray(): FormArray<
    FormGroup<{ userId: FormControl<string>; role: FormControl<TaskAssigneeRole | null> }>
  > {
    return this.form.controls.assignees;
  }

  get checklistArray(): FormArray<
    FormGroup<{ title: FormControl<string>; completed: FormControl<boolean> }>
  > {
    return this.form.controls.checklist;
  }

  get linkedFilesArray(): FormArray<FormControl<string>> {
    return this.form.controls.linkedFiles;
  }

  ngOnInit(): void {
    this.userService.loadUsers();
    this.userService.loadCurrentUser();
    this.projectService.loadProjects();
    this.labelService.loadLabels();

    // Load this user's canAssignTo relationships for filtering
    const me = this.userService.currentUser();
    if (me?.departmentId) {
      this.userService
        .getAssignments({ userId: me.id, departmentId: me.departmentId })
        .subscribe({ next: (rows) => this.myAssignments.set(rows) });
    }
    // If not loaded yet, re-attempt once currentUser loads
    effect(
      () => {
        const user = this.userService.currentUser();
        if (user?.departmentId && this.myAssignments().length === 0) {
          untracked(() => {
            this.userService
              .getAssignments({ userId: user.id, departmentId: user.departmentId! })
              .subscribe({ next: (rows) => this.myAssignments.set(rows) });
          });
        }
      },
      { allowSignalWrites: true },
    );
  }

  onVisibleChange(val: boolean): void {
    this.visibleChange.emit(val);
  }

  getLabelDisplay(index: number): string {
    const labelId = this.labelsArray.at(index).value;
    const label = this.selectedLabels.find((l) => l.id === labelId);
    return label?.name ?? labelId;
  }

  addLabelFromSelect(): void {
    const id = this.newLabelSelect.value;
    if (id && !this.labelsArray.value.includes(id)) {
      const label = this.availableLabels().find((l) => l.id === id);
      if (label) {
        this.selectedLabels.push(label);
        this.labelsArray.push(new FormControl(id, { nonNullable: true }));
      }
    }
    this.newLabelSelect.reset();
  }

  removeLabel(i: number): void {
    const labelId = this.labelsArray.at(i).value;
    this.selectedLabels = this.selectedLabels.filter((l) => l.id !== labelId);
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

  addLinkedFile(): void {
    const value = this.newLinkedFileControl.value?.trim();
    if (value) {
      this.linkedFilesArray.push(new FormControl(value, { nonNullable: true }));
      this.newLinkedFileControl.reset();
    }
  }

  removeLinkedFile(i: number): void {
    this.linkedFilesArray.removeAt(i);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.task()) return;

    this.uploading.set(true);
    this.uploadError.set(null);

    this.taskService
      .uploadFile(this.task()!.id, file)
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.linkedFilesArray.push(new FormControl(result.url, { nonNullable: true }));
          this.uploading.set(false);
          input.value = '';
        },
        error: (err) => {
          this.uploadError.set(err?.error?.message || 'Upload failed');
          this.uploading.set(false);
          input.value = '';
        },
      });
  }

  addAssignee(): void {
    this.assigneesArray.push(
      new FormGroup({
        userId: new FormControl('', { nonNullable: true }),
        role: new FormControl<TaskAssigneeRole | null>(null),
      }),
    );
  }

  removeAssignee(i: number): void {
    this.assigneesArray.removeAt(i);
  }

  getAssigneeUserId(i: number): FormControl<string> {
    return this.assigneesArray.at(i).controls.userId;
  }

  getAssigneeRole(i: number): FormControl<TaskAssigneeRole | null> {
    return this.assigneesArray.at(i).controls.role;
  }

  getChecklistTitle(i: number): FormControl<string> {
    return this.checklistArray.at(i).controls.title;
  }

  getChecklistCompleted(i: number): FormControl<boolean> {
    return this.checklistArray.at(i).controls.completed;
  }

  onRemoveDependency(depId: string): void {
    const t = this.task();
    if (t) {
      this.taskService.removeDependency(t.id, depId);
    }
  }

  onSave(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();

    const taskData: Partial<Task> = {
      title: raw.title,
      description: raw.description,
      priority: raw.priority,
      status: raw.status,
      startDate: raw.startDate ? this.formatDate(raw.startDate) : undefined,
      dueDate: raw.dueDate ? this.formatDate(raw.dueDate) : undefined,
      isRecurring: raw.isRecurring,
      milestoneAchieved: raw.milestoneAchieved || undefined,
      currentMilestone: raw.currentMilestone || undefined,
      nextMilestone: raw.nextMilestone || undefined,
      delayRisk: raw.delayRisk || undefined,
      assigneeId: raw.assigneeId || undefined,
      projectId: raw.projectId || this.projectId() || undefined,
      initiativeId: this.initiativeId() || this.task()?.initiativeId || undefined,
      labels: this.selectedLabels,
      linkedFiles: raw.linkedFiles?.length ? raw.linkedFiles : undefined,
      assignees: raw.assignees
        ?.filter((a) => a.userId)
        .map((a) => ({ userId: a.userId, role: a.role })),
      checklist: raw.checklist.length ? raw.checklist : undefined,
    };

    const existingTask = this.task();
    const depId = this.dependingTaskControl.value;

    if (existingTask) {
      this.taskService
        .updateTask({ ...taskData, id: existingTask.id } as Task)
        .pipe(
          switchMap((updated) => {
            if (depId) {
              return this.taskService.addDependency(updated.id, depId);
            }
            return of(null);
          }),
          take(1),
        )
        .subscribe({
          next: () => {
            this.saved.emit();
            this.visibleChange.emit(false);
          },
        });
    } else {
      this.taskService
        .addTask(taskData)
        .pipe(
          switchMap((created) => {
            if (depId) {
              return this.taskService.addDependency(created.id, depId);
            }
            return of(null);
          }),
          take(1),
        )
        .subscribe({
          next: () => {
            this.saved.emit();
            this.visibleChange.emit(false);
          },
        });
    }
  }

  onDelete(): void {
    const existingTask = this.task();
    if (existingTask) {
      this.taskService
        .deleteTask(existingTask.id)
        .pipe(take(1))
        .subscribe(() => {
          this.saved.emit();
          this.visibleChange.emit(false);
        });
    }
  }

  private patchForm(): void {
    const t = this.task();
    this.labelsArray.clear();
    this.checklistArray.clear();
    this.linkedFilesArray.clear();
    this.assigneesArray.clear();
    this.selectedLabels = [];
    this.dependingTaskControl.reset();

    if (t) {
      this.form.patchValue({
        title: t.title,
        assigneeId: t.assigneeId ?? null,
        projectId: t.projectId ?? null,
        priority: t.priority,
        status: t.status,
        startDate: t.startDate ? new Date(t.startDate) : null,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        isRecurring: t.isRecurring ?? false,
        description: t.description,
        milestoneAchieved: t.milestoneAchieved ?? '',
        currentMilestone: t.currentMilestone ?? '',
        nextMilestone: t.nextMilestone ?? '',
        delayRisk: t.delayRisk ?? '',
      });
      if (t.labels) {
        this.selectedLabels = [...t.labels];
        t.labels.forEach((l) =>
          this.labelsArray.push(new FormControl(l.id, { nonNullable: true })),
        );
      }
      t.linkedFiles?.forEach((url) =>
        this.linkedFilesArray.push(new FormControl(url, { nonNullable: true })),
      );
      t.assignees?.forEach((a) =>
        this.assigneesArray.push(
          new FormGroup({
            userId: new FormControl(a.userId, { nonNullable: true }),
            role: new FormControl<TaskAssigneeRole | null>(a.role ?? null),
          }),
        ),
      );
      t.checklist?.forEach((c) =>
        this.checklistArray.push(
          new FormGroup({
            title: new FormControl(c.title, { nonNullable: true }),
            completed: new FormControl(c.completed, { nonNullable: true }),
          }),
        ),
      );
    } else {
      const pid = this.projectId() ?? null;
      let defaultStart: Date | null = null;
      let defaultDue: Date | null = null;

      if (pid) {
        const proj = this.projects().find((p) => p.id === pid);
        if (proj) {
          defaultStart = proj.startDate ? new Date(proj.startDate) : null;
          defaultDue = proj.endDate ? new Date(proj.endDate) : null;
        }
      }

      this.form.reset({
        priority: 'medium',
        status: 'not-started',
        projectId: pid,
        startDate: defaultStart,
        dueDate: defaultDue,
      });
    }

    // Apply field restrictions for non-admin users editing an existing task
    this.applyFieldRestrictions();
  }

  /**
   * Non-admin users editing an existing task cannot modify:
   * assignees, start date, end date, dependencies, priority, status, project, milestones.
   * They can freely edit: title, description, linked files, checklist, labels.
   * Admins can edit all fields. New tasks have no restrictions.
   */
  private applyFieldRestrictions(): void {
    const restrictedControls = [
      this.form.controls.assigneeId,
      this.form.controls.startDate,
      this.form.controls.dueDate,
      this.form.controls.priority,
      this.form.controls.status,
      this.form.controls.projectId,
      this.form.controls.isRecurring,
      this.form.controls.milestoneAchieved,
      this.form.controls.currentMilestone,
      this.form.controls.nextMilestone,
      this.form.controls.delayRisk,
    ];

    if (this.task() && !this.isAdmin()) {
      // Non-admin editing existing task: disable restricted fields
      for (const c of restrictedControls) {
        c.disable();
      }
      this.dependingTaskControl.disable();
    } else {
      // Admin or new task: enable all fields
      for (const c of restrictedControls) {
        c.enable();
      }
      this.dependingTaskControl.enable();
    }
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
