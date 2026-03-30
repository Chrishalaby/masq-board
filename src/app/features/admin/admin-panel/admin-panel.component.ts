import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import { Department } from '../../../models/department.model';
import { UserAssignment } from '../../../models/user-assignment.model';
import { User } from '../../../models/user.model';
import { DepartmentService } from '../../../services/department.service';
import { UserService } from '../../../services/user.service';

type AdminTab = 'users' | 'departments' | 'assignments';

@Component({
  selector: 'app-admin-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [
    RouterLink,
    FormsModule,
    Button,
    Dialog,
    InputText,
    Textarea,
    Select,
    Checkbox,
    Tag,
    Toast,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
  ],
  template: `
    <p-toast />

    <div class="mx-auto max-w-5xl px-6 py-8">
      <!-- Back -->
      <div class="mb-4">
        <a routerLink="/" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >← Home</a
        >
      </div>

      <h1 class="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Panel</h1>

      <p-tabs [(value)]="activeTab">
        <p-tablist>
          <p-tab value="users">Users</p-tab>
          <p-tab value="departments">Departments</p-tab>
          <p-tab value="assignments">Assign Permissions</p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- ===== USERS TAB ===== -->
          <p-tabpanel value="users">
            <div class="py-4">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">All Users</h2>
              </div>

              <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                        Name
                      </th>
                      <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                        Email
                      </th>
                      <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                        Department
                      </th>
                      <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                        Roles
                      </th>
                      <th
                        class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300"
                      ></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (user of allUsers(); track user.id) {
                      <tr class="border-t border-gray-100 dark:border-gray-700">
                        <td class="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {{ user.displayName }}
                        </td>
                        <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ user.email }}</td>
                        <td class="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {{ departmentName(user.departmentId) }}
                        </td>
                        <td class="px-4 py-3">
                          <div class="flex flex-wrap gap-1">
                            @if (user.isAdmin) {
                              <p-tag value="Admin" severity="danger" />
                            }
                            @if (user.isGeneralSupervisor) {
                              <p-tag value="General Supervisor" severity="warn" />
                            }
                          </div>
                        </td>
                        <td class="px-4 py-3">
                          <p-button
                            icon="pi pi-pencil"
                            severity="secondary"
                            [text]="true"
                            size="small"
                            ariaLabel="Edit user"
                            (onClick)="openEditUser(user)"
                          />
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </p-tabpanel>

          <!-- ===== DEPARTMENTS TAB ===== -->
          <p-tabpanel value="departments">
            <div class="py-4">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Departments</h2>
                <p-button
                  label="New Department"
                  icon="pi pi-plus"
                  size="small"
                  (onClick)="openNewDepartment()"
                />
              </div>

              <div class="flex flex-col gap-3">
                @for (dept of departments(); track dept.id) {
                  <div
                    class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div>
                      <p class="font-semibold text-gray-900 dark:text-gray-100">{{ dept.name }}</p>
                      @if (dept.description) {
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          {{ dept.description }}
                        </p>
                      }
                      @if (dept.headOfDepartment) {
                        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Head: {{ dept.headOfDepartment.displayName }}
                        </p>
                      }
                    </div>
                    <div class="flex gap-1">
                      <p-button
                        icon="pi pi-pencil"
                        severity="secondary"
                        [text]="true"
                        size="small"
                        ariaLabel="Edit department"
                        (onClick)="openEditDepartment(dept)"
                      />
                      <p-button
                        icon="pi pi-trash"
                        severity="danger"
                        [text]="true"
                        size="small"
                        ariaLabel="Delete department"
                        (onClick)="onDeleteDepartment(dept)"
                      />
                    </div>
                  </div>
                }
                @if (departments().length === 0) {
                  <p class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                    No departments yet. Create one to get started.
                  </p>
                }
              </div>
            </div>
          </p-tabpanel>

          <!-- ===== ASSIGNMENTS TAB ===== -->
          <p-tabpanel value="assignments">
            <div class="py-4">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Assignment Permissions
                </h2>
                <p-button
                  label="Add Permission"
                  icon="pi pi-plus"
                  size="small"
                  (onClick)="openNewAssignment()"
                />
              </div>

              <!-- Filter by department -->
              <div class="mb-4 flex items-center gap-3">
                <label class="text-sm font-medium text-gray-600 dark:text-gray-300" for="filterDept"
                  >Filter by Department</label
                >
                <p-select
                  id="filterDept"
                  [(ngModel)]="assignmentDeptFilter"
                  [options]="departments()"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="All departments"
                  [showClear]="true"
                  (onChange)="loadAssignments()"
                />
              </div>

              <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                        Supervisor
                      </th>
                      <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                        Can Assign To
                      </th>
                      <th class="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                        Department
                      </th>
                      <th class="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (a of assignments(); track a.id) {
                      <tr class="border-t border-gray-100 dark:border-gray-700">
                        <td class="px-4 py-3 text-gray-900 dark:text-gray-100">
                          {{ a.user?.displayName ?? a.userId }}
                        </td>
                        <td class="px-4 py-3 text-gray-900 dark:text-gray-100">
                          {{ a.canAssignToUser?.displayName ?? a.canAssignToUserId }}
                        </td>
                        <td class="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {{ departmentName(a.departmentId) }}
                        </td>
                        <td class="px-4 py-3">
                          <p-button
                            icon="pi pi-trash"
                            severity="danger"
                            [text]="true"
                            size="small"
                            ariaLabel="Delete assignment"
                            (onClick)="onDeleteAssignment(a)"
                          />
                        </td>
                      </tr>
                    }
                    @if (assignments().length === 0) {
                      <tr>
                        <td
                          colspan="4"
                          class="py-8 text-center text-sm text-gray-400 dark:text-gray-500"
                        >
                          No assignment permissions defined.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>

    <!-- Edit User Dialog -->
    <p-dialog
      header="Edit User"
      [(visible)]="userDialogVisible"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
    >
      @if (editingUser()) {
        <div class="flex flex-col gap-4 pt-2">
          <div class="flex flex-col gap-1">
            <label for="uDisplayName" class="text-sm font-medium">Display Name</label>
            <input pInputText id="uDisplayName" [(ngModel)]="userForm.displayName" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="uJobTitle" class="text-sm font-medium">Job Title</label>
            <input pInputText id="uJobTitle" [(ngModel)]="userForm.jobTitle" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="uDepartment" class="text-sm font-medium">Department</label>
            <p-select
              id="uDepartment"
              [(ngModel)]="userForm.departmentId"
              [options]="departments()"
              optionLabel="name"
              optionValue="id"
              placeholder="No department"
              [showClear]="true"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium">Roles</label>
            <div class="flex items-center gap-2">
              <p-checkbox [(ngModel)]="userForm.isAdmin" [binary]="true" inputId="uIsAdmin" />
              <label for="uIsAdmin" class="text-sm">Admin</label>
            </div>
            <div class="flex items-center gap-2">
              <p-checkbox
                [(ngModel)]="userForm.isGeneralSupervisor"
                [binary]="true"
                inputId="uIsGS"
              />
              <label for="uIsGS" class="text-sm">General Supervisor</label>
            </div>
          </div>
        </div>
        <ng-template #footer>
          <p-button
            label="Cancel"
            severity="secondary"
            [text]="true"
            (onClick)="userDialogVisible.set(false)"
          />
          <p-button label="Save" [loading]="saving()" (onClick)="onSaveUser()" />
        </ng-template>
      }
    </p-dialog>

    <!-- New/Edit Department Dialog -->
    <p-dialog
      [header]="editingDepartment() ? 'Edit Department' : 'New Department'"
      [(visible)]="deptDialogVisible"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="dName" class="text-sm font-medium">Name *</label>
          <input pInputText id="dName" [(ngModel)]="deptForm.name" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label for="dDesc" class="text-sm font-medium">Description</label>
          <textarea
            pTextarea
            id="dDesc"
            [(ngModel)]="deptForm.description"
            rows="2"
            class="w-full"
          ></textarea>
        </div>
        <div class="flex flex-col gap-1">
          <label for="dHead" class="text-sm font-medium">Head of Department</label>
          <p-select
            id="dHead"
            [(ngModel)]="deptForm.headOfDepartmentId"
            [options]="allUsers()"
            optionLabel="displayName"
            optionValue="id"
            placeholder="Select head"
            [showClear]="true"
            [filter]="true"
            filterBy="displayName"
          />
        </div>
      </div>
      <ng-template #footer>
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="deptDialogVisible.set(false)"
        />
        <p-button
          label="Save"
          [disabled]="!deptForm.name.trim()"
          [loading]="saving()"
          (onClick)="onSaveDepartment()"
        />
      </ng-template>
    </p-dialog>

    <!-- New Assignment Dialog -->
    <p-dialog
      header="Add Assignment Permission"
      [(visible)]="assignDialogVisible"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="aDept" class="text-sm font-medium">Department *</label>
          <p-select
            id="aDept"
            [(ngModel)]="assignForm.departmentId"
            [options]="departments()"
            optionLabel="name"
            optionValue="id"
            placeholder="Select department"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="aUser" class="text-sm font-medium">Supervisor (can assign) *</label>
          <p-select
            id="aUser"
            [(ngModel)]="assignForm.userId"
            [options]="usersInSelectedAssignDept()"
            optionLabel="displayName"
            optionValue="id"
            placeholder="Select supervisor"
            [filter]="true"
            filterBy="displayName"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="aTarget" class="text-sm font-medium">Can Assign To *</label>
          <p-select
            id="aTarget"
            [(ngModel)]="assignForm.canAssignToUserId"
            [options]="usersInSelectedAssignDept()"
            optionLabel="displayName"
            optionValue="id"
            placeholder="Select target user"
            [filter]="true"
            filterBy="displayName"
          />
        </div>
      </div>
      <ng-template #footer>
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="assignDialogVisible.set(false)"
        />
        <p-button
          label="Add"
          [disabled]="
            !assignForm.userId || !assignForm.canAssignToUserId || !assignForm.departmentId
          "
          [loading]="saving()"
          (onClick)="onSaveAssignment()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class AdminPanelComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly departmentService = inject(DepartmentService);
  private readonly messageService = inject(MessageService);

  readonly activeTab = signal<AdminTab>('users');
  readonly saving = signal(false);

  // Data
  readonly allUsers = this.userService.users;
  readonly departments = this.departmentService.departments;
  readonly assignments = signal<UserAssignment[]>([]);

  // User edit
  readonly userDialogVisible = signal(false);
  readonly editingUser = signal<User | null>(null);
  userForm = {
    displayName: '',
    jobTitle: '',
    departmentId: undefined as string | undefined,
    isAdmin: false,
    isGeneralSupervisor: false,
  };

  // Department edit
  readonly deptDialogVisible = signal(false);
  readonly editingDepartment = signal<Department | null>(null);
  deptForm = { name: '', description: '', headOfDepartmentId: undefined as string | undefined };

  // Assignment creation
  readonly assignDialogVisible = signal(false);
  assignmentDeptFilter: string | undefined = undefined;
  assignForm = {
    userId: undefined as string | undefined,
    canAssignToUserId: undefined as string | undefined,
    departmentId: undefined as string | undefined,
  };

  readonly usersInSelectedAssignDept = computed(() => {
    const deptId = this.assignForm.departmentId;
    if (!deptId) return this.allUsers();
    return this.allUsers().filter((u) => u.departmentId === deptId);
  });

  departmentName(id: string | undefined): string {
    if (!id) return '—';
    return this.departments().find((d) => d.id === id)?.name ?? '—';
  }

  ngOnInit(): void {
    this.userService.loadUsers();
    this.departmentService.loadDepartments();
    this.loadAssignments();
  }

  loadAssignments(): void {
    this.userService
      .getAssignments({ departmentId: this.assignmentDeptFilter })
      .subscribe({ next: (rows) => this.assignments.set(rows) });
  }

  // --- Users ---

  openEditUser(user: User): void {
    this.editingUser.set(user);
    this.userForm = {
      displayName: user.displayName,
      jobTitle: user.jobTitle ?? '',
      departmentId: user.departmentId,
      isAdmin: user.isAdmin,
      isGeneralSupervisor: user.isGeneralSupervisor,
    };
    this.userDialogVisible.set(true);
  }

  onSaveUser(): void {
    const u = this.editingUser();
    if (!u) return;
    this.saving.set(true);
    this.userService
      .updateUser(u.id, {
        displayName: this.userForm.displayName,
        jobTitle: this.userForm.jobTitle || undefined,
        departmentId: this.userForm.departmentId,
        isAdmin: this.userForm.isAdmin,
        isGeneralSupervisor: this.userForm.isGeneralSupervisor,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.userDialogVisible.set(false);
          this.messageService.add({ severity: 'success', summary: 'User updated' });
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not update user',
          });
        },
      });
  }

  // --- Departments ---

  openNewDepartment(): void {
    this.editingDepartment.set(null);
    this.deptForm = { name: '', description: '', headOfDepartmentId: undefined };
    this.deptDialogVisible.set(true);
  }

  openEditDepartment(dept: Department): void {
    this.editingDepartment.set(dept);
    this.deptForm = {
      name: dept.name,
      description: dept.description ?? '',
      headOfDepartmentId: dept.headOfDepartmentId,
    };
    this.deptDialogVisible.set(true);
  }

  onSaveDepartment(): void {
    if (!this.deptForm.name.trim()) return;
    this.saving.set(true);
    const editing = this.editingDepartment();
    const obs = editing
      ? this.departmentService.updateDepartment(editing.id, {
          name: this.deptForm.name.trim(),
          description: this.deptForm.description.trim() || undefined,
          headOfDepartmentId: this.deptForm.headOfDepartmentId,
        })
      : this.departmentService.createDepartment({
          name: this.deptForm.name.trim(),
          description: this.deptForm.description.trim() || undefined,
          headOfDepartmentId: this.deptForm.headOfDepartmentId,
        });

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.deptDialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: editing ? 'Department updated' : 'Department created',
        });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not save department',
        });
      },
    });
  }

  onDeleteDepartment(dept: Department): void {
    this.departmentService.deleteDepartment(dept.id).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Department deleted' }),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not delete department',
        }),
    });
  }

  // --- Assignments ---

  openNewAssignment(): void {
    this.assignForm = {
      userId: undefined,
      canAssignToUserId: undefined,
      departmentId: this.assignmentDeptFilter,
    };
    this.assignDialogVisible.set(true);
  }

  onSaveAssignment(): void {
    const { userId, canAssignToUserId, departmentId } = this.assignForm;
    if (!userId || !canAssignToUserId || !departmentId) return;
    this.saving.set(true);
    this.userService.createAssignment({ userId, canAssignToUserId, departmentId }).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.assignDialogVisible.set(false);
        this.assignments.update((list) => [created, ...list]);
        this.messageService.add({ severity: 'success', summary: 'Permission added' });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not add permission',
        });
      },
    });
  }

  onDeleteAssignment(a: UserAssignment): void {
    this.userService.deleteAssignment(a.id).subscribe({
      next: () => {
        this.assignments.update((list) => list.filter((x) => x.id !== a.id));
        this.messageService.add({ severity: 'success', summary: 'Permission removed' });
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not remove permission',
        }),
    });
  }
}
