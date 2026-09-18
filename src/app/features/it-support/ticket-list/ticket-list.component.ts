import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
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
  itPriorityLabel,
  itPrioritySeverity,
  itStatusLabel,
  itStatusSeverity,
  ItTicket,
} from '../../../models/it-ticket.model';
import { ItSupportService } from '../../../services/it-support.service';
import { UserService } from '../../../services/user.service';
import {
  TICKET_LIST_COLUMNS,
  TicketListStateService,
  TicketScope,
  UNASSIGNED_RESPONSIBLE,
} from './ticket-list-state.service';

@Component({
  selector: 'app-ticket-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    Button,
    InputText,
    MultiSelect,
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
          [ngModel]="filters().search"
          (ngModelChange)="state.patchFilters({ search: $event })"
        />
        <p-select
          [ngModel]="filters().status"
          (ngModelChange)="state.patchFilters({ status: $event })"
          [options]="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All statuses"
          [showClear]="true"
          ariaLabel="Filter by status"
        />
        <p-select
          [ngModel]="filters().categoryId"
          (ngModelChange)="state.patchFilters({ categoryId: $event })"
          [options]="categories()"
          optionLabel="name"
          optionValue="id"
          placeholder="All categories"
          [showClear]="true"
          ariaLabel="Filter by category"
        />
        <p-select
          [ngModel]="filters().company"
          (ngModelChange)="state.patchFilters({ company: $event })"
          [options]="companyOptions"
          placeholder="All companies"
          [showClear]="true"
          ariaLabel="Filter by company"
        />
        <p-select
          [ngModel]="filters().priority"
          (ngModelChange)="state.patchFilters({ priority: $event })"
          [options]="priorityOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All priorities"
          [showClear]="true"
          ariaLabel="Filter by priority"
        />
        <p-select
          [ngModel]="filters().responsiblePersonId"
          (ngModelChange)="state.patchFilters({ responsiblePersonId: $event })"
          [options]="responsibleOptions()"
          optionLabel="label"
          optionValue="value"
          placeholder="All responsible people"
          [showClear]="true"
          [filter]="true"
          filterBy="label"
          ariaLabel="Filter by responsible person"
        />
        <p-selectbutton
          [ngModel]="filters().scope"
          (ngModelChange)="state.patchFilters({ scope: $event })"
          [options]="scopeOptions"
          optionLabel="label"
          optionValue="value"
          [allowEmpty]="false"
          ariaLabel="Ticket scope"
        />
        @if (state.hasActiveFilters()) {
          <p-button
            label="Clear filters"
            icon="pi pi-filter-slash"
            severity="secondary"
            [text]="true"
            size="small"
            (onClick)="state.clearFilters()"
          />
        }
      </div>

      @if (!ready()) {
        <div class="flex justify-center py-16">
          <p-progressspinner strokeWidth="4" [style]="{ width: '2rem', height: '2rem' }" />
        </div>
      } @else {
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
            {{ filteredTickets().length }} of {{ tickets().length }} tickets
          </p>
          <p-multiselect
            class="w-40"
            [ngModel]="state.columns()"
            (ngModelChange)="state.setColumns($event)"
            [options]="columnOptions"
            optionLabel="label"
            optionValue="key"
            placeholder="Columns"
            selectedItemsLabel="Columns"
            [maxSelectedLabels]="0"
            [filter]="false"
            size="small"
            appendTo="body"
            scrollHeight="24rem"
            ariaLabel="Choose which columns to show"
          />
        </div>
        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <p-table
            [value]="filteredTickets()"
            [paginator]="filteredTickets().length > 20"
            [rows]="20"
            [rowHover]="true"
            [first]="state.table().first"
            (firstChange)="state.setFirst($event)"
            [sortField]="state.table().sortField"
            [sortOrder]="state.table().sortOrder"
            (onSort)="state.setSort($event.field, $event.order)"
            styleClass="p-datatable-sm"
            [tableStyle]="tableStyle()"
          >
            <ng-template #header>
              <tr>
                <th pSortableColumn="ticketNumber" class="w-16">
                  # <p-sortIcon field="ticketNumber" />
                </th>
                <th pSortableColumn="title">Title <p-sortIcon field="title" /></th>
                @if (shown().has('company')) {
                  <th pSortableColumn="company">Company <p-sortIcon field="company" /></th>
                }
                @if (shown().has('category')) {
                  <th pSortableColumn="category.name">
                    Category <p-sortIcon field="category.name" />
                  </th>
                }
                @if (shown().has('priority')) {
                  <th pSortableColumn="priority">Priority <p-sortIcon field="priority" /></th>
                }
                @if (shown().has('status')) {
                  <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
                }
                @if (shown().has('requester')) {
                  <th pSortableColumn="requester.displayName">
                    Requester <p-sortIcon field="requester.displayName" />
                  </th>
                }
                @if (shown().has('assignees')) {
                  <th>Assigned To</th>
                }
                @if (shown().has('responsible')) {
                  <th pSortableColumn="responsiblePerson.displayName">
                    Responsible <p-sortIcon field="responsiblePerson.displayName" />
                  </th>
                }
                @if (shown().has('neededBy')) {
                  <th pSortableColumn="neededBy">Needed By <p-sortIcon field="neededBy" /></th>
                }
                @if (shown().has('createdAt')) {
                  <th pSortableColumn="createdAt">Created <p-sortIcon field="createdAt" /></th>
                }
                @if (shown().has('updatedAt')) {
                  <th pSortableColumn="updatedAt">Last Updated <p-sortIcon field="updatedAt" /></th>
                }
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
                @if (shown().has('company')) {
                  <td>{{ ticket.company }}</td>
                }
                @if (shown().has('category')) {
                  <td>{{ ticket.category?.name || '—' }}</td>
                }
                @if (shown().has('priority')) {
                  <td>
                    <p-tag
                      [value]="priorityLabel(ticket.priority)"
                      [severity]="prioritySeverity(ticket.priority)"
                      [rounded]="true"
                    />
                  </td>
                }
                @if (shown().has('status')) {
                  <td>
                    <p-tag
                      [value]="statusLabel(ticket.status)"
                      [severity]="statusSeverity(ticket.status)"
                    />
                  </td>
                }
                @if (shown().has('requester')) {
                  <td>{{ ticket.requester?.displayName || '—' }}</td>
                }
                @if (shown().has('assignees')) {
                  <td>{{ assigneeNames(ticket.assignees) }}</td>
                }
                @if (shown().has('responsible')) {
                  <td>
                    @if (ticket.responsiblePerson) {
                      {{ ticket.responsiblePerson.displayName }}
                    } @else {
                      <span class="text-gray-500 dark:text-gray-400">Not assigned yet</span>
                    }
                  </td>
                }
                @if (shown().has('neededBy')) {
                  <td>
                    @if (ticket.neededBy) {
                      {{ ticket.neededBy | date: 'mediumDate' }}
                    } @else {
                      <span class="text-gray-500 dark:text-gray-400">—</span>
                    }
                  </td>
                }
                @if (shown().has('createdAt')) {
                  <td>{{ ticket.createdAt | date: 'mediumDate' }}</td>
                }
                @if (shown().has('updatedAt')) {
                  <td>{{ ticket.updatedAt | date: 'MMM d, y, h:mm a' }}</td>
                }
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td
                  [attr.colspan]="columnCount()"
                  class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                >
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

  protected readonly state = inject(TicketListStateService);
  readonly filters = this.state.filters;

  readonly statusOptions = [...IT_TICKET_STATUSES];
  readonly priorityOptions = [...IT_TICKET_PRIORITIES];
  readonly companyOptions = [...IT_COMPANIES];
  readonly scopeOptions: { label: string; value: TicketScope }[] = [
    { label: 'All tickets', value: 'all' },
    { label: 'My tickets', value: 'mine' },
  ];
  readonly columnOptions = [...TICKET_LIST_COLUMNS];

  readonly ready = computed(() => !this.loading() && this.state.savedLoaded());
  readonly shown = computed(() => new Set(this.state.columns()));
  readonly columnCount = computed(() => this.state.columns().length + 2);
  readonly tableStyle = computed(() => ({
    'min-width': `${18 + this.state.columns().length * 8}rem`,
  }));

  readonly statusLabel = itStatusLabel;
  readonly statusSeverity = itStatusSeverity;
  readonly priorityLabel = itPriorityLabel;
  readonly prioritySeverity = itPrioritySeverity;
  readonly assigneeNames = assigneeNames;

  readonly responsibleOptions = computed(() => {
    const people = new Map<string, string>();
    for (const ticket of this.tickets()) {
      if (ticket.responsiblePerson) {
        people.set(ticket.responsiblePerson.id, ticket.responsiblePerson.displayName);
      }
    }
    const options = [...people]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: UNASSIGNED_RESPONSIBLE, label: 'Not assigned yet' }, ...options];
  });

  readonly filteredTickets = computed(() => {
    const filters = this.filters();
    const search = filters.search.trim().toLowerCase();
    const mineOnly = filters.scope === 'mine';
    const me = this.userService.currentUser()?.id;

    return this.tickets().filter(
      (ticket) =>
        (!search || ticket.title.toLowerCase().includes(search)) &&
        (!filters.status || ticket.status === filters.status) &&
        (!filters.categoryId || ticket.categoryId === filters.categoryId) &&
        (!filters.company || ticket.company === filters.company) &&
        (!filters.priority || ticket.priority === filters.priority) &&
        this.matchesResponsible(ticket, filters.responsiblePersonId) &&
        (!mineOnly ||
          !me ||
          ticket.requesterId === me ||
          ticket.responsiblePersonId === me ||
          ticket.assignees?.some((assignee) => assignee.id === me)),
    );
  });

  constructor() {
    effect(() => {
      if (this.loading()) return;
      const filters = this.filters();
      const categories = this.categories();
      const responsibleOptions = this.responsibleOptions();
      const hasTickets = this.tickets().length > 0;

      untracked(() => {
        if (
          filters.categoryId &&
          categories.length > 0 &&
          !categories.some((category) => category.id === filters.categoryId)
        ) {
          this.state.patchFilters({ categoryId: null });
        }
        if (
          filters.responsiblePersonId &&
          hasTickets &&
          !responsibleOptions.some((option) => option.value === filters.responsiblePersonId)
        ) {
          this.state.patchFilters({ responsiblePersonId: null });
        }
      });
    });

    effect(() => {
      const subPageId = this.auth.teamsSubPageId();
      if (!subPageId) return;
      untracked(() => {
        this.auth.consumeTeamsSubPageId();
        this.openDeepLink(subPageId, false);
      });
    });
  }

  ngOnInit(): void {
    const subEntityId = this.route.snapshot.queryParamMap.get('subEntityId');
    if (subEntityId) {
      this.openDeepLink(subEntityId, true);
      return;
    }
    this.state.loadSaved();
    this.itSupportService.loadTickets();
    this.itSupportService.loadCategories();
  }

  /**
   * Teams deep links carry `<ticketId>` or `<ticketId>_<commentId>`.
   */
  private openDeepLink(subEntityId: string, replaceUrl: boolean): void {
    const [ticketId, commentId] = subEntityId.split('_');
    if (!ticketId) return;
    this.router.navigate(['/it-support', ticketId], {
      replaceUrl,
      queryParams: commentId ? { comment: commentId } : {},
    });
  }

  newTicket(): void {
    this.router.navigate(['/it-support/new']);
  }

  openTicket(ticket: ItTicket): void {
    this.router.navigate(['/it-support', ticket.id]);
  }

  private matchesResponsible(ticket: ItTicket, responsiblePersonId: string | null): boolean {
    if (!responsiblePersonId) return true;
    if (responsiblePersonId === UNASSIGNED_RESPONSIBLE) return !ticket.responsiblePersonId;
    return ticket.responsiblePersonId === responsiblePersonId;
  }
}
