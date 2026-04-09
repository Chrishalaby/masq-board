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
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { take } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { Note, NOTE_COLORS } from '../../models/note.model';
import { Task, TaskPriority } from '../../models/task.model';
import { NoteService } from '../../services/note.service';
import { TaskService } from '../../services/task.service';
import { CalendarEvent, UserService } from '../../services/user.service';
import { TaskEditorComponent } from '../tasks/task-editor/task-editor.component';

@Component({
  selector: 'app-personal-assistant',
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
    Tag,
    Textarea,
    ToggleSwitch,
    TaskEditorComponent,
  ],
  template: `
    <div class="mx-auto max-w-7xl px-6 py-6">
      <h1 class="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Personal Assistant</h1>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Left column: Tasks -->
        <div class="flex flex-col gap-6 lg:col-span-2">
          <!-- General Tasks -->
          <section>
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                <i class="pi pi-check-square mr-2 text-green-500"></i>General Tasks
              </h2>
              <p-button icon="pi pi-plus" label="New Task" size="small" (onClick)="openNewTask()" />
            </div>
            @if (generalTasks().length === 0) {
              <p class="text-sm text-gray-500 dark:text-gray-400">
                No standalone tasks assigned to you.
              </p>
            }
            <div class="flex flex-col gap-2">
              @for (task of generalTasks(); track task.id) {
                <button
                  class="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  (click)="openEditTask(task)"
                >
                  <p-tag
                    [value]="task.priority"
                    [severity]="prioritySeverity(task.priority)"
                    [rounded]="true"
                  />
                  <span class="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{{
                    task.title
                  }}</span>
                  <span class="text-xs text-gray-400">{{ task.status }}</span>
                </button>
              }
            </div>
          </section>

          <!-- Initiative Tasks -->
          @if (initiativeGroups().length) {
            <section>
              <h2 class="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
                <i class="pi pi-flag mr-2 text-purple-500"></i>Initiative Tasks
              </h2>
              @for (group of initiativeGroups(); track group.name) {
                <div class="mb-3">
                  <h3 class="mb-1 text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {{ group.name }}
                  </h3>
                  <div class="flex flex-col gap-1">
                    @for (task of group.tasks; track task.id) {
                      <button
                        class="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-white p-2.5 text-left transition hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
                        (click)="openEditTask(task)"
                      >
                        <p-tag
                          [value]="task.priority"
                          [severity]="prioritySeverity(task.priority)"
                          [rounded]="true"
                        />
                        <span class="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{{
                          task.title
                        }}</span>
                        <span class="text-xs text-gray-400">{{ task.status }}</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </section>
          }

          <!-- Project Tasks -->
          @if (projectGroups().length) {
            <section>
              <h2 class="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
                <i class="pi pi-briefcase mr-2 text-indigo-500"></i>Project Tasks
              </h2>
              @for (group of projectGroups(); track group.name) {
                <div class="mb-3">
                  <h3 class="mb-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    {{ group.name }}
                  </h3>
                  <div class="flex flex-col gap-1">
                    @for (task of group.tasks; track task.id) {
                      <button
                        class="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-white p-2.5 text-left transition hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
                        (click)="openEditTask(task)"
                      >
                        <p-tag
                          [value]="task.priority"
                          [severity]="prioritySeverity(task.priority)"
                          [rounded]="true"
                        />
                        <span class="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{{
                          task.title
                        }}</span>
                        <span class="text-xs text-gray-400">{{ task.status }}</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </section>
          }
        </div>

        <!-- Right column: Calendar + Notes -->
        <div class="flex flex-col gap-6">
          <!-- M365 Calendar -->
          <section>
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                <i class="pi pi-calendar mr-2 text-blue-500"></i>M365 Calendar
              </h2>
              <div class="flex gap-1">
                <p-button
                  icon="pi pi-chevron-left"
                  [text]="true"
                  size="small"
                  (onClick)="prevWeek()"
                  ariaLabel="Previous week"
                />
                <p-button label="Today" [text]="true" size="small" (onClick)="goToday()" />
                <p-button
                  icon="pi pi-chevron-right"
                  [text]="true"
                  size="small"
                  (onClick)="nextWeek()"
                  ariaLabel="Next week"
                />
              </div>
            </div>
            <div
              class="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              @if (calendarEvents().length === 0) {
                <p class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No events this week.
                </p>
              }
              <div class="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                @for (event of calendarEvents(); track event.id) {
                  <div class="flex items-start gap-3 p-3">
                    <div
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                    >
                      <i [class]="event.isOnlineMeeting ? 'pi pi-video' : 'pi pi-calendar'"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {{ event.subject }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ event.startTime | date: 'EEE, MMM d · h:mm a' }} –
                        {{ event.endTime | date: 'h:mm a' }}
                      </p>
                      @if (event.location) {
                        <p class="text-xs text-gray-400">
                          <i class="pi pi-map-marker mr-1"></i>{{ event.location }}
                        </p>
                      }
                      @if (event.joinUrl) {
                        <a
                          [href]="event.joinUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="mt-1 inline-block text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Join Meeting
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          </section>

          <!-- Notes -->
          <section>
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                <i class="pi pi-file-edit mr-2 text-amber-500"></i>Notes
              </h2>
              <p-button icon="pi pi-plus" label="New Note" size="small" (onClick)="openNewNote()" />
            </div>
            @if (myNotes().length === 0) {
              <p class="text-sm text-gray-500 dark:text-gray-400">No notes yet.</p>
            }
            <div class="flex flex-col gap-2">
              @for (note of myNotes(); track note.id) {
                <div
                  class="cursor-pointer rounded-lg border p-3 shadow-sm transition hover:shadow-md dark:border-gray-700"
                  [style.background-color]="note.color || ''"
                  [class.dark:bg-gray-800]="!note.color"
                  (click)="openEditNote(note)"
                  (keydown.enter)="openEditNote(note)"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="'Edit note: ' + note.title"
                >
                  <h3
                    class="text-sm font-semibold text-gray-900"
                    [class.dark:text-white]="!note.color"
                  >
                    {{ note.title }}
                  </h3>
                  <p
                    class="line-clamp-2 text-xs text-gray-700"
                    [class.dark:text-gray-300]="!note.color"
                  >
                    {{ note.content }}
                  </p>
                  @if (note.taggedUsers?.length) {
                    <div class="mt-1 flex flex-wrap gap-1">
                      @for (user of note.taggedUsers; track user.id) {
                        <p-chip [label]="user.displayName" styleClass="text-xs" />
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- Task Editor -->
    <app-task-editor
      [task]="selectedTask()"
      [visible]="taskEditorVisible()"
      (visibleChange)="taskEditorVisible.set($event)"
      (saved)="onTaskSaved()"
    />

    <!-- Note Editor Dialog -->
    <p-dialog
      [header]="editingNote() ? 'Edit Note' : 'New Note'"
      [visible]="noteDialogVisible()"
      (visibleChange)="noteDialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: '36rem' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      <form [formGroup]="noteForm" (ngSubmit)="onSaveNote()" class="flex flex-col gap-4 pt-2">
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
              [options]="noteColors"
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
        @if (noteForm.controls.isPublic.value) {
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
          @if (editingNote()) {
            <p-button
              label="Delete"
              severity="danger"
              [outlined]="true"
              (onClick)="onDeleteNote()"
            />
          }
          <p-button
            label="Cancel"
            severity="secondary"
            [outlined]="true"
            (onClick)="noteDialogVisible.set(false)"
          />
          <p-button label="Save" type="submit" [disabled]="noteForm.invalid" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class PersonalAssistantComponent implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly noteService = inject(NoteService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  readonly users = this.userService.users;
  readonly noteColors = NOTE_COLORS;

  // Task state
  readonly selectedTask = signal<Task | null>(null);
  readonly taskEditorVisible = signal(false);

  // Note state
  readonly noteDialogVisible = signal(false);
  readonly editingNote = signal<Note | null>(null);

  // Calendar state
  readonly calendarWeekStart = signal(this.getWeekStart(new Date()));
  readonly calendarEvents = signal<CalendarEvent[]>([]);

  readonly currentUserId = computed(() => {
    const teamsOid = this.authService.teamsOid();
    if (teamsOid) {
      const users = this.users();
      const match = users.find((u) => u.teamsId === teamsOid);
      if (match) return match.id;
    }
    const email = this.authService.userEmail()?.toLowerCase();
    if (!email) return '';
    const match = this.users().find((u) => u.email?.toLowerCase() === email);
    return match?.id ?? '';
  });

  private readonly allTasks = this.taskService.tasks;

  readonly myTasks = computed(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    return this.allTasks().filter(
      (t) => t.assigneeId === uid || t.assignees?.some((a) => a.userId === uid),
    );
  });

  readonly generalTasks = computed(() =>
    this.myTasks().filter((t) => !t.projectId && !t.initiativeId),
  );

  readonly initiativeGroups = computed(() => {
    const tasks = this.myTasks().filter((t) => t.initiativeId);
    const groups = new Map<string, { name: string; tasks: Task[] }>();
    for (const task of tasks) {
      const key = task.initiativeId!;
      const existing = groups.get(key);
      if (existing) {
        existing.tasks.push(task);
      } else {
        groups.set(key, {
          name: task.initiative?.name ?? key,
          tasks: [task],
        });
      }
    }
    return [...groups.values()];
  });

  readonly projectGroups = computed(() => {
    const tasks = this.myTasks().filter((t) => t.projectId && !t.initiativeId);
    const groups = new Map<string, { name: string; tasks: Task[] }>();
    for (const task of tasks) {
      const key = task.projectId!;
      const existing = groups.get(key);
      if (existing) {
        existing.tasks.push(task);
      } else {
        groups.set(key, {
          name: task.project?.name ?? key,
          tasks: [task],
        });
      }
    }
    return [...groups.values()];
  });

  readonly myNotes = computed(() => {
    const uid = this.currentUserId();
    const teamsOid = this.authService.teamsOid();
    return this.noteService
      .notes()
      .filter((n) => n.authorId === uid || (!!teamsOid && n.author?.teamsId === teamsOid));
  });

  readonly noteForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    content: new FormControl('', { nonNullable: true }),
    isPublic: new FormControl(false, { nonNullable: true }),
    color: new FormControl<string | null>(null),
    taggedUserIds: new FormControl<string[]>([], { nonNullable: true }),
  });

  ngOnInit(): void {
    this.userService.loadUsers();
    this.userService.loadCurrentUser();
    this.taskService.loadTasks();
    this.noteService.loadNotes();
    this.loadCalendarEvents();
  }

  // --- Tasks ---

  openNewTask(): void {
    this.selectedTask.set(null);
    this.taskEditorVisible.set(true);
  }

  openEditTask(task: Task): void {
    this.selectedTask.set(task);
    this.taskEditorVisible.set(true);
  }

  onTaskSaved(): void {
    this.selectedTask.set(null);
    this.taskService.loadTasks();
  }

  // --- Notes ---

  openNewNote(): void {
    this.editingNote.set(null);
    this.noteForm.reset({ isPublic: false, taggedUserIds: [] });
    this.noteDialogVisible.set(true);
  }

  openEditNote(note: Note): void {
    this.editingNote.set(note);
    this.noteForm.patchValue({
      title: note.title,
      content: note.content,
      isPublic: note.isPublic,
      color: note.color ?? null,
      taggedUserIds: note.taggedUsers?.map((u) => u.id) ?? [],
    });
    this.noteDialogVisible.set(true);
  }

  onSaveNote(): void {
    if (this.noteForm.invalid) return;
    const raw = this.noteForm.getRawValue();
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
        .subscribe(() => this.noteDialogVisible.set(false));
    } else {
      this.noteService
        .createNote(payload)
        .pipe(take(1))
        .subscribe(() => this.noteDialogVisible.set(false));
    }
  }

  onDeleteNote(): void {
    const note = this.editingNote();
    if (note) {
      this.noteService
        .deleteNote(note.id)
        .pipe(take(1))
        .subscribe(() => this.noteDialogVisible.set(false));
    }
  }

  // --- Calendar ---

  prevWeek(): void {
    const d = this.calendarWeekStart();
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 7);
    this.calendarWeekStart.set(prev);
    this.loadCalendarEvents();
  }

  nextWeek(): void {
    const d = this.calendarWeekStart();
    const next = new Date(d);
    next.setDate(next.getDate() + 7);
    this.calendarWeekStart.set(next);
    this.loadCalendarEvents();
  }

  goToday(): void {
    this.calendarWeekStart.set(this.getWeekStart(new Date()));
    this.loadCalendarEvents();
  }

  private loadCalendarEvents(): void {
    const start = this.calendarWeekStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    this.userService.getCalendarEvents(start.toISOString(), end.toISOString()).subscribe({
      next: (events) => this.calendarEvents.set(events),
      error: () => this.calendarEvents.set([]),
    });
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  protected prioritySeverity(p: TaskPriority): 'danger' | 'warn' | 'info' | 'success' {
    const map: Record<TaskPriority, 'danger' | 'warn' | 'info' | 'success'> = {
      urgent: 'danger',
      high: 'warn',
      medium: 'info',
      low: 'success',
    };
    return map[p];
  }
}
