import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Textarea } from 'primeng/textarea';
import { User } from '../../models/user.model';

const MENTION_TOKEN = /(?:^|[\s([])@([^\s@]{0,40})$/;
const MAX_MATCHES = 8;

let instanceCount = 0;

@Component({
  selector: 'app-mention-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Textarea],
  template: `
    <div class="relative">
      <textarea
        #input
        pTextarea
        [id]="inputId()"
        [rows]="rows()"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="disabled()"
        class="w-full"
        role="combobox"
        aria-autocomplete="list"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-controls]="listId"
        [attr.aria-describedby]="hintId"
        [attr.aria-activedescendant]="isOpen() ? optionId(activeIndex()) : null"
        (input)="onInput()"
        (click)="onInput()"
        (keydown)="onKeydown($event)"
        (blur)="close()"
      ></textarea>

      <p [id]="hintId" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Type &#64; to mention someone.
      </p>

      @if (isOpen() && matches().length > 0) {
        <ul
          [id]="listId"
          role="listbox"
          aria-label="People you can mention"
          class="absolute left-0 top-full z-30 mt-1 max-h-56 w-full max-w-sm overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          @for (user of matches(); track user.id; let i = $index) {
            <li
              [id]="optionId(i)"
              role="option"
              [attr.aria-selected]="i === activeIndex()"
              class="cursor-pointer px-3 py-2 text-sm"
              [class]="
                i === activeIndex()
                  ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100'
                  : 'text-gray-800 dark:text-gray-200'
              "
              (mousedown)="onOptionMousedown($event, user)"
              (mouseenter)="activeIndex.set(i)"
            >
              <span class="block font-medium">{{ user.displayName }}</span>
              <span class="block text-xs text-gray-500 dark:text-gray-400">{{ user.email }}</span>
            </li>
          }
        </ul>
      }

      <span class="sr-only" role="status" aria-live="polite">{{ liveMessage() }}</span>
    </div>
  `,
})
export class MentionTextareaComponent {
  private readonly inputRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('input');

  readonly users = input<User[]>([]);
  readonly value = input('');
  readonly rows = input(3);
  readonly placeholder = input('');
  readonly inputId = input('mentionTextarea');
  readonly disabled = input(false);

  readonly valueChange = output<string>();
  readonly mentionsChange = output<User[]>();
  readonly submitShortcut = output<void>();

  private readonly uid = ++instanceCount;
  protected readonly listId = `mentionList${this.uid}`;
  protected readonly hintId = `mentionHint${this.uid}`;

  protected readonly isOpen = signal(false);
  protected readonly activeIndex = signal(0);
  private readonly query = signal('');
  private readonly tokenStart = signal(0);
  private readonly selected = signal<User[]>([]);

  protected readonly matches = computed(() => {
    if (!this.isOpen()) return [];
    const query = this.query().toLowerCase();
    const pool = this.users().filter((user) => user.isActive !== false);
    const filtered = query
      ? pool.filter(
          (user) =>
            user.displayName?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query),
        )
      : pool;
    return filtered.slice(0, MAX_MATCHES);
  });

  protected readonly liveMessage = computed(() => {
    if (!this.isOpen()) return '';
    const count = this.matches().length;
    if (count === 0) return 'No people match';
    return `${count} ${count === 1 ? 'person' : 'people'} available, use the arrow keys to choose`;
  });

  reset(): void {
    this.selected.set([]);
    this.close();
  }

  protected optionId(index: number): string {
    return `${this.listId}Option${index}`;
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected onInput(): void {
    const element = this.inputRef().nativeElement;
    this.emitValue(element.value);
    this.detectMention(element);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      this.submitShortcut.emit();
      return;
    }

    if (!this.isOpen() || this.matches().length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const total = this.matches().length;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex.update((index) => (index + step + total) % total);
      return;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      this.select(this.matches()[this.activeIndex()]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }

  protected onOptionMousedown(event: MouseEvent, user: User): void {
    event.preventDefault();
    this.select(user);
  }

  private select(user: User | undefined): void {
    if (!user) return;

    const element = this.inputRef().nativeElement;
    const caret = element.selectionStart ?? element.value.length;
    const start = this.tokenStart();
    const insert = `@${user.displayName} `;
    const next = element.value.slice(0, start) + insert + element.value.slice(caret);
    const nextCaret = start + insert.length;

    this.selected.update((current) =>
      current.some((candidate) => candidate.id === user.id) ? current : [...current, user],
    );

    element.value = next;
    element.setSelectionRange(nextCaret, nextCaret);
    element.focus();
    this.emitValue(next);
    this.close();
  }

  private detectMention(element: HTMLTextAreaElement): void {
    const caret = element.selectionStart ?? element.value.length;
    const match = MENTION_TOKEN.exec(element.value.slice(0, caret));

    if (!match) {
      this.close();
      return;
    }

    this.query.set(match[1]);
    this.tokenStart.set(caret - match[1].length - 1);
    this.activeIndex.set(0);
    this.isOpen.set(true);
  }

  private emitValue(text: string): void {
    this.valueChange.emit(text);

    const kept = this.selected().filter((user) => text.includes(`@${user.displayName}`));
    if (kept.length !== this.selected().length) {
      this.selected.set(kept);
    }
    this.mentionsChange.emit(kept);
  }
}
