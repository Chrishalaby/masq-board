import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { timeout } from 'rxjs';
import {
  IT_COMPANIES,
  IT_TICKET_PRIORITIES,
  IT_TICKET_STATUSES,
  ItCompany,
  ItTicketPriority,
  ItTicketStatus,
} from '../../../models/it-ticket.model';
import { UserPreferencesService } from '../../../services/user-preferences.service';

export type TicketScope = 'all' | 'mine';

export const UNASSIGNED_RESPONSIBLE = 'unassigned';

export type TicketColumnKey =
  | 'company'
  | 'category'
  | 'priority'
  | 'status'
  | 'requester'
  | 'assignees'
  | 'responsible'
  | 'neededBy'
  | 'createdAt'
  | 'updatedAt';

export interface TicketListColumn {
  readonly key: TicketColumnKey;
  readonly label: string;
  readonly defaultVisible: boolean;
  readonly sortField: string | null;
}

export const TICKET_LIST_COLUMNS: readonly TicketListColumn[] = [
  { key: 'company', label: 'Company', defaultVisible: true, sortField: 'company' },
  { key: 'category', label: 'Category', defaultVisible: true, sortField: 'category.name' },
  { key: 'priority', label: 'Priority', defaultVisible: true, sortField: 'priority' },
  { key: 'status', label: 'Status', defaultVisible: true, sortField: 'status' },
  {
    key: 'requester',
    label: 'Requester',
    defaultVisible: true,
    sortField: 'requester.displayName',
  },
  { key: 'assignees', label: 'Assigned To', defaultVisible: true, sortField: null },
  {
    key: 'responsible',
    label: 'Responsible',
    defaultVisible: true,
    sortField: 'responsiblePerson.displayName',
  },
  { key: 'neededBy', label: 'Needed By', defaultVisible: false, sortField: 'neededBy' },
  { key: 'createdAt', label: 'Created', defaultVisible: true, sortField: 'createdAt' },
  { key: 'updatedAt', label: 'Last Updated', defaultVisible: false, sortField: 'updatedAt' },
];

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

type RawFilters = Partial<Record<keyof TicketListFilters, unknown>>;
type RawTable = Partial<Record<keyof TicketListTableState, unknown>>;

interface StoredState {
  readonly filters?: RawFilters;
  readonly table?: RawTable;
  readonly columns?: unknown;
}

interface SavedView {
  readonly filters: Omit<TicketListFilters, 'search'>;
  readonly sort: { readonly field: string; readonly order: number };
  readonly columns: readonly TicketColumnKey[];
}

interface RawSavedView {
  readonly filters?: RawFilters;
  readonly sort?: { readonly field?: unknown; readonly order?: unknown };
  readonly columns?: unknown;
}

const STORAGE_KEY = 'masq.itSupport.ticketList.v1';
const PREFERENCE_KEY = 'itSupport.ticketList';
const SAVE_DELAY_MS = 600;
const LOAD_TIMEOUT_MS = 6000;

