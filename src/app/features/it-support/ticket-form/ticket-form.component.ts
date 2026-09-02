import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { of } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { assigneeNames, CreateItTicketPayload } from '../../../models/it-ticket.model';
import { ItSupportService } from '../../../services/it-support.service';
import { UserService } from '../../../services/user.service';
import {
  createItTicketFieldsForm,
  formatDateOnly,
  TicketFieldsComponent,
} from '../ticket-fields/ticket-fields.component';

@Component({
  selector: 'app-ticket-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Button, InputText, TicketFieldsComponent],
  template: `
    <div class="mx-auto max-w-3xl px-6 py-8">
      <div class="mb-4">
        <a routerLink="/it-support" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >← IT Support</a
        >
      </div>

      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">New IT Ticket</h1>
      <p class="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">
        Tickets submitted here are the only accepted way to request IT work. Your ticket is assigned
        automatically based on its category.
      </p>

      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label for="ticketRequester" class="text-sm font-medium">Requester</label>
            <input
              pInputText
              id="ticketRequester"
              [value]="requesterName()"
              readonly
              aria-readonly="true"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="ticketStatus" class="text-sm font-medium">Status</label>
            <input
              pInputText
              id="ticketStatus"
              value="New"
              readonly
              aria-readonly="true"
              class="w-full"
            />
          </div>
        </div>

        <app-ticket-fields [form]="form" [categories]="categories()" />

        <div class="flex flex-col gap-2">
          <span id="attachmentsLabel" class="text-sm font-medium">Attachments</span>
          <input
            #fileInput
            type="file"
            multiple
            class="hidden"
            aria-labelledby="attachmentsLabel"
            (change)="onFilesSelected($event)"
          />
          <div class="flex flex-wrap items-center gap-2">
            <p-button
              type="button"
              label="Add files"
              icon="pi pi-paperclip"
              [outlined]="true"
              size="small"
              (onClick)="fileInput.click()"
            />
            <span class="text-xs text-gray-500 dark:text-gray-400">
              Files and images are uploaded to SharePoint when the ticket is submitted.
            </span>
          </div>
          @if (selectedFiles().length > 0) {
            <ul class="flex flex-col gap-1" aria-label="Selected files">
              @for (file of selectedFiles(); track file.name + file.size; let i = $index) {
                <li
                  class="flex items-center justify-between gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <span class="truncate">
                    <i class="pi pi-file mr-2 text-gray-400" aria-hidden="true"></i>{{ file.name }}
                    <span class="text-xs text-gray-400">({{ formatSize(file.size) }})</span>
                  </span>
                  <p-button
                    type="button"
                    icon="pi pi-times"
                    [text]="true"
                    size="small"
                    severity="secondary"
                    [ariaLabel]="'Remove ' + file.name"
                    (onClick)="removeFile(i)"
                  />
                </li>
              }
            </ul>
          }
        </div>

        <div class="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <p-button
            type="button"
            label="Cancel"
            severity="secondary"
            [text]="true"
            (onClick)="cancel()"
          />
          <p-button
            type="submit"
            label="Submit Ticket"
            icon="pi pi-send"
            [loading]="submitting()"
          />
        </div>
      </form>
    </div>
  `,
})
export class TicketFormComponent implements OnInit {
  private readonly itSupportService = inject(ItSupportService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  readonly form = createItTicketFieldsForm();
  readonly categories = this.itSupportService.categories;
  readonly selectedFiles = signal<File[]>([]);
  readonly submitting = signal(false);

  readonly requesterName = computed(() => this.userService.currentUser()?.displayName ?? '');

  ngOnInit(): void {
    this.itSupportService.loadCategories();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) {
      this.selectedFiles.update((current) => [...current, ...files]);
    }
    input.value = '';
  }

  removeFile(index: number): void {
    this.selectedFiles.update((current) => current.filter((_, i) => i !== index));
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  cancel(): void {
    this.router.navigate(['/it-support']);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CreateItTicketPayload = {
      title: raw.title.trim(),
      company: raw.company!,
      categoryId: raw.categoryId!,
      priority: raw.priority,
      description: raw.description.trim(),
      neededBy: raw.neededBy ? formatDateOnly(raw.neededBy) : undefined,
    };
    const files = this.selectedFiles();

    this.submitting.set(true);
    this.itSupportService
      .createTicket(payload)
      .pipe(
        switchMap((ticket) =>
          files.length
            ? this.itSupportService.uploadAttachments(ticket.id, files).pipe(
                catchError(() => {
                  this.messageService.add({
                    severity: 'warn',
                    summary: 'Ticket submitted without attachments',
                    detail: 'The files could not be uploaded. Open the ticket to try again.',
                    life: 6000,
                  });
                  return of(ticket);
                }),
              )
            : of(ticket),
        ),
        take(1),
      )
      .subscribe({
        next: (ticket) => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'success',
            summary: `Ticket #${ticket.ticketNumber} submitted`,
            detail: `Assigned to ${assigneeNames(ticket.assignees)}.`,
            life: 5000,
          });
          this.router.navigate(['/it-support', ticket.id]);
        },
        error: () => this.submitting.set(false),
      });
  }
}
