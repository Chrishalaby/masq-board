import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Department } from '../../../models/department.model';
import { Initiative } from '../../../models/initiative.model';
import { User } from '../../../models/user.model';
import { DepartmentService } from '../../../services/department.service';
import { InitiativeService } from '../../../services/initiative.service';
import { UserService } from '../../../services/user.service';
import { CallPopoverComponent } from '../../../shared/call-popover/call-popover.component';

@Component({
  selector: 'app-department-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    RouterLink,
    Button,
    Dialog,
    FormsModule,
    InputText,
    Textarea,
    Toast,
    CallPopoverComponent,
  ],
  template: `
    <p-toast />

    <div class="mx-auto max-w-6xl px-6 py-8">
      <div class="mb-4">
        @if (selectedDepartment()) {
          <a
            routerLink="/departments"
            class="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >← All Departments</a
          >
        } @else {
          <a routerLink="/" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >← Home</a
          >
        }
      </div>

      @if (showDepartmentsList()) {
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Departments</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a department to view its initiatives.
          </p>
        </div>

        @if (displayedDepartments().length === 0) {
          <div
            class="rounded-lg border border-dashed border-gray-300 p-12 text-center dark:border-gray-600"
          >
            <i class="pi pi-building text-4xl text-gray-300 dark:text-gray-600"></i>
            <p class="mt-3 text-gray-500 dark:text-gray-400">No departments found.</p>
          </div>
        } @else {
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            @for (dept of displayedDepartments(); track dept.id) {
              <a
                [routerLink]="['/departments', dept.id]"
                class="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500"
              >
                <h3
                  class="text-base font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400"
                >
                  {{ dept.name }}
                </h3>
                @if (dept.description) {
                  <p class="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                    {{ dept.description }}
                  </p>
                }
                @if (dept.sharepointFolderLink) {
                  <span
                    class="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"
                  >
                    <i class="pi pi-folder-open"></i>
                    SharePoint linked
                  </span>
                }
              </a>
            }
          </div>
        }
      }

      @if (!loading() && !selectedDepartment() && !showDepartmentsList()) {
        <div
          class="rounded-lg border border-dashed border-gray-300 p-12 text-center dark:border-gray-600"
        >
          <i class="pi pi-building text-4xl text-gray-300 dark:text-gray-600"></i>
          <p class="mt-3 text-gray-500 dark:text-gray-400">
            You are not assigned to any department yet.
          </p>
          <p class="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Ask an administrator to assign you to a department.
          </p>
        </div>
      }

      @if (selectedDepartment(); as dept) {
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ dept.name }}</h1>
            @if (dept.description) {
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ dept.description }}</p>
            }
            @if (dept.sharepointFolderLink) {
              <a
                [href]="dept.sharepointFolderLink"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                <i class="pi pi-folder-open"></i>
                Open SharePoint Folder
              </a>
            }
          </div>
          <p-button
            label="New Initiative"
            icon="pi pi-plus"
            size="small"
            (onClick)="openNewInitiative()"
          />
        </div>

        <div class="grid gap-6 lg:grid-cols-4">
          <section class="lg:col-span-1">
            <div
              class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <h2
                class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Department Users
              </h2>

              @if (departmentUsers().length === 0) {
                <p class="text-sm text-gray-400 dark:text-gray-500">No users in this department.</p>
              } @else {
                <div class="flex flex-col gap-2">
                  @for (user of departmentUsers(); track user.id) {
                    <div
                      class="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-700"
                    >
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {{ user.displayName }}
                        </p>
                        @if (user.jobTitle) {
                          <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                            {{ user.jobTitle }}
                          </p>
                        }
                      </div>
                      <p-button
                        icon="pi pi-phone"
                        [rounded]="true"
                        [text]="true"
                        severity="success"
                        size="small"
                        ariaLabel="Call user"
                        (onClick)="onDepartmentUserCall(user, $event)"
                      />
                    </div>
                  }
                </div>
              }
            </div>
          </section>

          <section class="lg:col-span-3">
            @if (initiatives().length === 0) {
              <div
                class="rounded-lg border border-dashed border-gray-300 p-12 text-center dark:border-gray-600"
              >
                <i class="pi pi-flag text-4xl text-gray-300 dark:text-gray-600"></i>
                <p class="mt-3 text-gray-500 dark:text-gray-400">No initiatives yet.</p>
                <p class="mt-1 text-sm text-gray-400 dark:text-gray-500">
                  Create the first initiative for this department.
                </p>
                <p-button
                  label="New Initiative"
                  icon="pi pi-plus"
                  class="mt-4"
                  size="small"
                  (onClick)="openNewInitiative()"
                />
              </div>
            } @else {
              <div class="flex flex-col gap-3">
                @for (initiative of initiatives(); track initiative.id) {
                  <a
                    [routerLink]="['/departments/initiatives', initiative.id]"
                    class="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500"
                  >
                    <div class="min-w-0 flex-1">
                      <h3
                        class="text-base font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400"
                      >
                        {{ initiative.name }}
                      </h3>
                      @if (initiative.description) {
                        <p class="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                          {{ initiative.description }}
                        </p>
                      }
                      @if (initiative.sharepointFolderLink) {
                        <a
                          [href]="initiative.sharepointFolderLink"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                          (click)="$event.stopPropagation()"
                        >
                          <i class="pi pi-folder-open"></i>
                          SharePoint Folder
                        </a>
                      }
                    </div>
                    <div class="ml-4 flex shrink-0 items-center gap-2">
                      <p-button
                        icon="pi pi-pencil"
                        severity="secondary"
                        [text]="true"
                        size="small"
                        ariaLabel="Edit initiative"
                        (click)="openEditInitiative(initiative, $event)"
                      />
                      <p-button
                        icon="pi pi-trash"
                        severity="danger"
                        [text]="true"
                        size="small"
                        ariaLabel="Delete initiative"
                        (click)="onDeleteInitiative(initiative, $event)"
                      />
                      <i
                        class="pi pi-chevron-right text-gray-300 group-hover:text-indigo-400 dark:text-gray-600"
                      ></i>
                    </div>
                  </a>
                }
              </div>
            }
          </section>
        </div>
      }
    </div>

    <p-dialog
      [header]="editingInitiative() ? 'Edit Initiative' : 'New Initiative'"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="initName" class="text-sm font-medium">Name *</label>
          <input
            pInputText
            id="initName"
            [(ngModel)]="formName"
            placeholder="Initiative name"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="initDesc" class="text-sm font-medium">Description</label>
          <textarea
            pTextarea
            id="initDesc"
            [(ngModel)]="formDescription"
            placeholder="Optional description"
            rows="3"
            class="w-full"
          ></textarea>
        </div>
      </div>
      <ng-template #footer>
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="dialogVisible.set(false)"
        />
        <p-button
          label="Save"
          [disabled]="!formName.trim()"
          [loading]="saving()"
          (onClick)="onSaveInitiative()"
        />
      </ng-template>
    </p-dialog>

    <app-call-popover />
  `,
})
export class DepartmentManagementComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly departmentService = inject(DepartmentService);
  private readonly initiativeService = inject(InitiativeService);
  private readonly messageService = inject(MessageService);

  private readonly INTERDEPARTMENTAL_ID = environment.interdepartmentalDepartmentId;

  readonly currentUser = this.userService.currentUser;
  readonly isGeneralSupervisor = computed(() => this.currentUser()?.isGeneralSupervisor === true);
  readonly departments = this.departmentService.departments;
  readonly departmentUsers = this.userService.users;
  readonly userDepartments = signal<Department[]>([]);

  readonly loading = signal(true);
  readonly routeDepartmentId = signal<string | null>(null);
  readonly selectedDepartment = signal<Department | null>(null);
  readonly initiatives = this.initiativeService.initiatives;

  readonly dialogVisible = signal(false);
  readonly editingInitiative = signal<Initiative | null>(null);
  readonly saving = signal(false);
  readonly callPopover = viewChild(CallPopoverComponent);

  readonly showDepartmentsList = computed(
    () =>
      !this.routeDepartmentId() &&
      (this.isGeneralSupervisor() ||
        !!this.currentUser()?.departmentId ||
        this.currentUser() !== null),
  );

  readonly displayedDepartments = computed(() =>
    this.isGeneralSupervisor() ? this.departments() : this.userDepartments(),
  );

  formName = '';
  formDescription = '';

  constructor() {
    effect(() => {
      const user = this.currentUser();
      const routeDepartmentId = this.routeDepartmentId();
      if (user === null) {
        this.loading.set(true);
        return;
      }

      this.loading.set(false);

      if (user.isGeneralSupervisor) {
        this.departmentService.loadDepartments();

        if (routeDepartmentId) {
          this.loadDepartmentDetail(routeDepartmentId);
        } else {
          this.selectedDepartment.set(null);
        }
        return;
      }

      if (!user.departmentId) {
        if (routeDepartmentId) {
          if (routeDepartmentId !== this.INTERDEPARTMENTAL_ID) {
            this.router.navigate(['/departments']);
            return;
          }
          this.loadDepartmentDetail(routeDepartmentId);
          return;
        }
        this.selectedDepartment.set(null);
        this.departmentService.getDepartment(this.INTERDEPARTMENTAL_ID).subscribe({
          next: (interDept) => this.userDepartments.set([interDept]),
        });
        return;
      }

      if (routeDepartmentId) {
        if (
          routeDepartmentId !== user.departmentId &&
          routeDepartmentId !== this.INTERDEPARTMENTAL_ID
        ) {
          this.router.navigate(['/departments']);
          return;
        }
        this.loadDepartmentDetail(routeDepartmentId);
        return;
      }

      this.selectedDepartment.set(null);
      forkJoin([
        this.departmentService.getDepartment(user.departmentId),
        this.departmentService.getDepartment(this.INTERDEPARTMENTAL_ID),
      ]).subscribe({
        next: ([ownDept, interDept]) => this.userDepartments.set([ownDept, interDept]),
      });
    });
  }

  ngOnInit(): void {
    this.userService.loadCurrentUser();
    this.route.paramMap.subscribe((params) => {
      this.routeDepartmentId.set(params.get('id'));
    });
  }

  openNewInitiative(): void {
    this.editingInitiative.set(null);
    this.formName = '';
    this.formDescription = '';
    this.dialogVisible.set(true);
  }

  openEditInitiative(initiative: Initiative, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.editingInitiative.set(initiative);
    this.formName = initiative.name;
    this.formDescription = initiative.description ?? '';
    this.dialogVisible.set(true);
  }

  onSaveInitiative(): void {
    const dept = this.selectedDepartment();
    if (!dept || !this.formName.trim()) return;

    this.saving.set(true);
    const editing = this.editingInitiative();

    const obs = editing
      ? this.initiativeService.updateInitiative(editing.id, {
          name: this.formName.trim(),
          description: this.formDescription.trim() || undefined,
        })
      : this.initiativeService.createInitiative({
          name: this.formName.trim(),
          description: this.formDescription.trim() || undefined,
          departmentId: dept.id,
        });

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: editing ? 'Initiative updated' : 'Initiative created',
        });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not save initiative',
        });
      },
    });
  }

  onDeleteInitiative(initiative: Initiative, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.initiativeService.deleteInitiative(initiative.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Initiative deleted' });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not delete initiative',
        });
      },
    });
  }

  onDepartmentUserCall(user: User, event: MouseEvent): void {
    this.callPopover()?.show(user, event);
  }

  private loadDepartmentDetail(departmentId: string): void {
    this.departmentService.getDepartment(departmentId).subscribe({
      next: (dept) => {
        this.selectedDepartment.set(dept);
        this.initiativeService.loadInitiatives(dept.id);
        this.userService.loadUsers(dept.id);
      },
      error: () => {
        this.selectedDepartment.set(null);
      },
    });
  }
}
