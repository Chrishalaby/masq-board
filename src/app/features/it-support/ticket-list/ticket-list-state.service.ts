import { computed, effect, Injectable, signal } from '@angular/core';
import {
  IT_COMPANIES,
  IT_TICKET_PRIORITIES,
  IT_TICKET_STATUSES,
  ItCompany,
  ItTicketPriority,
  ItTicketStatus,
} from '../../../models/it-ticket.model';

export type TicketScope = 'all' | 'mine';

export const UNASSIGNED_RESPONSIBLE = 'unassigned';

export interface TicketListFilters {
  readonly search: string;
  readonly status: ItTicketStatus | null;
  readonly categoryId: string | null;
  readonly company: ItCompany | null;
  readonly priority: ItTicketPriority | null;
  readonly responsiblePersonId: string | null;
  readonly scope: TicketScope;
}

export interface TicketListTableState {
  readonly first: number;
  readonly sortField: string;
  readonly sortOrder: number;
}

interface StoredState {
  readonly filters?: Partial<Record<keyof TicketListFilters, unknown>>;
  readonly table?: Partial<Record<keyof TicketListTableState, unknown>>;
}

const STORAGE_KEY = 'masq.itSupport.ticketList.v1';

const SORTABLE_FIELDS = [
  'ticketNumber',
  'title',
  'company',
  'category.name',
  'priority',
  'status',
  'requester.displayName',
  'createdAt',
];

const DEFAULT_FILTERS: TicketListFilters = {
  search: '',
  status: null,
  categoryId: null,
  company: null,
  priority: null,
  responsiblePersonId: null,
  scope: 'all',
};

const DEFAULT_TABLE: TicketListTableState = {
  first: 0,
  sortField: 'createdAt',
  sortOrder: -1,
};

@Injectable({ providedIn: 'root' })
export class TicketListStateService {
  private readonly filtersSignal = signal<TicketListFilters>(DEFAULT_FILTERS);
  private readonly tableSignal = signal<TicketListTableState>(DEFAULT_TABLE);

  readonly filters = this.filtersSignal.asReadonly();
  readonly table = this.tableSignal.asReadonly();

  readonly hasActiveFilters = computed(() => {
    const filters = this.filtersSignal();
    return (
      filters.search.trim().length > 0 ||
      filters.status !== null ||
      filters.categoryId !== null ||
      filters.company !== null ||
      filters.priority !== null ||
      filters.responsiblePersonId !== null ||
      filters.scope !== 'all'
    );
  });

  constructor() {
    this.restore();
    effect(() => this.persist({ filters: this.filtersSignal(), table: this.tableSignal() }));
  }

  patchFilters(patch: Partial<TicketListFilters>): void {
    this.filtersSignal.update((current) => ({ ...current, ...patch }));
    this.setFirst(0);
  }

  clearFilters(): void {
    this.filtersSignal.set(DEFAULT_FILTERS);
    this.setFirst(0);
  }

  setFirst(first: number): void {
    if (this.tableSignal().first === first) return;
    this.tableSignal.update((current) => ({ ...current, first }));
  }

  setSort(sortField: string, sortOrder: number): void {
    const current = this.tableSignal();
    if (current.sortField === sortField && current.sortOrder === sortOrder) return;
    this.tableSignal.set({ first: 0, sortField, sortOrder });
  }

  private restore(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredState;
      this.filtersSignal.set(this.sanitizeFilters(stored.filters ?? {}));
      this.tableSignal.set(this.sanitizeTable(stored.table ?? {}));
    } catch {
      this.filtersSignal.set(DEFAULT_FILTERS);
      this.tableSignal.set(DEFAULT_TABLE);
    }
  }

  private persist(state: { filters: TicketListFilters; table: TicketListTableState }): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      return;
    }
  }

  private sanitizeFilters(raw: NonNullable<StoredState['filters']>): TicketListFilters {
    return {
      search: typeof raw.search === 'string' ? raw.search : '',
      status: this.pick(
        raw.status,
        IT_TICKET_STATUSES.map((option) => option.value),
      ),
      categoryId: this.nonEmptyString(raw.categoryId),
      company: this.pick(raw.company, IT_COMPANIES),
      priority: this.pick(
        raw.priority,
        IT_TICKET_PRIORITIES.map((option) => option.value),
      ),
      responsiblePersonId: this.nonEmptyString(raw.responsiblePersonId),
      scope: raw.scope === 'mine' ? 'mine' : 'all',
    };
  }

  private sanitizeTable(raw: NonNullable<StoredState['table']>): TicketListTableState {
    const first = Number(raw.first);
    return {
      first: Number.isInteger(first) && first > 0 ? first : 0,
      sortField: this.pick(raw.sortField, SORTABLE_FIELDS) ?? DEFAULT_TABLE.sortField,
      sortOrder: raw.sortOrder === 1 ? 1 : -1,
    };
  }

  private pick<T extends string>(value: unknown, allowed: readonly T[]): T | null {
    return allowed.find((candidate) => candidate === value) ?? null;
  }

  private nonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }
}
