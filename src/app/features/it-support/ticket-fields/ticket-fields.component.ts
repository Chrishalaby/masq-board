import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import {
  assigneeNames,
  IT_COMPANIES,
  IT_TICKET_PRIORITIES,
  ItCategory,
  ItCompany,
  ItTicketPriority,
} from '../../../models/it-ticket.model';

export type ItTicketFieldsForm = FormGroup<{
  title: FormControl<string>;
  company: FormControl<ItCompany | null>;
  categoryId: FormControl<string | null>;
  priority: FormControl<ItTicketPriority>;
  description: FormControl<string>;
  neededBy: FormControl<Date | null>;
}>;

export function createItTicketFieldsForm(): ItTicketFieldsForm {
  return new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    company: new FormControl<ItCompany | null>(null, Validators.required),
    categoryId: new FormControl<string | null>(null, Validators.required),
    priority: new FormControl<ItTicketPriority>('normal', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    neededBy: new FormControl<Date | null>(null),
  });
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

@Component({
  selector: 'app-ticket-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputText, Select, DatePicker, Textarea],
  template: `
    <div [formGroup]="form()" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label for="ticketTitle" class="text-sm font-medium">Title *</label>
        <input
          pInputText
          id="ticketTitle"
          formControlName="title"
          placeholder="Short summary of the request"
          class="w-full"
        />
        @if (showError('title')) {
          <span class="text-xs text-red-600 dark:text-red-400">Title is required.</span>
        }
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label for="ticketCompany" class="text-sm font-medium">Company *</label>
          <p-select
            inputId="ticketCompany"
            formControlName="company"
            [options]="companyOptions"
            placeholder="Select company"
            appendTo="body"
            [fluid]="true"
          />
          @if (showError('company')) {
            <span class="text-xs text-red-600 dark:text-red-400">Company is required.</span>
          }
        </div>

        <div class="flex flex-col gap-1">
          <label for="ticketCategory" class="text-sm font-medium">Category *</label>
          <p-select
            inputId="ticketCategory"
            formControlName="categoryId"
            [options]="categories()"
            optionLabel="name"
            optionValue="id"
            placeholder="Select category"
            appendTo="body"
            [fluid]="true"
          />
          @if (showError('categoryId')) {
            <span class="text-xs text-red-600 dark:text-red-400">Category is required.</span>
          } @else if (selectedCategory(); as category) {
            <span class="text-xs text-gray-500 dark:text-gray-400">
              Will be assigned to: {{ assigneeNames(category.assignees) }}
            </span>
          }
        </div>

        <div class="flex flex-col gap-1">
          <label for="ticketPriority" class="text-sm font-medium">Priority</label>
          <p-select
            inputId="ticketPriority"
            formControlName="priority"
            [options]="priorityOptions"
            optionLabel="label"
            optionValue="value"
            appendTo="body"
            [fluid]="true"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="ticketNeededBy" class="text-sm font-medium">Needed By</label>
          <p-datepicker
            inputId="ticketNeededBy"
            formControlName="neededBy"
            dateFormat="yy-mm-dd"
            [showIcon]="true"
            [showClear]="true"
            [minDate]="today"
            appendTo="body"
            [fluid]="true"
          />
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label for="ticketDescription" class="text-sm font-medium">Description *</label>
        <textarea
          pTextarea
          id="ticketDescription"
          formControlName="description"
          rows="6"
          placeholder="Describe the issue or request in detail"
          class="w-full"
        ></textarea>
        @if (showError('description')) {
          <span class="text-xs text-red-600 dark:text-red-400">Description is required.</span>
        }
      </div>
    </div>
  `,
})
export class TicketFieldsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly form = input.required<ItTicketFieldsForm>();
  readonly categories = input<ItCategory[]>([]);

  readonly companyOptions = [...IT_COMPANIES];
  readonly priorityOptions = [...IT_TICKET_PRIORITIES];
  readonly today = new Date();
  readonly assigneeNames = assigneeNames;

  private readonly categoryId = signal<string | null>(null);

  readonly selectedCategory = computed(
    () => this.categories().find((c) => c.id === this.categoryId()) ?? null,
  );

  ngOnInit(): void {
    const control = this.form().controls.categoryId;
    this.categoryId.set(control.value);
    control.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.categoryId.set(value));
  }

  showError(name: keyof ItTicketFieldsForm['controls']): boolean {
    const control = this.form().controls[name];
    return control.invalid && (control.touched || control.dirty);
  }
}
