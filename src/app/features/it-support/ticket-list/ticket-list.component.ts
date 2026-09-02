import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { AuthService } from '../../../auth/auth.service';
import {
  assigneeNames,
  IT_COMPANIES,
  IT_TICKET_PRIORITIES,
  IT_TICKET_STATUSES,
  ItCompany,
  itPriorityLabel,
  itPrioritySeverity,
  itStatusLabel,
  itStatusSeverity,
  ItTicket,
  ItTicketPriority,
  ItTicketStatus,
} from '../../../models/it-ticket.model';
import { ItSupportService } from '../../../services/it-support.service';
import { UserService } from '../../../services/user.service';

type TicketScope = 'all' | 'mine';

@Component({
  selector: 'app-ticket-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    Button,
    InputText,
    ProgressSpinner,
    Select,
    SelectButton,
    TableModule,
    Tag,
  ],
  template: `
    <div class="mx-auto max-w-7xl px-6 py-8">
      <div class="mb-4">
        <a routerLink="/" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >← Home</a
        >
      </div>

      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">IT Support</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tickets submitted here are the only accepted way to request IT work.
          </p>
        </div>
        <p-button label="New Ticket" icon="pi pi-plus" (onClick)="newTicket()" />
      </header>

      <div class="mb-4 flex flex-wrap items-center gap-3">
        <input
          pInputText
          type="search"
          placeholder="Search by title"
          aria-label="Search tickets by title"
          class="w-64"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
        <p-select
          [ngModel]="statusFilter()"
          (ngModelChange)="statusFilter.set($event)"
          [options]="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All statuses"
          [showClear]="true"
          ariaLabel="Filter by status"
        />
        <p-select
          [ngModel]="categoryFilter()"
          (ngModelChange)="categoryFilter.set($event)"
          [options]="categories()"
          optionLabel="name"
          optionValue="id"
          placeholder="All categories"
          [showClear]="true"
          ariaLabel="Filter by category"
        />
        <p-select
          [ngModel]="companyFilter()"
          (ngModelChange)="companyFilter.set($event)"
          [options]="companyOptions"
          placeholder="All companies"
          [showClear]="true"
          ariaLabel="Filter by company"
        />
        <p-select
          [ngModel]="priorityFilter()"
          (ngModelChange)="priorityFilter.set($event)"
          [options]="priorityOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All priorities"
          [showClear]="true"
          ariaLabel="Filter by priority"
        />
        <p-selectbutton
          [ngModel]="scope()"
          (ngModelChange)="scope.set($event)"
          [options]="scopeOptions"
          optionLabel="label"
          optionValue="value"
          [allowEmpty]="false"
          ariaLabel="Ticket scope"
        />
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16">
          <p-progressspinner strokeWidth="4" [style]="{ width: '2rem', height: '2rem' }" />
        </div>
      } @else {
        <p class="mb-2 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
          {{ filteredTickets().length }} of {{ tickets().length }} tickets
        </p>
        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <p-table
            [value]="filteredTickets()"
            [paginator]="filteredTickets().length > 20"
            [rows]="20"
            [rowHover]="true"
            sortField="createdAt"
            [sortOrder]="-1"
            styleClass="p-datatable-sm"
            [tableStyle]="{ 'min-width': '72rem' }"
          >
            <ng-template #header>
              <tr>
                <th pSortableColumn="ticketNumber" class="w-16">
                  # <p-sortIcon field="ticketNumber" />
                </th>
                <th pSortableColumn="title">Title <p-sortIcon field="title" /></th>
                <th pSortableColumn="company">Company <p-sortIcon field="company" /></th>
                <th pSortableColumn="category.name">
                  Category <p-sortIcon field="category.name" />
                </th>
                <th pSortableColumn="priority">Priority <p-sortIcon field="priority" /></th>
                <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
                <th pSortableColumn="requester.displayName">
                  Requester <p-sortIcon field="requester.displayName" />
                </th>
                <th>Assigned To</th>
                <th pSortableColumn="createdAt">Created <p-sortIcon field="createdAt" /></th>
              </tr>
            </ng-template>
            <ng-template #body let-ticket>
              <tr
                class="cursor-pointer"
                tabindex="0"
                (click)="openTicket(ticket)"
                (keydown.enter)="openTicket(ticket)"
                [attr.aria-label]="'Open ticket #' + ticket.ticketNumber + ': ' + ticket.title"
              >
                <td class="text-gray-500 dark:text-gray-400">#{{ ticket.ticketNumber }}</td>
                <td class="font-medium">{{ ticket.title }}</td>
                <td>{{ ticket.company }}</td>
                <td>{{ ticket.category?.name || '—' }}</td>
                <td>
                  <p-tag
                    [value]="priorityLabel(ticket.priority)"
                    [severity]="prioritySeverity(ticket.priority)"
                    [rounded]="true"
                  />
                </td>
                <td>
                  <p-tag
                    [value]="statusLabel(ticket.status)"
                    [severity]="statusSeverity(ticket.status)"
                  />
                </td>
                <td>{{ ticket.requester?.displayName || '—' }}</td>
                <td>{{ assigneeNames(ticket.assignees) }}</td>
                <td>{{ ticket.createdAt | date: 'mediumDate' }}</td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td colspan="9" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  @if (tickets().length === 0) {
                    No tickets yet. Submit the first one with “New Ticket”.
                  } @else {
                    No tickets match the current filters.
                  }
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      }
    </div>
  `,
})
export class TicketListComponent implements OnInit {
  private readonly itSupportService = inject(ItSupportService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly tickets = this.itSupportService.tickets;
  readonly categories = this.itSupportService.categories;
  readonly loading = this.itSupportService.loading;

  readonly search = signal('');
  readonly statusFilter = signal<ItTicketStatus | null>(null);
  readonly categoryFilter = signal<string | null>(null);
  readonly companyFilter = signal<ItCompany | null>(null);
  readonly priorityFilter = signal<ItTicketPriority | null>(null);
  readonly scope = signal<TicketScope>('all');

  readonly statusOptions = [...IT_TICKET_STATUSES];
  readonly priorityOptions = [...IT_TICKET_PRIORITIES];
  readonly companyOptions = [...IT_COMPANIES];
  readonly scopeOptions: { label: string; value: TicketScope }[] = [
    { label: 'All tickets', value: 'all' },
    { label: 'My tickets', value: 'mine' },
  ];

  readonly statusLabel = itStatusLabel;
  readonly statusSeverity = itStatusSeverity;
  readonly priorityLabel = itPriorityLabel;
  readonly prioritySeverity = itPrioritySeverity;
  readonly assigneeNames = assigneeNames;

  readonly filteredTickets = computed(() => {
    const search = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const categoryId = this.categoryFilter();
    const company = this.companyFilter();
    const priority = this.priorityFilter();
    const mineOnly = this.scope() === 'mine';
    const me = this.userService.currentUser()?.id;

    return this.tickets().filter(
      (ticket) =>
        (!search || ticket.title.toLowerCase().includes(search)) &&
        (!status || ticket.status === status) &&
        (!categoryId || ticket.categoryId === categoryId) &&
        (!company || ticket.company === company) &&
        (!priority || ticket.priority === priority) &&
        (!mineOnly ||
          !me ||
          ticket.requesterId === me ||
          ticket.assignees?.some((assignee) => assignee.id === me)),
    );
  });

  constructor() {
    effect(() => {
      const subPageId = this.auth.teamsSubPageId();
      if (!subPageId) return;
      untracked(() => {
        this.auth.consumeTeamsSubPageId();
        this.router.navigate(['/it-support', subPageId]);
      });
    });
  }

  ngOnInit(): void {
    const subEntityId = this.route.snapshot.queryParamMap.get('subEntityId');
    if (subEntityId) {
      this.router.navigate(['/it-support', subEntityId], { replaceUrl: true });
      return;
    }
    this.itSupportService.loadTickets();
    this.itSupportService.loadCategories();
  }

  newTicket(): void {
    this.router.navigate(['/it-support/new']);
  }

  openTicket(ticket: ItTicket): void {
    this.router.navigate(['/it-support', ticket.id]);
  }
}
