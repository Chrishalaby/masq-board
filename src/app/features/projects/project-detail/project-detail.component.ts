import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';
import { Project, ProjectMember, ProjectStatus } from '../../../models/project.model';
import { Task } from '../../../models/task.model';
import { User } from '../../../models/user.model';
import { DynamicsJob, DynamicsService } from '../../../services/dynamics.service';
import { ProjectService } from '../../../services/project.service';
import { TaskService } from '../../../services/task.service';
import { ContextMenuComponent } from '../../../shared/context-menu/context-menu.component';
import { TaskBoardComponent } from '../../tasks/task-board/task-board.component';
import { TaskEditorComponent } from '../../tasks/task-editor/task-editor.component';
import { TaskGridComponent } from '../../tasks/task-grid/task-grid.component';

@Component({
  selector: 'app-project-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    RouterLink,
    Button,
    Tag,
    DatePipe,
    FormsModule,
    SelectButton,
    TaskBoardComponent,
    TaskGridComponent,
    TaskEditorComponent,
    ContextMenuComponent,
    Tooltip,
    Dialog,
    DatePicker,
    InputNumber,
    Select,
    Toast,
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
          </div>
          <div class="flex items-center gap-2">
            <p-button
              [label]="p.isHot ? 'Unmark Hot' : 'Mark Hot'"
              [severity]="p.isHot ? 'danger' : 'secondary'"
              [outlined]="true"
              size="small"
              (onClick)="onToggleHot()"
            />
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
        <div class="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
            <button
              class="text-blue-600 hover:underline dark:text-blue-400"
              (click)="loadAttendance()"
            >
              <i class="pi pi-users mr-1"></i>Attendance
            </button>
          }
        </div>
        @if (p.members?.length) {
          <div class="mt-2 flex flex-wrap gap-2">
            @for (m of p.members; track m.id) {
              <span
                class="cursor-pointer rounded-full bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                [pTooltip]="'Right-click to call ' + (m.user?.displayName ?? m.userId)"
                tooltipPosition="top"
                (contextmenu)="onMemberRightClick($event, m)"
              >
                {{ m.user?.displayName ?? m.userId }} — {{ m.role }}
              </span>
            }
          </div>
        }

        <!-- Attendance Panel -->
        @if (attendanceVisible() && attendanceData().length) {
          <div class="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <h3 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <i class="pi pi-users mr-1"></i>Kickoff Attendance
            </h3>
            <div class="flex flex-wrap gap-2">
              @for (a of attendanceData(); track a.email) {
                <span
                  class="rounded-full px-2 py-1 text-xs"
                  [class]="a.attended
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'"
                >
                  {{ a.attended ? '✓' : '✗' }} {{ a.displayName || a.email }}
                </span>
              }
            </div>
          </div>
        }
      </header>

      @switch (activeView()) {
        @case ('board') {
          <app-task-board (taskClick)="openEditTask($event)" />
        }
        @case ('grid') {
          <app-task-grid (taskClick)="openEditTask($event)" />
        }
      }

      <app-task-editor
        [task]="selectedTask()"
        [visible]="editorVisible()"
        [projectId]="p.id"
        (visibleChange)="editorVisible.set($event)"
        (saved)="onTaskSaved()"
      />

      <app-context-menu (viewDetails)="openEditTask($event)" />

      <!-- Book Kickoff Dialog -->
      <p-dialog
        header="Book Kickoff Meeting"
        [(visible)]="kickoffDialogVisible"
        [modal]="true"
        [style]="{ width: '28rem' }"
      >
        <div class="flex flex-col gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium" for="kickoffTime">Meeting Date & Time</label>
            <p-datepicker
              [(ngModel)]="kickoffDate"
              [showTime]="true"
              [hourFormat]="'24'"
              dateFormat="yy-mm-dd"
              inputId="kickoffTime"
              class="w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium" for="kickoffDuration">Duration (minutes)</label>
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
        [style]="{ width: '32rem' }"
      >
        <div class="flex flex-col gap-4">
          @if (dynamicsService.loading()) {
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <i class="pi pi-spinner pi-spin"></i> Loading jobs from Business Central...
            </div>
          } @else {
            <div>
              <label class="mb-1 block text-sm font-medium" for="bcJob">Select BC Job</label>
              <p-select
                [options]="dynamicsJobOptions()"
                [(ngModel)]="selectedDynamicsNo"
                optionLabel="label"
                optionValue="value"
                placeholder="Choose a job..."
                [filter]="true"
                filterBy="label"
                inputId="bcJob"
                class="w-full"
              />
            </div>
            @if (selectedDynamicsNo()) {
              <p class="text-xs text-gray-500 dark:text-gray-400">
                This will sync client info, dates, and budget from the BC job into the project.
              </p>
            }
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
    }
  `,
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);
  private readonly messageService = inject(MessageService);
  readonly dynamicsService = inject(DynamicsService);

  readonly project = signal<Project | null>(null);
  readonly activeView = signal<'board' | 'grid'>('board');
  readonly editorVisible = signal(false);
  readonly selectedTask = signal<Task | null>(null);
  readonly contextMenu = viewChild(ContextMenuComponent);

  // Kickoff
  readonly kickoffDialogVisible = signal(false);
  readonly kickoffLoading = signal(false);
  kickoffDate = new Date();
  kickoffDuration = 60;

  // Attendance
  readonly attendanceVisible = signal(false);
  readonly attendanceData = signal<
    { email: string; displayName: string; attended: boolean; duration: number }[]
  >([]);

  // Dynamics link
  readonly dynamicsDialogVisible = signal(false);
  readonly dynamicsLinkLoading = signal(false);
  readonly selectedDynamicsNo = signal<string>('');
  readonly dynamicsJobOptions = signal<{ label: string; value: string }[]>([]);

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

  onMemberRightClick(event: MouseEvent, member: ProjectMember): void {
    if (!member.user) return;
    event.preventDefault();
    const user = member.user as User;
    this.contextMenu()?.openForUser(user, event.target as HTMLElement, event);
  }

  // --- Kickoff ---

  onBookKickoff(): void {
    const p = this.project();
    if (!p || !this.kickoffDate) return;

    this.kickoffLoading.set(true);
    this.projectService
      .bookKickoff(p.id, this.kickoffDate.toISOString(), this.kickoffDuration)
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
    this.dynamicsService.loadJobs();
    this.selectedDynamicsNo.set('');

    // Build options reactively when jobs load
    const checkJobs = setInterval(() => {
      const jobs = this.dynamicsService.jobs();
      if (jobs.length > 0 || !this.dynamicsService.loading()) {
        clearInterval(checkJobs);
        this.dynamicsJobOptions.set(
          jobs.map((j: DynamicsJob) => ({
            label: `${j.No} — ${j.Description}`,
            value: j.No,
          })),
        );
      }
    }, 200);

    this.dynamicsDialogVisible.set(true);
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
}
