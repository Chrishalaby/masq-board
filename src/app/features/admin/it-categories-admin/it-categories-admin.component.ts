import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Chip } from 'primeng/chip';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { take } from 'rxjs/operators';
import { ItCategory } from '../../../models/it-ticket.model';
import { ItSupportService } from '../../../services/it-support.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-it-categories-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, Chip, Dialog, InputText, MultiSelect],
  template: `
    <div class="py-4">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
            IT Support Categories
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            New tickets are assigned automatically to the people listed on their category.
          </p>
        </div>
        <p-button label="New Category" icon="pi pi-plus" size="small" (onClick)="openNew()" />
      </div>

      <div class="flex flex-col gap-3">
        @for (category of categories(); track category.id) {
          <div
            class="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-gray-900 dark:text-gray-100">{{ category.name }}</p>
              <div class="mt-2 flex flex-wrap gap-1">
                @for (user of category.assignees; track user.id) {
                  <p-chip [label]="user.displayName" />
                } @empty {
                  <span class="text-sm text-gray-400 dark:text-gray-500">
                    No one assigned — tickets in this category start unassigned.
                  </span>
                }
              </div>
              @if (category.pendingAssigneeNames?.length) {
                <p class="mt-2 text-xs text-amber-700 dark:text-amber-400">
                  <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>
                  Default assignees not matched to a user yet:
                  {{ category.pendingAssigneeNames!.join(', ') }}. They are added automatically once
                  they appear in Users, or you can assign them here.
                </p>
              }
            </div>
            <div class="flex shrink-0 gap-1">
              <p-button
                icon="pi pi-pencil"
                severity="secondary"
                [text]="true"
                size="small"
                [ariaLabel]="'Edit category ' + category.name"
                (onClick)="openEdit(category)"
              />
              <p-button
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                size="small"
                [ariaLabel]="'Delete category ' + category.name"
                (onClick)="onDelete(category)"
              />
            </div>
          </div>
        } @empty {
          <p class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No categories yet. Create one to get started.
          </p>
        }
      </div>
    </div>

    <p-dialog
      [header]="editing() ? 'Edit Category' : 'New Category'"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="itCategoryName" class="text-sm font-medium">Name *</label>
          <input
            pInputText
            id="itCategoryName"
            class="w-full"
            [ngModel]="nameDraft()"
            (ngModelChange)="nameDraft.set($event)"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="itCategoryAssignees" class="text-sm font-medium">Auto-assign to</label>
          <p-multiselect
            inputId="itCategoryAssignees"
            [ngModel]="assigneeIdsDraft()"
            (ngModelChange)="assigneeIdsDraft.set($event)"
            [options]="users()"
            optionLabel="displayName"
            optionValue="id"
            placeholder="Select people"
            [filter]="true"
            filterBy="displayName"
            display="chip"
            appendTo="body"
            [fluid]="true"
          />
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
          [disabled]="!nameDraft().trim()"
          [loading]="saving()"
          (onClick)="onSave()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class ItCategoriesAdminComponent implements OnInit {
  private readonly itSupportService = inject(ItSupportService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);

  readonly categories = this.itSupportService.categories;
  readonly users = this.userService.users;

  readonly dialogVisible = signal(false);
  readonly editing = signal<ItCategory | null>(null);
  readonly nameDraft = signal('');
  readonly assigneeIdsDraft = signal<string[]>([]);
  readonly saving = signal(false);

  ngOnInit(): void {
    this.itSupportService.loadCategories();
  }

  openNew(): void {
    this.editing.set(null);
    this.nameDraft.set('');
    this.assigneeIdsDraft.set([]);
    this.dialogVisible.set(true);
  }

  openEdit(category: ItCategory): void {
    this.editing.set(category);
    this.nameDraft.set(category.name);
    this.assigneeIdsDraft.set(category.assignees.map((u) => u.id));
    this.dialogVisible.set(true);
  }

  onSave(): void {
    const name = this.nameDraft().trim();
    if (!name) return;
    const payload = { name, assigneeIds: this.assigneeIdsDraft() };
    const editing = this.editing();
    this.saving.set(true);

    const request = editing
      ? this.itSupportService.updateCategory(editing.id, payload)
      : this.itSupportService.createCategory(payload);

    request.pipe(take(1)).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: editing ? 'Category updated' : 'Category created',
        });
      },
      error: () => this.saving.set(false),
    });
  }

  onDelete(category: ItCategory): void {
    this.itSupportService
      .deleteCategory(category.id)
      .pipe(take(1))
      .subscribe({
        next: () =>
          this.messageService.add({
            severity: 'success',
            summary: 'Category removed',
            detail: 'Existing tickets keep their category name.',
          }),
      });
  }
}
