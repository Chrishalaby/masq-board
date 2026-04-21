import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { SelectButton } from 'primeng/selectbutton';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { Project, ProjectMember, ProjectStatus } from '../../../models/project.model';
import { Task } from '../../../models/task.model';
import { User } from '../../../models/user.model';
import { ProjectService } from '../../../services/project.service';
import { TaskService } from '../../../services/task.service';
import { UserService } from '../../../services/user.service';
import { CallPopoverComponent } from '../../../shared/call-popover/call-popover.component';
import { TaskBoardComponent } from '../../tasks/task-board/task-board.component';
import { TaskEditorComponent } from '../../tasks/task-editor/task-editor.component';
import { TaskGridComponent } from '../../tasks/task-grid/task-grid.component';
import { CpmChartComponent } from '../cpm-chart/cpm-chart.component';

@Component({
  selector: 'app-project-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    RouterLink,
    Button,
    Tag,
    DatePipe,
    DecimalPipe,
    FormsModule,
    SelectButton,
    TaskBoardComponent,
    TaskGridComponent,
    TaskEditorComponent,
    CallPopoverComponent,
    CpmChartComponent,
    Tooltip,
    Dialog,
    DatePicker,
    InputNumber,
    InputText,
    Toast,
    AutoComplete,
    ToggleSwitch,
  ],
  template: `
    <p-toast />
    @if (project(); as p) {
      <header class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <div class="mb-3 flex items-center gap-2">
          <a routerLink="/projects" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >← Projects</a
          >
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ p.name }}</h1>
            @if (p.isHot) {
              <span title="Hot project">🔥</span>
            }
            <p-tag [value]="p.status" [severity]="statusSeverity(p.status)" [rounded]="true" />
            @if (hasCriticalOnHold()) {
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700 dark:bg-red-900 dark:text-red-300"
                role="alert"
              >
                <i class="pi pi-exclamation-circle"></i> Critical Task On Hold — Project Blocked
              </span>
            }
          </div>
          <div class="flex items-center gap-2">
            <!-- <p-button
              [label]="p.isHot ? 'Unmark Hot' : 'Mark Hot'"
              [severity]="p.isHot ? 'danger' : 'secondary'"
              [outlined]="true"
              size="small"
              (onClick)="onToggleHot()"
            /> -->
            @if (!p.kickoffMeetingUrl) {
              <p-button
                label="Book Kickoff"
                icon="pi pi-video"
                severity="help"
                [outlined]="true"
                size="small"
                (onClick)="kickoffDialogVisible.set(true)"
              />
            }
            @if (!p.dynamicsNo) {
              <p-button
                label="Link to BC"
                icon="pi pi-link"
                severity="secondary"
                [outlined]="true"
                size="small"
                (onClick)="openLinkDynamics()"
              />
            } @else if (!p.procurementTeam || !p.projectAccountant) {
              <p-button
                label="Sync from BC"
                icon="pi pi-sync"
                severity="secondary"
                [outlined]="true"
                size="small"
                [loading]="dynamicsLinkLoading()"
                (onClick)="onSyncFromBC()"
              />
            }
            @if (!p.sharepointFolderLink) {
              <p-button
                label="Create SP Folder"
                icon="pi pi-folder"
                severity="secondary"
                [outlined]="true"
                size="small"
                [loading]="spFolderLoading()"
                (onClick)="createSharepointFolder()"
              />
            }
            @if (isAdmin()) {
              <p-button
                label="Delete Project"
                icon="pi pi-trash"
                severity="danger"
                [outlined]="true"
                size="small"
                (onClick)="confirmDeleteVisible.set(true)"
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
        @if (p.description) {
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ p.description }}</p>
        }
        <div
          class="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400"
        >
          @if (p.startDate) {
            <span>Start: {{ p.startDate | date: 'mediumDate' }}</span>
          }
          @if (p.endDate) {
            <span>End: {{ p.endDate | date: 'mediumDate' }}</span>
          }
          @if (p.members?.length) {
            <span>{{ p.members!.length }} members</span>
          }
          @if (p.dynamicsNo) {
            <span class="text-purple-600 dark:text-purple-400">BC: {{ p.dynamicsNo }}</span>
          }
          @if (p.clientName) {
            <span>Client: {{ p.clientName }}</span>
          }
          @if (p.kickoffMeetingUrl) {
            <a
              [href]="p.kickoffMeetingUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline dark:text-blue-400"
            >
              <i class="pi pi-video mr-1"></i>Join Kickoff
            </a>
            @if (p.kickoffStartTime) {
              <span class="text-xs text-gray-400 dark:text-gray-500">
                {{ p.kickoffStartTime | date: 'MMM d, y h:mm a' }}
              </span>
            }
            <button
              class="text-blue-600 hover:underline dark:text-blue-400"
              (click)="loadAttendance()"
            >
              <i class="pi pi-users mr-1"></i>Attendance
            </button>
          }
          @if (p.projectAccountant) {
            <span><i class="pi pi-calculator mr-1"></i>Accountant: {{ p.projectAccountant }}</span>
          }
          @if (p.procurementTeam) {
            <span><i class="pi pi-truck mr-1"></i>Procurement: {{ p.procurementTeam }}</span>
          }
          @if (p.branch) {
            <span><i class="pi pi-map-marker mr-1"></i>Branch: {{ p.branch }}</span>
          }
        </div>
        @if (p.members?.length) {
          <div class="mt-2 flex flex-wrap gap-2">
            @for (m of p.members; track m.id) {
              <span
                class="cursor-pointer rounded-full bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                [pTooltip]="'Click to call ' + (m.user?.displayName ?? m.userId)"
                tooltipPosition="top"
                (click)="onMemberClick($event, m)"
              >
                {{ m.user?.displayName ?? m.userId }} — {{ m.role }}
              </span>
            }
          </div>
        }

        <!-- Attendance Panel -->
        @if (attendanceVisible()) {
          <div
            class="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <h3 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <i class="pi pi-users mr-1"></i>Kickoff Attendance
            </h3>
            @if (attendanceData().length) {
              <div class="flex flex-wrap gap-2">
                @for (a of attendanceData(); track a.email) {
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    [class]="
                      a.attended
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    "
                  >
                    {{ a.attended ? '✓' : '✗' }} {{ a.displayName || a.email }}
                  </span>
                }
              </div>
            } @else {
              <p class="text-xs text-gray-400 dark:text-gray-500">
                No responses yet. Attendees will appear here once they accept or decline the
                invitation.
              </p>
            }
          </div>
        }

        <!-- Project Info Panel -->
        @if (hasProjectInfo(p)) {
          <div
            class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800 sm:grid-cols-3"
          >
            @if (p.apolloProjectId) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">Apollo ID</span>
                <p class="text-gray-900 dark:text-gray-100">{{ p.apolloProjectId }}</p>
              </div>
            }
            @if (p.dynamicsNo) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">Dynamics No</span>
                <p class="text-purple-600 dark:text-purple-400">{{ p.dynamicsNo }}</p>
              </div>
            }
            @if (p.clientName) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">Client</span>
                <p class="text-gray-900 dark:text-gray-100">
                  {{ p.clientName }}
                  @if (p.clientId) {
                    <span class="text-xs text-gray-400"> ({{ p.clientId }})</span>
                  }
                </p>
              </div>
            }
            @if (p.contactName) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">Contact</span>
                <p class="text-gray-900 dark:text-gray-100">
                  {{ p.contactName }}
                  @if (p.contactId) {
                    <span class="text-xs text-gray-400"> ({{ p.contactId }})</span>
                  }
                </p>
              </div>
            }
            @if (p.projectManager) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">Project Manager</span>
                <p class="text-gray-900 dark:text-gray-100">{{ p.projectManager }}</p>
                @if (p.projectManagerProfessionalEmail) {
                  <p class="text-xs text-blue-600 dark:text-blue-400">
                    {{ p.projectManagerProfessionalEmail }}
                  </p>
                }
              </div>
            }
            @if (p.salesman) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">Salesman</span>
                <p class="text-gray-900 dark:text-gray-100">{{ p.salesman }}</p>
                @if (p.salesmanProfessionalEmail) {
                  <p class="text-xs text-blue-600 dark:text-blue-400">
                    {{ p.salesmanProfessionalEmail }}
                  </p>
                }
              </div>
            }
            @if (p.developer) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">Developer</span>
                <p class="text-gray-900 dark:text-gray-100">{{ p.developer }}</p>
                @if (p.developerProfessionalEmail) {
                  <p class="text-xs text-blue-600 dark:text-blue-400">
                    {{ p.developerProfessionalEmail }}
                  </p>
                }
              </div>
            }
            @if (p.procurementTeam) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">Procurement Team</span>
                <p class="text-gray-900 dark:text-gray-100">{{ p.procurementTeam }}</p>
              </div>
            }
            @if (p.projectAccountant) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">Project Accountant</span>
                <p class="text-gray-900 dark:text-gray-100">{{ p.projectAccountant }}</p>
              </div>
            }
            @if (p.totalTypesNumber) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">Total Types</span>
                <p class="text-gray-900 dark:text-gray-100">{{ p.totalTypesNumber }}</p>
              </div>
            }
            @if (p.budgetAmount) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">Budget</span>
                <p class="text-gray-900 dark:text-gray-100">
                  {{ p.budgetAmount | number: '1.2-2' }} {{ p.currency ?? '' }}
                </p>
              </div>
            }
            @if (p.sharepointFolderLink) {
              <div>
                <span class="font-medium text-gray-500 dark:text-gray-400">SharePoint</span>
                <p>
                  <a
                    [href]="p.sharepointFolderLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <i class="pi pi-folder-open mr-1"></i>Open Folder
                  </a>
                </p>
              </div>
            }
          </div>
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

      <app-cpm-chart [tasks]="projectTasks()" />

      <app-task-editor
        [task]="selectedTask()"
        [visible]="editorVisible()"
        [projectId]="p.id"
        (visibleChange)="editorVisible.set($event)"
        (saved)="onTaskSaved()"
      />

      <app-call-popover />

      <!-- Book Kickoff Dialog -->
      <p-dialog
        header="Book Kickoff Meeting"
        [(visible)]="kickoffDialogVisible"
        [modal]="true"
        [style]="{ width: '28rem' }"
      >
        <div class="flex flex-col gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium" for="kickoffTime"
              >Meeting Date & Time</label
            >
            <p-datepicker
              [(ngModel)]="kickoffDate"
              [showTime]="true"
              [hourFormat]="'24'"
              [minDate]="today"
              dateFormat="yy-mm-dd"
              inputId="kickoffTime"
              appendTo="body"
              class="w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium" for="kickoffDuration"
              >Duration (minutes)</label
            >
            <p-inputnumber
              [(ngModel)]="kickoffDuration"
              [min]="15"
              [max]="480"
              [step]="15"
              inputId="kickoffDuration"
              class="w-full"
            />
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            All project members will be invited. Core team is added automatically.
          </p>
          <div class="flex items-center gap-2">
            <p-toggleSwitch [(ngModel)]="includeMyself" inputId="includeMyself" />
            <label for="includeMyself" class="text-sm">Include myself</label>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium" for="extraAttendees"
              >Additional Attendees</label
            >
            <p-autoComplete
              [(ngModel)]="extraAttendees"
              [suggestions]="attendeeSuggestions"
              [multiple]="true"
              [typeahead]="false"
              [dropdown]="true"
              [addOnBlur]="true"
              [addOnTab]="true"
              [unique]="true"
              separator=","
              placeholder="Type an email and press Enter, or pick from dropdown"
              inputId="extraAttendees"
              appendTo="body"
              [fluid]="true"
              (completeMethod)="searchAttendees($event)"
            />
          </div>
        </div>
        <ng-template #footer>
          <p-button
            label="Cancel"
            severity="secondary"
            [text]="true"
            (onClick)="kickoffDialogVisible.set(false)"
          />
          <p-button
            label="Book Meeting"
            icon="pi pi-video"
            [loading]="kickoffLoading()"
            (onClick)="onBookKickoff()"
          />
        </ng-template>
      </p-dialog>

      <!-- Link to Dynamics Dialog -->
      <p-dialog
        header="Link to Dynamics BC Job"
        [(visible)]="dynamicsDialogVisible"
        [modal]="true"
        [style]="{ width: '28rem' }"
      >
        <div class="flex flex-col gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium" for="bcJobNo">Dynamics Job No *</label>
            <input
              pInputText
              id="bcJobNo"
              [ngModel]="selectedDynamicsNo()"
              (ngModelChange)="selectedDynamicsNo.set($event)"
              placeholder="Enter BC Job No (e.g. J00123)"
              class="w-full"
            />
          </div>
          @if (selectedDynamicsNo()) {
            <p class="text-xs text-gray-500 dark:text-gray-400">
              This will query Business Central for the job and sync Person Responsible and Project
              Accountant.
            </p>
          }
        </div>
        <ng-template #footer>
          <p-button
            label="Cancel"
            severity="secondary"
            [text]="true"
            (onClick)="dynamicsDialogVisible.set(false)"
          />
          <p-button
            label="Link & Sync"
            icon="pi pi-link"
            [loading]="dynamicsLinkLoading()"
            [disabled]="!selectedDynamicsNo()"
            (onClick)="onLinkDynamics()"
          />
        </ng-template>
      </p-dialog>

      <!-- Delete Confirmation Dialog -->
      <p-dialog
        header="Delete Project"
        [(visible)]="confirmDeleteVisible"
        [modal]="true"
        [style]="{ width: '24rem' }"
      >
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Are you sure you want to delete this project? This action cannot be undone.
        </p>
        <ng-template #footer>
          <p-button
            label="Cancel"
            severity="secondary"
            [text]="true"
            (onClick)="confirmDeleteVisible.set(false)"
          />
          <p-button
            label="Delete"
            severity="danger"
            icon="pi pi-trash"
            [loading]="deleteLoading()"
            (onClick)="onDeleteProject()"
          />
        </ng-template>
      </p-dialog>
    }
  `,
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);
  private readonly messageService = inject(MessageService);
  private readonly userService = inject(UserService);

  readonly project = signal<Project | null>(null);
  readonly projectTasks = this.taskService.tasks;
  readonly activeView = signal<'board' | 'grid'>('board');
  readonly editorVisible = signal(false);
  readonly selectedTask = signal<Task | null>(null);
  readonly callPopover = viewChild(CallPopoverComponent);

  // Delete
  readonly confirmDeleteVisible = signal(false);
  readonly deleteLoading = signal(false);
  readonly isAdmin = computed(() => this.userService.currentUser()?.isAdmin === true);

  readonly hasCriticalOnHold = computed(() =>
    this.projectTasks().some((t) => t.isCritical && t.status === 'on-hold'),
  );

  // Kickoff
  readonly kickoffDialogVisible = signal(false);
  readonly kickoffLoading = signal(false);
  kickoffDate = new Date();
  kickoffDuration = 60;
  extraAttendees: string[] = [];
  attendeeSuggestions: string[] = [];
  includeMyself = true;
  readonly today = new Date();

  // Attendance
  readonly attendanceVisible = signal(false);
  readonly attendanceData = signal<
    { email: string; displayName: string; attended: boolean; duration: number }[]
  >([]);

  // Dynamics link
  readonly dynamicsDialogVisible = signal(false);
  readonly dynamicsLinkLoading = signal(false);
  readonly selectedDynamicsNo = signal<string>('');

  // SharePoint folder
  readonly spFolderLoading = signal(false);

  readonly viewOptions = [
    { label: 'Board', value: 'board' },
    { label: 'Table', value: 'grid' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.projectService.getProject(id).subscribe({
      next: (p) => this.project.set(p),
    });
    this.taskService.loadTasks({ projectId: id });
    this.userService.loadCurrentUser();
  }

  onDeleteProject(): void {
    const p = this.project();
    if (!p) return;
    this.deleteLoading.set(true);
    this.projectService.deleteProject(p.id).subscribe({
      next: () => {
        this.deleteLoading.set(false);
        this.confirmDeleteVisible.set(false);
        this.router.navigate(['/projects']);
      },
      error: (err) => {
        this.deleteLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: err.error?.message || 'Could not delete project',
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
    this.taskService.loadTasks({ projectId: id });
  }

  onToggleHot(): void {
    const p = this.project();
    if (p) {
      this.projectService.toggleHot(p.id);
      this.project.set({ ...p, isHot: !p.isHot });
    }
  }

  statusSeverity(s: ProjectStatus): 'danger' | 'warn' | 'info' | 'success' | 'secondary' {
    const map: Record<ProjectStatus, 'danger' | 'warn' | 'info' | 'success' | 'secondary'> = {
      draft: 'secondary',
      active: 'info',
      'on-hold': 'warn',
      completed: 'success',
      archived: 'danger',
    };
    return map[s];
  }

  onMemberClick(event: MouseEvent, member: ProjectMember): void {
    if (!member.user) return;
    const user = member.user as User;
    this.callPopover()?.show(user, event);
  }

  onAssigneeClick(data: { user: User; event: MouseEvent }): void {
    this.callPopover()?.show(data.user, data.event);
  }

  // --- Kickoff ---

  searchAttendees(event: AutoCompleteCompleteEvent): void {
    const query = event.query.toLowerCase();
    const members = this.project()?.members ?? [];
    const memberEmails = members.map((m) => m.user?.email).filter((e): e is string => !!e);
    this.attendeeSuggestions = memberEmails.filter(
      (email) => email.toLowerCase().includes(query) && !this.extraAttendees.includes(email),
    );
  }

  onBookKickoff(): void {
    const p = this.project();
    if (!p || !this.kickoffDate) return;

    const bookerEmail = this.includeMyself ? this.userService.currentUser()?.email : undefined;

    this.kickoffLoading.set(true);
    this.projectService
      .bookKickoff(
        p.id,
        this.kickoffDate.toISOString(),
        this.kickoffDuration,
        this.extraAttendees.length ? this.extraAttendees : undefined,
        bookerEmail ?? undefined,
      )
      .subscribe({
        next: (updated) => {
          this.project.set({ ...p, ...updated });
          this.kickoffDialogVisible.set(false);
          this.kickoffLoading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Kickoff Booked',
            detail: 'Teams meeting created and linked to this project',
          });
        },
        error: (err) => {
          this.kickoffLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Booking Failed',
            detail: err.error?.message || 'Could not book kickoff meeting',
          });
        },
      });
  }

  loadAttendance(): void {
    const p = this.project();
    if (!p) return;

    if (this.attendanceVisible()) {
      this.attendanceVisible.set(false);
      return;
    }

    this.projectService.getKickoffAttendance(p.id).subscribe({
      next: (data) => {
        this.attendanceData.set(data.attendance);
        this.attendanceVisible.set(true);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not load attendance data',
        });
      },
    });
  }

  // --- Dynamics Link ---

  openLinkDynamics(): void {
    this.selectedDynamicsNo.set('');
    this.dynamicsDialogVisible.set(true);
  }

  onSyncFromBC(): void {
    const p = this.project();
    if (!p?.dynamicsNo) return;
    this.dynamicsLinkLoading.set(true);
    this.projectService.linkToDynamics(p.id, p.dynamicsNo).subscribe({
      next: (updated) => {
        this.project.set({ ...p, ...updated });
        this.dynamicsLinkLoading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Synced from BC',
          detail: 'Person Responsible and Project Accountant updated',
        });
      },
      error: (err) => {
        this.dynamicsLinkLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Sync Failed',
          detail: err.error?.message || 'Could not sync from BC',
        });
      },
    });
  }

  onLinkDynamics(): void {
    const p = this.project();
    const no = this.selectedDynamicsNo();
    if (!p || !no) return;

    this.dynamicsLinkLoading.set(true);
    this.projectService.linkToDynamics(p.id, no).subscribe({
      next: (updated) => {
        this.project.set({ ...p, ...updated });
        this.dynamicsDialogVisible.set(false);
        this.dynamicsLinkLoading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Linked to BC',
          detail: `Synced data from job ${no}`,
        });
      },
      error: (err) => {
        this.dynamicsLinkLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Link Failed',
          detail: err.error?.message || 'Could not link to Dynamics job',
        });
      },
    });
  }

  createSharepointFolder(): void {
    const p = this.project();
    if (!p) return;
    this.spFolderLoading.set(true);
    this.projectService.createSharepointFolder(p.id).subscribe({
      next: (updated) => {
        this.project.set({ ...p, ...updated });
        this.spFolderLoading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'SharePoint Folder',
          detail: 'Folder created successfully',
        });
      },
      error: (err) => {
        this.spFolderLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'SharePoint Error',
          detail: err.error?.message || 'Could not create SharePoint folder',
        });
      },
    });
  }

  hasProjectInfo(p: Project): boolean {
    return !!(
      p.apolloProjectId ||
      p.projectManager ||
      p.salesman ||
      p.developer ||
      p.procurementTeam ||
      p.projectAccountant ||
      p.totalTypesNumber ||
      p.budgetAmount ||
      p.sharepointFolderLink ||
      p.contactName
    );
  }
}
