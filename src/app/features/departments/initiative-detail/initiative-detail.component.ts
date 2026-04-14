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
import { TaskEditorComponent } from '../../tasks/task-editor/task-editor.component';
import { TaskGridComponent } from '../../tasks/task-grid/task-grid.component';

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
    CpmChartComponent,
    CallPopoverComponent,
  ],
  template: `
    <p-toast />

    @if (initiative(); as ini) {
      <header class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <div class="mb-3 flex items-center gap-2">
          <a
            routerLink="/departments"
            class="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >← Department Management</a
          >
        </div>
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ ini.name }}</h1>
          <div class="flex items-center gap-2">
            @if (isAdmin()) {
              <p-button
                label="Manage Access"
                icon="pi pi-lock"
                severity="secondary"
                [outlined]="true"
                size="small"
                (onClick)="openExclusionsDialog()"
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

      <app-call-popover />
    }

    <!-- Manage Access Exclusions Dialog -->
    <p-dialog
      header="Manage Initiative Access"
      [visible]="exclusionsDialogVisible()"
      (visibleChange)="exclusionsDialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-4 pt-2">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Select department members to <strong>exclude</strong> from accessing this initiative.
        </p>
        <p-multiselect
          [options]="departmentUsers()"
          optionLabel="displayName"
          optionValue="id"
          placeholder="Select users to exclude"
          [filter]="true"
          filterBy="displayName"
          display="chip"
          [formControl]="excludedUserIdsControl"
          appendTo="body"
          [style]="{ width: '100%' }"
        />
      </div>
      <ng-template #footer>
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="exclusionsDialogVisible.set(false)"
        />
        <p-button label="Save" [loading]="exclusionsSaving()" (onClick)="onSaveExclusions()" />
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
  readonly callPopover = viewChild(CallPopoverComponent);

  // Access exclusions
  readonly exclusionsDialogVisible = signal(false);
  readonly exclusionsSaving = signal(false);
  readonly departmentUsers = this.userService.users;
  readonly excludedUserIdsControl = new FormControl<string[]>([], { nonNullable: true });
  readonly isAdmin = computed(() => this.userService.currentUser()?.isAdmin === true);

  readonly viewOptions = [
    { label: 'Board', value: 'board' },
    { label: 'Table', value: 'grid' },
  ];

  private readonly INTERDEPARTMENTAL_ID = environment.interdepartmentalDepartmentId;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.initiativeService.getInitiative(id).subscribe({
      next: (ini) => {
        this.initiative.set(ini);
        // Interdepartmental dept: load all users; otherwise filter to department
        if (ini.departmentId === this.INTERDEPARTMENTAL_ID) {
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

  openExclusionsDialog(): void {
    const ini = this.initiative();
    if (!ini) return;
    const currentExcluded = ini.exclusions?.map((e) => e.userId) ?? [];
    this.excludedUserIdsControl.setValue(currentExcluded);
    this.exclusionsDialogVisible.set(true);
  }

  onSaveExclusions(): void {
    const ini = this.initiative();
    if (!ini) return;
    this.exclusionsSaving.set(true);
    this.initiativeService
      .setExclusions(ini.id, this.excludedUserIdsControl.value)
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          this.initiative.set(updated);
          this.exclusionsSaving.set(false);
          this.exclusionsDialogVisible.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Access updated',
          });
        },
        error: () => {
          this.exclusionsSaving.set(false);
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

  onTaskSaved(): void {
    this.selectedTask.set(null);
    const id = this.route.snapshot.paramMap.get('id')!;
    this.taskService.loadTasks({ initiativeId: id });
  }

  onAssigneeClick(data: { user: User; event: MouseEvent }): void {
    this.callPopover()?.show(data.user, data.event);
  }
}
