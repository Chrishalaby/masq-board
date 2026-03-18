import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Chip } from 'primeng/chip';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { take } from 'rxjs/operators';
import { AuthService } from '../../../auth/auth.service';
import { Note, NOTE_COLORS } from '../../../models/note.model';
import { NoteService } from '../../../services/note.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-notes-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    Button,
    Chip,
    Dialog,
    InputText,
    MultiSelect,
    Select,
    SelectButton,
    Textarea,
    ToggleSwitch,
  ],
  template: `
    <div class="flex flex-col gap-4 p-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold dark:text-white">Notes Board</h1>
        <div class="flex items-center gap-3">
          <p-select
            [options]="users()"
            optionLabel="displayName"
            optionValue="id"
            placeholder="Filter by person"
            [showClear]="true"
            [formControl]="filterUser"
            (onChange)="onFilterChange()"
          />
          <p-selectbutton
            [options]="viewOptions"
            optionLabel="label"
            optionValue="value"
            [formControl]="viewMode"
          />
          <p-button icon="pi pi-plus" label="New Note" (onClick)="openNew()" />
        </div>
      </div>

      <!-- Public section -->
      <section>
        <h2 class="mb-3 text-lg font-semibold text-gray-700 dark:text-gray-300">
          <i class="pi pi-globe mr-2"></i>Public Board
        </h2>
        @if (publicNotes().length === 0) {
          <p class="text-sm text-gray-500 dark:text-gray-400">No public notes yet.</p>
        }
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (note of publicNotes(); track note.id) {
            <div
              class="flex cursor-pointer flex-col gap-2 rounded-lg border p-4 shadow-sm transition hover:shadow-md dark:border-gray-700"
              [style.background-color]="note.color || ''"
              [class.dark:bg-gray-800]="!note.color"
              (click)="openEdit(note)"
              (keydown.enter)="openEdit(note)"
              tabindex="0"
              role="button"
              [attr.aria-label]="'Edit note: ' + note.title"
            >
              <div class="flex items-start justify-between">
                <h3 class="font-semibold text-gray-900" [class.dark:text-white]="!note.color">
                  {{ note.title }}
                </h3>
                @if (note.isOwn) {
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    size="small"
                    (onClick)="deleteNote(note, $event)"
                    ariaLabel="Delete note"
                  />
                }
              </div>
              <p
                class="line-clamp-3 text-sm text-gray-700"
                [class.dark:text-gray-300]="!note.color"
              >
                {{ note.content }}
              </p>
              <div class="mt-auto flex flex-wrap gap-1 pt-2">
                @for (user of note.taggedUsers; track user.id) {
                  <p-chip [label]="user.displayName" styleClass="text-xs" />
                }
              </div>
              <span class="text-xs text-gray-500" [class.dark:text-gray-400]="!note.color">
                by {{ note.author?.displayName || 'Unknown' }}
              </span>
            </div>
          }
        </div>
      </section>

      <!-- Private section -->
      <section>
        <h2 class="mb-3 text-lg font-semibold text-gray-700 dark:text-gray-300">
          <i class="pi pi-lock mr-2"></i>My Private Notes
        </h2>
        @if (privateNotes().length === 0) {
          <p class="text-sm text-gray-500 dark:text-gray-400">No private notes yet.</p>
        }
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (note of privateNotes(); track note.id) {
            <div
              class="flex cursor-pointer flex-col gap-2 rounded-lg border p-4 shadow-sm transition hover:shadow-md dark:border-gray-700"
              [style.background-color]="note.color || ''"
              [class.dark:bg-gray-800]="!note.color"
              (click)="openEdit(note)"
              (keydown.enter)="openEdit(note)"
              tabindex="0"
              role="button"
              [attr.aria-label]="'Edit note: ' + note.title"
            >
              <div class="flex items-start justify-between">
                <h3 class="font-semibold text-gray-900" [class.dark:text-white]="!note.color">
                  {{ note.title }}
                </h3>
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  [text]="true"
                  size="small"
                  (onClick)="deleteNote(note, $event)"
                  ariaLabel="Delete note"
                />
              </div>
              <p
                class="line-clamp-3 text-sm text-gray-700"
                [class.dark:text-gray-300]="!note.color"
              >
                {{ note.content }}
              </p>
              <span class="text-xs text-gray-500" [class.dark:text-gray-400]="!note.color">
                {{ note.updatedAt | date: 'short' }}
              </span>
            </div>
          }
        </div>
      </section>
    </div>

    <!-- Editor dialog -->
    <p-dialog
      [header]="editingNote() ? 'Edit Note' : 'New Note'"
      [visible]="dialogVisible()"
      (visibleChange)="dialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: '36rem' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      <form [formGroup]="form" (ngSubmit)="onSave()" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="noteTitle" class="text-sm font-medium">Title *</label>
          <input pInputText id="noteTitle" formControlName="title" placeholder="Note title" />
        </div>

        <div class="flex flex-col gap-1">
          <label for="noteContent" class="text-sm font-medium">Content</label>
          <textarea
            pTextarea
            id="noteContent"
            formControlName="content"
            rows="6"
            placeholder="Write your note..."
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="noteColor" class="text-sm font-medium">Color</label>
            <p-select
              id="noteColor"
              formControlName="color"
              [options]="colors"
              optionLabel="label"
              optionValue="value"
              placeholder="Default"
              [showClear]="true"
              appendTo="body"
            />
          </div>
          <div class="flex items-end gap-2 pb-1">
            <p-toggleswitch formControlName="isPublic" inputId="notePublic" />
            <label for="notePublic" class="text-sm font-medium">Public</label>
          </div>
        </div>

        @if (form.controls.isPublic.value) {
          <div class="flex flex-col gap-1">
            <label for="noteTags" class="text-sm font-medium">Tag People</label>
            <p-multiselect
              id="noteTags"
              formControlName="taggedUserIds"
              [options]="users()"
              optionLabel="displayName"
              optionValue="id"
              placeholder="Select people to tag"
              [filter]="true"
              filterBy="displayName"
              display="chip"
              appendTo="body"
            />
          </div>
        }

        <div class="flex justify-end gap-2 border-t pt-3">
          <p-button
            label="Cancel"
            severity="secondary"
            [outlined]="true"
            (onClick)="dialogVisible.set(false)"
          />
          <p-button label="Save" type="submit" [disabled]="form.invalid" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class NotesBoardComponent implements OnInit {
  private readonly noteService = inject(NoteService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  readonly users = this.userService.users;
  readonly colors = NOTE_COLORS;
  readonly viewOptions = [
    { label: 'All', value: 'all' },
    { label: 'Tagged', value: 'tagged' },
  ];

  readonly dialogVisible = signal(false);
  readonly editingNote = signal<Note | null>(null);

  readonly filterUser = new FormControl<string | null>(null);
  readonly viewMode = new FormControl<'all' | 'tagged'>('all', { nonNullable: true });

  readonly currentUserId = computed(() => {
    const email = this.authService.userEmail()?.toLowerCase();
    if (!email) return '';
    const users = this.users();
    const match = users.find((u) => u.email.toLowerCase() === email);
    if (match) return match.id;
    // Fallback: check note authors already loaded
    const notes = this.noteService.notes();
    const authorMatch = notes.find((n) => n.author?.email?.toLowerCase() === email);
    return authorMatch?.authorId ?? '';
  });

  private readonly allNotes = this.noteService.notes;

  readonly publicNotes = computed(() => {
    const filterId = this.filterUser.value;
    const uid = this.currentUserId();
    const email = this.authService.userEmail()?.toLowerCase();
    return this.allNotes()
      .filter((n) => {
        if (!n.isPublic) return false;
        if (filterId) {
          return n.authorId === filterId || n.taggedUsers?.some((u) => u.id === filterId);
        }
        return true;
      })
      .map((n) => ({
        ...n,
        isOwn: n.authorId === uid || n.author?.email?.toLowerCase() === email,
      }));
  });

  readonly privateNotes = computed(() => {
    const uid = this.currentUserId();
    const email = this.authService.userEmail()?.toLowerCase();
    return this.allNotes()
      .filter(
        (n) => !n.isPublic && (n.authorId === uid || n.author?.email?.toLowerCase() === email),
      )
      .map((n) => ({ ...n, isOwn: true as const }));
  });

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    content: new FormControl('', { nonNullable: true }),
    isPublic: new FormControl(false, { nonNullable: true }),
    color: new FormControl<string | null>(null),
    taggedUserIds: new FormControl<string[]>([], { nonNullable: true }),
  });

  ngOnInit(): void {
    this.userService.loadUsers();
    this.noteService.loadNotes();
  }

  onFilterChange(): void {
    const userId = this.filterUser.value;
    if (userId && this.viewMode.value === 'tagged') {
      this.noteService.loadByTaggedUser(userId);
    } else {
      this.noteService.loadNotes();
    }
  }

  openNew(): void {
    this.editingNote.set(null);
    this.form.reset({ isPublic: false, taggedUserIds: [] });
    this.dialogVisible.set(true);
  }

  openEdit(note: Note & { isOwn?: boolean }): void {
    if (!note.isOwn) return;
    this.editingNote.set(note);
    this.form.patchValue({
      title: note.title,
      content: note.content,
      isPublic: note.isPublic,
      color: note.color ?? null,
      taggedUserIds: note.taggedUsers?.map((u) => u.id) ?? [],
    });
    this.dialogVisible.set(true);
  }

  onSave(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload = {
      title: raw.title,
      content: raw.content,
      isPublic: raw.isPublic,
      color: raw.color ?? undefined,
      taggedUserIds: raw.isPublic ? raw.taggedUserIds : [],
    };

    const existing = this.editingNote();
    if (existing) {
      this.noteService
        .updateNote(existing.id, payload)
        .pipe(take(1))
        .subscribe(() => this.dialogVisible.set(false));
    } else {
      this.noteService
        .createNote(payload)
        .pipe(take(1))
        .subscribe(() => this.dialogVisible.set(false));
    }
  }

  deleteNote(note: Note, event: Event): void {
    event.stopPropagation();
    this.noteService.deleteNote(note.id).pipe(take(1)).subscribe();
  }
}
