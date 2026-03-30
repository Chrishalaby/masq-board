import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import { Department } from '../../../models/department.model';
import { Initiative } from '../../../models/initiative.model';
import { DepartmentService } from '../../../services/department.service';
import { InitiativeService } from '../../../services/initiative.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-department-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [RouterLink, Button, Dialog, FormsModule, InputText, Textarea, Toast],
  template: `
    <p-toast />

    <div class="mx-auto max-w-4xl px-6 py-8">
      <!-- Back -->
      <div class="mb-4">
        <a routerLink="/" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >← Home</a
        >
      </div>

      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Department Management</h1>
          @if (department()) {
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ department()!.name }}
              @if (department()!.description) {
                — {{ department()!.description }}
              }
            </p>
          }
        </div>
        @if (department()) {
          <p-button
            label="New Initiative"
            icon="pi pi-plus"
            size="small"
            (onClick)="openNewInitiative()"
          />
        }
      </div>

      <!-- No department state -->
      @if (!loading() && !department()) {
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

      <!-- Initiatives list -->
      @if (department()) {
        @if (initiatives().length === 0) {
          <div
            class="rounded-lg border border-dashed border-gray-300 p-12 text-center dark:border-gray-600"
          >
            <i class="pi pi-flag text-4xl text-gray-300 dark:text-gray-600"></i>
            <p class="mt-3 text-gray-500 dark:text-gray-400">No initiatives yet.</p>
            <p class="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Create the first initiative for your department.
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
      }
    </div>

    <!-- New/Edit Initiative Dialog -->
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
  `,
})
export class DepartmentManagementComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly departmentService = inject(DepartmentService);
  private readonly initiativeService = inject(InitiativeService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(true);
  readonly department = signal<Department | null>(null);
  readonly initiatives = this.initiativeService.initiatives;

  readonly dialogVisible = signal(false);
  readonly editingInitiative = signal<Initiative | null>(null);
  readonly saving = signal(false);

  formName = '';
  formDescription = '';

  private departmentLoaded = false;

  constructor() {
    effect(() => {
      const user = this.userService.currentUser();
      if (user !== null && !this.departmentLoaded) {
        this.departmentLoaded = true;
        untracked(() => {
          this.loading.set(false);
          if (user.departmentId) {
            this.departmentService.getDepartment(user.departmentId).subscribe({
              next: (dept) => {
                this.department.set(dept);
                this.initiativeService.loadInitiatives(dept.id);
              },
            });
          }
        });
      }
    });
  }

  ngOnInit(): void {
    this.userService.loadCurrentUser();
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
    const dept = this.department();
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
}
