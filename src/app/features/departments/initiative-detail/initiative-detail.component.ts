import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { MultiSelect } from 'primeng/multiselect';
import { SelectButton } from 'primeng/selectbutton';
import { Toast } from 'primeng/toast';
import { take } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Initiative } from '../../../models/initiative.model';
import { Task } from '../../../models/task.model';
import { User } from '../../../models/user.model';
import { InitiativeService } from '../../../services/initiative.service';
import { TaskService } from '../../../services/task.service';
import { UserService } from '../../../services/user.service';
import { CallPopoverComponent } from '../../../shared/call-popover/call-popover.component';
import { CpmChartComponent } from '../../projects/cpm-chart/cpm-chart.component';
import { TaskBoardComponent } from '../../tasks/task-board/task-board.component';
import { TaskDetailViewComponent } from '../../tasks/task-detail-view/task-detail-view.component';
import { TaskEditorComponent } from '../../tasks/task-editor/task-editor.component';
import { TaskGridComponent } from '../../tasks/task-grid/task-grid.component';
import { TaskLinksDialogComponent } from '../../tasks/task-links-dialog/task-links-dialog.component';

@Component({
  selector: 'app-initiative-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    Button,
    Dialog,
    MultiSelect,
    SelectButton,
    Toast,
    TaskBoardComponent,
    TaskGridComponent,
    TaskEditorComponent,
    TaskDetailViewComponent,
    TaskLinksDialogComponent,
    CpmChartComponent,
    CallPopoverComponent,
  ],
  template: `
    <p-toast />

    @if (initiative(); as ini) {
      <header class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <div class="mb-3 flex items-center gap-2">
          <a
            [routerLink]="['/departments', initiative()?.departmentId]"
            class="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >← {{ initiative()?.department?.name || 'Department Management' }}</a
          >
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ ini.name }}</h1>
            @if (hasCriticalOnHold()) {
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700 dark:bg-red-900 dark:text-red-300"
                role="alert"
              >
                <i class="pi pi-exclamation-circle"></i> Critical Task On Hold — Initiative Blocked
              </span>
            }
          </div>
          <div class="flex items-center gap-2">
            @if (isAdmin()) {
              <p-button
                label="Manage Access"
                icon="pi pi-lock"
                severity="secondary"
                [outlined]="true"
                size="small"
                (onClick)="openInclusionsDialog()"
              />
            }
            <p-selectbutton
              [options]="viewOptions"
              [(ngModel)]="activeView"
              optionLabel="label"
              optionValue="value"
              [allowEmpty]="false"
            />
            <p-button label="New Task" icon="pi pi-plus" size="small" (onClick)="openNewTask()" />
          </div>
        </div>
        @if (ini.description) {
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ ini.description }}</p>
        }
        @if (ini.sharepointFolderLink) {
          <a
            [href]="ini.sharepointFolderLink"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            <i class="pi pi-folder-open"></i>
            Open SharePoint Folder
          </a>
        }
      </header>

      @switch (activeView()) {
        @case ('board') {
          <app-task-board
            (taskClick)="openEditTask($event)"
            (setupClick)="openSetupView($event)"
            (linksClick)="openLinksDialog($event)"
            (assigneeClick)="onAssigneeClick($event)"
          />
        }
        @case ('grid') {
          <app-task-grid
            (taskClick)="openEditTask($event)"
            (assigneeClick)="onAssigneeClick($event)"
          />
        }
      }

      <app-cpm-chart [tasks]="initiativeTasks()" />

      <app-task-editor
        [task]="selectedTask()"
        [visible]="editorVisible()"
        [initiativeId]="ini.id"
        [departmentId]="ini.departmentId"
        (visibleChange)="editorVisible.set($event)"
        (saved)="onTaskSaved()"
      />

      <app-task-detail-view
        [task]="detailTask()"
        [visible]="detailVisible()"
        (visibleChange)="detailVisible.set($event)"
      />

      <app-task-links-dialog
        [task]="linksTask()"
        [visible]="linksVisible()"
        (visibleChange)="linksVisible.set($event)"
        (linkAdded)="onTaskSaved()"
      />

      <app-call-popover />
    }

    <!-- Manage Access Inclusions Dialog -->
    <p-dialog
      header="Manage Initiative Access"
      [visible]="inclusionsDialogVisible()"
      (visibleChange)="inclusionsDialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-4 pt-2">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Select department members to <strong>include</strong> in this initiative. Leaving the list
          empty gives all department members access.
        </p>
        <p-multiselect
          [options]="departmentUsers()"
          optionLabel="displayName"
          optionValue="id"
          placeholder="Select users to include"
          [filter]="true"
          filterBy="displayName"
          display="chip"
          [formControl]="includedUserIdsControl"
          appendTo="body"
          [style]="{ width: '100%' }"
        />
      </div>
      <ng-template #footer>
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="inclusionsDialogVisible.set(false)"
        />
        <p-button label="Save" [loading]="inclusionsSaving()" (onClick)="onSaveInclusions()" />
      </ng-template>
    </p-dialog>
  `,
})
export class InitiativeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly initiativeService = inject(InitiativeService);
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);

  readonly initiative = signal<Initiative | null>(null);
  readonly initiativeTasks = this.taskService.tasks;
  readonly activeView = signal<'board' | 'grid'>('board');
  readonly editorVisible = signal(false);
  readonly selectedTask = signal<Task | null>(null);
  readonly detailVisible = signal(false);
  readonly detailTask = signal<Task | null>(null);
  readonly linksVisible = signal(false);
  readonly linksTask = signal<Task | null>(null);
  readonly callPopover = viewChild(CallPopoverComponent);

  // Access inclusions
  readonly inclusionsDialogVisible = signal(false);
  readonly inclusionsSaving = signal(false);
  readonly departmentUsers = this.userService.users;
  readonly includedUserIdsControl = new FormControl<string[]>([], { nonNullable: true });
  readonly isAdmin = computed(() => this.userService.currentUser()?.isAdmin === true);

  readonly hasCriticalOnHold = computed(() =>
    this.initiativeTasks().some((t) => t.isCritical && t.status === 'on-hold'),
  );

  readonly viewOptions = [
    { label: 'Board', value: 'board' },
    { label: 'Table', value: 'grid' },
  ];

  private readonly INTERDEPARTMENTAL_ID = environment.interdepartmentalDepartmentId;
  private readonly CEO_OFFICE_ID = environment.ceoOfficeDepartmentId;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.initiativeService.getInitiative(id).subscribe({
      next: (ini) => {
        this.initiative.set(ini);
        // Interdepartmental & CEO Office: load all users; otherwise filter to department
        if (
          ini.departmentId === this.INTERDEPARTMENTAL_ID ||
          ini.departmentId === this.CEO_OFFICE_ID
        ) {
          this.userService.loadUsers();
        } else {
          this.userService.loadUsers(ini.departmentId);
        }
      },
    });
    this.taskService.loadTasks({ initiativeId: id });
    this.userService.loadUsers();
    this.userService.loadCurrentUser();
  }

  openInclusionsDialog(): void {
    const ini = this.initiative();
    if (!ini) return;
    const currentIncluded = ini.inclusions?.map((e) => e.userId) ?? [];
    this.includedUserIdsControl.setValue(currentIncluded);
    this.inclusionsDialogVisible.set(true);
  }

  onSaveInclusions(): void {
    const ini = this.initiative();
    if (!ini) return;
    this.inclusionsSaving.set(true);
    this.initiativeService
      .setInclusions(ini.id, this.includedUserIdsControl.value)
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          this.initiative.set(updated);
          this.inclusionsSaving.set(false);
          this.inclusionsDialogVisible.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Access updated',
          });
        },
        error: () => {
          this.inclusionsSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not update access restrictions',
          });
        },
      });
  }

  openNewTask(): void {
    this.selectedTask.set(null);
    this.editorVisible.set(true);
  }

  openEditTask(task: Task): void {
    this.selectedTask.set(task);
    this.editorVisible.set(true);
  }

  openSetupView(task: Task): void {
    this.detailTask.set(task);
    this.detailVisible.set(true);
  }

  openLinksDialog(task: Task): void {
    this.linksTask.set(task);
    this.linksVisible.set(true);
  }

  onTaskSaved(): void {
    this.selectedTask.set(null);
    const id = this.route.snapshot.paramMap.get('id')!;
    this.taskService.loadTasks({ initiativeId: id });
  }

  onAssigneeClick(data: { user: User; event: MouseEvent }): void {
    this.callPopover()?.show(data.user, data.event);
  }
}