const SORTABLE_FIELDS = [
  'ticketNumber',
  'title',
  ...TICKET_LIST_COLUMNS.flatMap((column) => (column.sortField ? [column.sortField] : [])),
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

const DEFAULT_COLUMNS: TicketColumnKey[] = TICKET_LIST_COLUMNS.filter(
  (column) => column.defaultVisible,
).map((column) => column.key);

@Injectable({ providedIn: 'root' })
export class TicketListStateService {
  private readonly preferences = inject(UserPreferencesService);

  private readonly filtersSignal = signal<TicketListFilters>(DEFAULT_FILTERS);
  private readonly tableSignal = signal<TicketListTableState>(DEFAULT_TABLE);
  private readonly columnsSignal = signal<TicketColumnKey[]>(DEFAULT_COLUMNS);
  private readonly savedLoadedSignal = signal(false);

  private readonly restoredFromSession: boolean;
  private loadRequested = false;
  private touched = false;
  private committedView: string;
  private lastSavedView: string | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  readonly filters = this.filtersSignal.asReadonly();
  readonly table = this.tableSignal.asReadonly();
  readonly columns = this.columnsSignal.asReadonly();
  readonly savedLoaded = this.savedLoadedSignal.asReadonly();

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
    this.restoredFromSession = this.restore();
    this.committedView = this.serializeView();
    effect(() =>
      this.persist({
        filters: this.filtersSignal(),
        table: this.tableSignal(),
        columns: this.columnsSignal(),
      }),
    );
  }

  loadSaved(): void {
    if (this.loadRequested) return;
    this.loadRequested = true;

    if (this.restoredFromSession) {
      this.savedLoadedSignal.set(true);
      return;
    }

    this.preferences
      .get(PREFERENCE_KEY)
      .pipe(timeout(LOAD_TIMEOUT_MS))
      .subscribe({
        next: (value) => {
          if (!this.touched) this.applySaved(value);
          this.savedLoadedSignal.set(true);
        },
        error: () => this.savedLoadedSignal.set(true),
      });
  }

  patchFilters(patch: Partial<TicketListFilters>): void {
    this.filtersSignal.update((current) => ({ ...current, ...patch }));
    this.setFirst(0);
    this.commit();
  }

  clearFilters(): void {
    this.filtersSignal.set(DEFAULT_FILTERS);
    this.setFirst(0);
    this.commit();
  }

  setFirst(first: number): void {
    if (this.tableSignal().first === first) return;
    this.tableSignal.update((current) => ({ ...current, first }));
  }

  setSort(sortField: string, sortOrder: number): void {
    const current = this.tableSignal();
    if (current.sortField === sortField && current.sortOrder === sortOrder) return;
    this.tableSignal.set({ first: 0, sortField, sortOrder });
    this.commit();
  }

  setColumns(keys: readonly string[]): void {
    const columns = this.sanitizeColumns(keys);
    this.columnsSignal.set(columns);

    const sortField = this.tableSignal().sortField;
    const sortedColumnHidden = TICKET_LIST_COLUMNS.some(
      (column) => column.sortField === sortField && !columns.includes(column.key),
    );
    if (sortedColumnHidden && sortField !== DEFAULT_TABLE.sortField) {
      this.tableSignal.set(DEFAULT_TABLE);
    }
    this.commit();
  }

  private commit(): void {
    const view = this.serializeView();
    if (view === this.committedView) return;
    this.committedView = view;
    this.touched = true;

    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, SAVE_DELAY_MS);
  }

  private save(): void {
    const view = this.committedView;
    if (view === this.lastSavedView) return;
    this.preferences.set(PREFERENCE_KEY, this.currentView()).subscribe({
      next: () => (this.lastSavedView = view),
      error: () => undefined,
    });
  }

  private applySaved(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    const saved = value as RawSavedView;
    const search = this.filtersSignal().search;

    this.filtersSignal.set({ ...this.sanitizeFilters(saved.filters ?? {}), search });
    this.tableSignal.set(
      this.sanitizeTable({ sortField: saved.sort?.field, sortOrder: saved.sort?.order }),
    );
    this.columnsSignal.set(this.sanitizeColumns(saved.columns));

    this.committedView = this.serializeView();
    this.lastSavedView = this.committedView;
  }

  private currentView(): SavedView {
    const filters = this.filtersSignal();
    const table = this.tableSignal();
    return {
      filters: {
        status: filters.status,
        categoryId: filters.categoryId,
        company: filters.company,
        priority: filters.priority,
        responsiblePersonId: filters.responsiblePersonId,
        scope: filters.scope,
      },
      sort: { field: table.sortField, order: table.sortOrder },
      columns: this.columnsSignal(),
    };
  }

  private serializeView(): string {
    return JSON.stringify(this.currentView());
  }

  private restore(): boolean {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const stored = JSON.parse(raw) as StoredState;
      this.filtersSignal.set(this.sanitizeFilters(stored.filters ?? {}));
      this.tableSignal.set(this.sanitizeTable(stored.table ?? {}));
      this.columnsSignal.set(this.sanitizeColumns(stored.columns));
      return true;
    } catch {
      this.filtersSignal.set(DEFAULT_FILTERS);
      this.tableSignal.set(DEFAULT_TABLE);
      this.columnsSignal.set(DEFAULT_COLUMNS);
      return false;
    }
  }

  private persist(state: {
    filters: TicketListFilters;
    table: TicketListTableState;
    columns: TicketColumnKey[];
  }): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      return;
    }
  }

  private sanitizeFilters(raw: RawFilters): TicketListFilters {
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

  private sanitizeTable(raw: RawTable): TicketListTableState {
    const first = Number(raw.first);
    return {
      first: Number.isInteger(first) && first > 0 ? first : 0,
      sortField: this.pick(raw.sortField, SORTABLE_FIELDS) ?? DEFAULT_TABLE.sortField,
      sortOrder: raw.sortOrder === 1 ? 1 : -1,
    };
  }

  private sanitizeColumns(raw: unknown): TicketColumnKey[] {
    if (!Array.isArray(raw)) return DEFAULT_COLUMNS;
    return TICKET_LIST_COLUMNS.filter((column) => raw.includes(column.key)).map(
      (column) => column.key,
    );
  }

  private pick<T extends string>(value: unknown, allowed: readonly T[]): T | null {
    return allowed.find((candidate) => candidate === value) ?? null;
  }

  private nonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }
}
