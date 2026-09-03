import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Chip } from 'primeng/chip';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { MultiSelect } from 'primeng/multiselect';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { take } from 'rxjs/operators';
import {
  IT_TICKET_STATUSES,
  itPriorityLabel,
  itPrioritySeverity,
  itStatusLabel,
  itStatusSeverity,
  ItTicket,
  ItTicketStatus,
  UpdateItTicketPayload,
} from '../../../models/it-ticket.model';
import { User } from '../../../models/user.model';
import { ItSupportService } from '../../../services/it-support.service';
import { UserService } from '../../../services/user.service';
import { TicketCommentsComponent } from '../ticket-comments/ticket-comments.component';
import {
  createItTicketFieldsForm,
  formatDateOnly,
  parseDateOnly,
  TicketFieldsComponent,
} from '../ticket-fields/ticket-fields.component';

@Component({
  selector: 'app-ticket-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    Button,
    Chip,
    ConfirmDialog,
    Dialog,
    MultiSelect,
    ProgressSpinner,
    Select,
    Tag,
    Textarea,
    TicketFieldsComponent,
    TicketCommentsComponent,
  ],
  template: `
    <p-confirmdialog />

    <div class="mx-auto max-w-6xl px-6 py-8">
      <div class="mb-4">
        <a routerLink="/it-support" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >← IT Support</a
        >
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16">
          <p-progressspinner strokeWidth="4" [style]="{ width: '2rem', height: '2rem' }" />
        </div>
      } @else if (ticket(); as t) {
        <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-sm text-gray-500 dark:text-gray-400">Ticket #{{ t.ticketNumber }}</p>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ t.title }}</h1>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <p-tag [value]="statusLabel(t.status)" [severity]="statusSeverity(t.status)" />
              <p-tag
                [value]="priorityLabel(t.priority) + ' priority'"
                [severity]="prioritySeverity(t.priority)"
                [rounded]="true"
              />
              <span class="text-xs text-gray-500 dark:text-gray-400"
                >Created {{ t.createdAt | date: 'medium' }}</span
              >
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            @if (canManage()) {
              <p-button label="Change Status" icon="pi pi-sync" (onClick)="openStatusDialog()" />
              <p-button
                label="Assignees"
                icon="pi pi-users"
                severity="secondary"
                [outlined]="true"
                (onClick)="openAssigneesDialog()"
              />
            }
            @if (canEditCore()) {
              <p-button
                label="Edit"
                icon="pi pi-pencil"
                severity="secondary"
                [outlined]="true"
                (onClick)="openEditDialog()"
              />
            }
            @if (isAdmin()) {
              <p-button
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                ariaLabel="Delete ticket"
                (onClick)="confirmDelete()"
              />
            }
          </div>
        </header>

        <div class="grid gap-6 lg:grid-cols-3">
          <div class="flex flex-col gap-6 lg:col-span-2">
            <section
              class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              aria-labelledby="descriptionHeading"
            >
              <h2
                id="descriptionHeading"
                class="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Description
              </h2>
              <p class="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                {{ t.description }}
              </p>
            </section>

            @if (t.status === 'rejected') {
              <section
                class="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950"
                aria-labelledby="rejectionHeading"
              >
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h2
                    id="rejectionHeading"
                    class="text-sm font-semibold uppercase tracking-wide text-red-700 dark:text-red-300"
                  >
                    Rejection Notes
                  </h2>
                  @if (canEditRejectionNotes() && !editingRejectionNotes()) {
                    <p-button
                      label="Edit"
                      icon="pi pi-pencil"
                      size="small"
                      [text]="true"
                      severity="danger"
                      (onClick)="startEditRejectionNotes()"
                    />
                  }
                </div>
                @if (editingRejectionNotes()) {
                  <textarea
                    pTextarea
                    rows="4"
                    class="w-full"
                    aria-label="Rejection notes"
                    [ngModel]="rejectionNotesDraft()"
                    (ngModelChange)="rejectionNotesDraft.set($event)"
                  ></textarea>
                  <div class="mt-2 flex justify-end gap-2">
                    <p-button
                      label="Cancel"
                      size="small"
                      severity="secondary"
                      [text]="true"
                      (onClick)="editingRejectionNotes.set(false)"
                    />
                    <p-button
                      label="Save"
                      size="small"
                      [loading]="saving()"
                      (onClick)="saveRejectionNotes()"
                    />
                  </div>
                } @else {
                  <p class="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                    {{ t.rejectionNotes || 'No rejection notes were provided.' }}
                  </p>
                }
                @if (t.rejectedBy) {
                  <p class="mt-2 text-xs text-red-700 dark:text-red-300">
                    Rejected by {{ t.rejectedBy.displayName }} on
                    {{ t.rejectedAt | date: 'medium' }}
                  </p>
                }
              </section>
            }

            @if (canManage() || t.approverNotes) {
              <section
                class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
                aria-labelledby="approverNotesHeading"
              >
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h2
                    id="approverNotesHeading"
                    class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    Approver Notes
                  </h2>
                  @if (canManage() && !editingApproverNotes()) {
                    <p-button
                      label="Edit"
                      icon="pi pi-pencil"
                      size="small"
                      [text]="true"
                      (onClick)="startEditApproverNotes()"
                    />
                  }
                </div>
                @if (editingApproverNotes()) {
                  <textarea
                    pTextarea
                    rows="4"
                    class="w-full"
                    aria-label="Approver notes"
                    [ngModel]="approverNotesDraft()"
                    (ngModelChange)="approverNotesDraft.set($event)"
                  ></textarea>
                  <div class="mt-2 flex justify-end gap-2">
                    <p-button
                      label="Cancel"
                      size="small"
                      severity="secondary"
                      [text]="true"
                      (onClick)="editingApproverNotes.set(false)"
                    />
                    <p-button
                      label="Save"
                      size="small"
                      [loading]="saving()"
                      (onClick)="saveApproverNotes()"
                    />
                  </div>
                } @else {
                  <p class="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                    {{ t.approverNotes || 'No approver notes yet.' }}
                  </p>
                }
              </section>
            }

            <section
              class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              aria-labelledby="attachmentsHeading"
            >
              <div class="mb-2 flex items-center justify-between gap-2">
                <h2
                  id="attachmentsHeading"
                  class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  Attachments
                </h2>
                @if (canEditAttachments()) {
                  <input
                    #fileInput
                    type="file"
                    multiple
                    class="hidden"
                    aria-label="Upload attachments"
                    (change)="onFilesSelected($event)"
                  />
                  <p-button
                    label="Upload"
                    icon="pi pi-upload"
                    size="small"
                    [outlined]="true"
                    [loading]="uploading()"
                    (onClick)="fileInput.click()"
                  />
                }
              </div>
              @if (t.attachments.length > 0) {
                <ul class="flex flex-col gap-2">
                  @for (file of t.attachments; track file.url; let i = $index) {
                    <li
                      class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <i class="pi pi-file text-gray-400" aria-hidden="true"></i>
                      <a
                        [href]="file.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex-1 truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
                        [title]="file.name"
                        >{{ file.name }}</a
                      >
                      <span class="text-xs text-gray-400">{{
                        file.uploadedAt | date: 'short'
                      }}</span>
                      @if (canEditAttachments()) {
                        <p-button
                          icon="pi pi-trash"
                          [text]="true"
                          severity="danger"
                          size="small"
                          [loading]="deletingIndex() === i"
                          [ariaLabel]="'Remove ' + file.name"
                          (onClick)="removeAttachment(i)"
                        />
                      }
                    </li>
                  }
                </ul>
              } @else {
                <p class="text-sm text-gray-500 dark:text-gray-400">No attachments.</p>
              }
            </section>

            <section
              class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              aria-labelledby="historyHeading"
            >
              <h2
                id="historyHeading"
                class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Status History
              </h2>
              <ol class="flex flex-col gap-3">
                @for (log of t.statusLogs ?? []; track log.id) {
                  <li class="flex items-start gap-3">
                    <span
                      class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500"
                      aria-hidden="true"
                    ></span>
                    <div class="flex flex-col gap-1">
                      <div class="flex flex-wrap items-center gap-2 text-sm">
                        @if (log.fromStatus) {
                          <p-tag
                            [value]="statusLabel(log.fromStatus)"
                            [severity]="statusSeverity(log.fromStatus)"
                          />
                          <i class="pi pi-arrow-right text-xs text-gray-400" aria-hidden="true"></i>
                          <span class="sr-only">changed to</span>
                        } @else {
                          <span class="text-gray-600 dark:text-gray-300">Created as</span>
                        }
                        <p-tag
                          [value]="statusLabel(log.toStatus)"
                          [severity]="statusSeverity(log.toStatus)"
                        />
                      </div>
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        {{ log.changedBy?.displayName || log.changedByName }} ·
                        {{ log.changedAt | date: 'medium' }}
                      </span>
                    </div>
                  </li>
                } @empty {
                  <li class="text-sm text-gray-500 dark:text-gray-400">No status changes yet.</li>
                }
              </ol>
            </section>

            <app-ticket-comments [ticketId]="t.id" [highlightCommentId]="highlightCommentId()" />
          </div>

          <aside class="flex flex-col gap-6">
            <section
              class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              aria-labelledby="detailsHeading"
            >
              <h2
                id="detailsHeading"
                class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Details
              </h2>
              <dl class="flex flex-col gap-3 text-sm">
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">Requester</dt>
                  <dd class="text-gray-900 dark:text-gray-100">
                    {{ t.requester?.displayName || '—' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">Company</dt>
                  <dd class="text-gray-900 dark:text-gray-100">{{ t.company }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">Category</dt>
                  <dd class="text-gray-900 dark:text-gray-100">{{ t.category?.name || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">Priority</dt>
                  <dd class="text-gray-900 dark:text-gray-100">{{ priorityLabel(t.priority) }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">Needed By</dt>
                  <dd class="text-gray-900 dark:text-gray-100">
                    {{ t.neededBy ? (t.neededBy | date: 'mediumDate') : '—' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">Assigned To</dt>
                  <dd class="mt-1 flex flex-wrap gap-1">
                    @for (assignee of t.assignees; track assignee.id) {
                      <p-chip [label]="assignee.displayName" />
                    } @empty {
                      <span class="text-gray-500 dark:text-gray-400">Unassigned</span>
                    }
                  </dd>
                </div>
                <div>
                  <dt class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    Responsible Person
                    @if (canManage()) {
                      <p-button
                        icon="pi pi-pencil"
                        [text]="true"
                        size="small"
                        severity="secondary"
                        ariaLabel="Set the responsible person"
                        (onClick)="openResponsibleDialog()"
                      />
                    }
                  </dt>
                  <dd class="text-gray-900 dark:text-gray-100">
                    @if (t.responsiblePerson) {
                      {{ t.responsiblePerson.displayName }}
                    } @else {
                      <span class="text-gray-500 dark:text-gray-400">
                        Not assigned yet
                        @if (canManage()) {
                          <span> &mdash; pick who is working on this</span>
                        }
                      </span>
                    }
                  </dd>
                </div>
                @if (t.approvedBy) {
                  <div>
                    <dt class="text-xs text-gray-500 dark:text-gray-400">Approved By</dt>
                    <dd class="text-gray-900 dark:text-gray-100">
                      {{ t.approvedBy.displayName }}
                      <span class="block text-xs text-gray-500 dark:text-gray-400">{{
                        t.approvedAt | date: 'medium'
                      }}</span>
                    </dd>
                  </div>
                }
                @if (t.rejectedBy) {
                  <div>
                    <dt class="text-xs text-gray-500 dark:text-gray-400">Rejected By</dt>
                    <dd class="text-gray-900 dark:text-gray-100">
                      {{ t.rejectedBy.displayName }}
                      <span class="block text-xs text-gray-500 dark:text-gray-400">{{
                        t.rejectedAt | date: 'medium'
                      }}</span>
                    </dd>
                  </div>
                }
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">Last Updated</dt>
                  <dd class="text-gray-900 dark:text-gray-100">
                    {{ t.updatedAt | date: 'medium' }}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      } @else {
        <p class="py-16 text-center text-gray-500 dark:text-gray-400">Ticket not found.</p>
      }
    </div>

    <p-dialog
      header="Change Status"
      [(visible)]="statusDialogVisible"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="newStatus" class="text-sm font-medium">New Status *</label>
          <p-select
            inputId="newStatus"
            [ngModel]="statusDraft()"
            (ngModelChange)="statusDraft.set($event)"
            [options]="statusChoices()"
            optionLabel="label"
            optionValue="value"
            placeholder="Select status"
            appendTo="body"
            [fluid]="true"
          />
        </div>
        @if (statusDraft() === 'rejected') {
          <div class="flex flex-col gap-1">
            <label for="rejectionNotes" class="text-sm font-medium">Rejection Notes</label>
            <textarea
              pTextarea
              id="rejectionNotes"
              rows="4"
              class="w-full"
              [ngModel]="rejectionNotesDraft()"
              (ngModelChange)="rejectionNotesDraft.set($event)"
            ></textarea>
            <span class="text-xs text-gray-500 dark:text-gray-400"
              >Shown on the ticket once it is rejected.</span
            >
          </div>
        }
        @if (statusDraft() === 'approved') {
          <div class="flex flex-col gap-1">
            <label for="approverNotes" class="text-sm font-medium">Approver Notes</label>
            <textarea
              pTextarea
              id="approverNotes"
              rows="3"
              class="w-full"
              [ngModel]="approverNotesDraft()"
              (ngModelChange)="approverNotesDraft.set($event)"
            ></textarea>
          </div>
        }
        <p class="text-xs text-gray-500 dark:text-gray-400">
          The change is logged on the ticket and the requester and assignees are notified via Teams.
        </p>
      </div>
      <ng-template #footer>
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="statusDialogVisible.set(false)"
        />
        <p-button
          label="Update Status"
          [disabled]="!statusDraft()"
          [loading]="saving()"
          (onClick)="submitStatus()"
        />
      </ng-template>
    </p-dialog>

    <p-dialog
      header="Assigned To"
      [(visible)]="assigneesDialogVisible"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-1 pt-2">
        <label for="ticketAssignees" class="text-sm font-medium">Assigned people</label>
        <p-multiselect
          inputId="ticketAssignees"
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
        <span class="text-xs text-gray-500 dark:text-gray-400"
          >Newly added people are notified via Teams; everyone else on the ticket is told about the
          change.</span
        >
      </div>
      <ng-template #footer>
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="assigneesDialogVisible.set(false)"
        />
        <p-button label="Save" [loading]="saving()" (onClick)="submitAssignees()" />
      </ng-template>
    </p-dialog>

    <p-dialog
      header="Responsible Person"
      [(visible)]="responsibleDialogVisible"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [draggable]="false"
    >
      <div class="flex flex-col gap-1 pt-2">
        <label for="responsiblePerson" class="text-sm font-medium"
          >Who is working on this ticket?</label
        >
        <p-select
          inputId="responsiblePerson"
          [ngModel]="responsibleIdDraft()"
          (ngModelChange)="responsibleIdDraft.set($event)"
          [options]="responsibleOptions()"
          [group]="true"
          optionGroupLabel="label"
          optionGroupChildren="items"
          optionLabel="displayName"
          optionValue="id"
          placeholder="Select a person"
          [filter]="true"
          filterBy="displayName"
          [showClear]="true"
          appendTo="body"
          [fluid]="true"
        />
        <span class="text-xs text-gray-500 dark:text-gray-400"
          >The requester and everyone on the ticket are told about the change.</span
        >
      </div>
      <ng-template #footer>
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="responsibleDialogVisible.set(false)"
        />
        <p-button label="Save" [loading]="saving()" (onClick)="submitResponsible()" />
      </ng-template>
    </p-dialog>

    <p-dialog
      header="Edit Ticket"
      [(visible)]="editDialogVisible"
      [modal]="true"
      [style]="{ width: '40rem' }"
      [draggable]="false"
    >
      <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="pt-2">
        <app-ticket-fields [form]="editForm" [categories]="categories()" />
        <div class="mt-4 flex justify-end gap-2">
          <p-button
            type="button"
            label="Cancel"
            severity="secondary"
            [text]="true"
            (onClick)="editDialogVisible.set(false)"
          />
          <p-button type="submit" label="Save Changes" [loading]="saving()" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class TicketDetailComponent implements OnInit {
  private readonly itSupportService = inject(ItSupportService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly ticket = signal<ItTicket | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly deletingIndex = signal<number | null>(null);

  readonly categories = this.itSupportService.categories;
  readonly users = this.userService.users;

  readonly statusDialogVisible = signal(false);
  readonly statusDraft = signal<ItTicketStatus | null>(null);
  readonly rejectionNotesDraft = signal('');
  readonly approverNotesDraft = signal('');
  readonly assigneesDialogVisible = signal(false);
  readonly responsibleDialogVisible = signal(false);
  readonly responsibleIdDraft = signal<string | null>(null);
  readonly assigneeIdsDraft = signal<string[]>([]);
  readonly editDialogVisible = signal(false);
  readonly editForm = createItTicketFieldsForm();
  readonly editingRejectionNotes = signal(false);
  readonly editingApproverNotes = signal(false);

  readonly statusLabel = itStatusLabel;
  readonly statusSeverity = itStatusSeverity;
  readonly priorityLabel = itPriorityLabel;
  readonly prioritySeverity = itPrioritySeverity;

  readonly isAdmin = computed(() => this.userService.currentUser()?.isAdmin === true);

  readonly isRequester = computed(() => {
    const me = this.userService.currentUser()?.id;
    return !!me && this.ticket()?.requesterId === me;
  });

  readonly canManage = computed(() => {
    const me = this.userService.currentUser()?.id;
    return this.isAdmin() || (!!me && !!this.ticket()?.assignees?.some((a) => a.id === me));
  });

  readonly canEditCore = computed(() => this.canManage() || this.isRequester());
  readonly canEditAttachments = this.canEditCore;

  readonly canEditRejectionNotes = computed(() => {
    const t = this.ticket();
    const me = this.userService.currentUser()?.id;
    return t?.status === 'rejected' && (this.isAdmin() || (!!me && t.rejectedById === me));
  });

  readonly statusChoices = computed(() =>
    IT_TICKET_STATUSES.filter((s) => s.value !== this.ticket()?.status),
  );

  readonly highlightCommentId = signal<string | null>(null);

  readonly responsibleOptions = computed(() => {
    const assignees = this.ticket()?.assignees ?? [];
    const assignedIds = new Set(assignees.map((user) => user.id));
    const others = this.users().filter((user) => !assignedIds.has(user.id));
    const groups: { label: string; items: User[] }[] = [];

    if (assignees.length > 0) {
      groups.push({ label: 'Assigned to this ticket', items: [...assignees] });
    }
    if (others.length > 0) {
      groups.push({ label: 'Everyone else', items: others });
    }
    return groups;
  });

  ngOnInit(): void {
    this.itSupportService.loadCategories();
    this.highlightCommentId.set(this.route.snapshot.queryParamMap.get('comment'));
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.itSupportService
      .getTicket(id)
      .pipe(take(1))
      .subscribe({
        next: (ticket) => {
          this.ticket.set(ticket);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openStatusDialog(): void {
    const t = this.ticket();
    if (!t) return;
    this.statusDraft.set(null);
    this.rejectionNotesDraft.set(t.rejectionNotes ?? '');
    this.approverNotesDraft.set(t.approverNotes ?? '');
    this.statusDialogVisible.set(true);
  }

  submitStatus(): void {
    const t = this.ticket();
    const status = this.statusDraft();
    if (!t || !status) return;

    this.saving.set(true);
    this.itSupportService
      .changeStatus(t.id, {
        status,
        rejectionNotes: status === 'rejected' ? this.rejectionNotesDraft() : undefined,
        approverNotes: status === 'approved' ? this.approverNotesDraft() : undefined,
      })
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          this.ticket.set(updated);
          this.saving.set(false);
          this.statusDialogVisible.set(false);
          this.messageService.add({
            severity: 'success',
            summary: `Status set to ${itStatusLabel(updated.status)}`,
            detail: 'The requester and assignees have been notified.',
            life: 4000,
          });
        },
        error: () => this.saving.set(false),
      });
  }

  openResponsibleDialog(): void {
    const t = this.ticket();
    if (!t) return;
    if (this.users().length === 0) {
      this.userService.loadUsers();
    }
    this.responsibleIdDraft.set(t.responsiblePersonId ?? null);
    this.responsibleDialogVisible.set(true);
  }

  submitResponsible(): void {
    this.patchTicket(
      { responsiblePersonId: this.responsibleIdDraft() },
      'Responsible person updated',
      () => this.responsibleDialogVisible.set(false),
    );
  }

  openAssigneesDialog(): void {
    const t = this.ticket();
    if (!t) return;
    if (this.users().length === 0) {
      this.userService.loadUsers();
    }
    this.assigneeIdsDraft.set(t.assignees.map((a) => a.id));
    this.assigneesDialogVisible.set(true);
  }

  submitAssignees(): void {
    this.patchTicket({ assigneeIds: this.assigneeIdsDraft() }, 'Assignees updated', () =>
      this.assigneesDialogVisible.set(false),
    );
  }

  openEditDialog(): void {
    const t = this.ticket();
    if (!t) return;
    this.editForm.reset({
      title: t.title,
      company: t.company,
      categoryId: t.categoryId ?? null,
      priority: t.priority,
      description: t.description,
      neededBy: parseDateOnly(t.neededBy),
    });
    this.editDialogVisible.set(true);
  }

  submitEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const raw = this.editForm.getRawValue();
    this.patchTicket(
      {
        title: raw.title.trim(),
        company: raw.company!,
        categoryId: raw.categoryId!,
        priority: raw.priority,
        description: raw.description.trim(),
        neededBy: raw.neededBy ? formatDateOnly(raw.neededBy) : null,
      },
      'Ticket updated',
      () => this.editDialogVisible.set(false),
    );
  }

  startEditRejectionNotes(): void {
    this.rejectionNotesDraft.set(this.ticket()?.rejectionNotes ?? '');
    this.editingRejectionNotes.set(true);
  }

  saveRejectionNotes(): void {
    this.patchTicket({ rejectionNotes: this.rejectionNotesDraft() }, 'Rejection notes saved', () =>
      this.editingRejectionNotes.set(false),
    );
  }

  startEditApproverNotes(): void {
    this.approverNotesDraft.set(this.ticket()?.approverNotes ?? '');
    this.editingApproverNotes.set(true);
  }

  saveApproverNotes(): void {
    this.patchTicket({ approverNotes: this.approverNotesDraft() }, 'Approver notes saved', () =>
      this.editingApproverNotes.set(false),
    );
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const t = this.ticket();
    input.value = '';
    if (!files.length || !t) return;

    this.uploading.set(true);
    this.itSupportService
      .uploadAttachments(t.id, files)
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          this.ticket.set(updated);
          this.uploading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: files.length === 1 ? 'File uploaded' : `${files.length} files uploaded`,
            life: 3000,
          });
        },
        error: () => this.uploading.set(false),
      });
  }

  removeAttachment(index: number): void {
    const t = this.ticket();
    if (!t) return;
    this.deletingIndex.set(index);
    this.itSupportService
      .deleteAttachment(t.id, index)
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          this.ticket.set(updated);
          this.deletingIndex.set(null);
        },
        error: () => this.deletingIndex.set(null),
      });
  }

  confirmDelete(): void {
    const t = this.ticket();
    if (!t) return;
    this.confirmationService.confirm({
      header: 'Delete ticket',
      message: `Delete ticket #${t.ticketNumber} "${t.title}"? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => this.deleteTicket(t),
    });
  }

  private deleteTicket(t: ItTicket): void {
    this.itSupportService
      .deleteTicket(t.id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: `Ticket #${t.ticketNumber} deleted`,
            life: 3000,
          });
          this.router.navigate(['/it-support']);
        },
      });
  }

  private patchTicket(
    payload: UpdateItTicketPayload,
    successSummary: string,
    onSuccess: () => void,
  ): void {
    const t = this.ticket();
    if (!t) return;
    this.saving.set(true);
    this.itSupportService
      .updateTicket(t.id, payload)
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          this.ticket.set(updated);
          this.saving.set(false);
          onSuccess();
          this.messageService.add({ severity: 'success', summary: successSummary, life: 3000 });
        },
        error: () => this.saving.set(false),
      });
  }
}
