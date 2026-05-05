import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Chip } from 'primeng/chip';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { take } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { Note, NOTE_COLORS } from '../../models/note.model';
import { Task, TaskPriority } from '../../models/task.model';
import { NoteService } from '../../services/note.service';
import { ReminderService } from '../../services/reminder.service';
import { TaskService } from '../../services/task.service';
import { TodoItem, TodoService } from '../../services/todo.service';
import { CalendarEvent, MailMessage, UserService } from '../../services/user.service';
import { TaskEditorComponent } from '../tasks/task-editor/task-editor.component';

@Component({
  selector: 'app-personal-assistant',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DragDropModule,
    FormsModule,
    ReactiveFormsModule,
    FullCalendarModule,
    Button,
    Checkbox,
    Chip,
    DatePicker,
    Dialog,
    InputText,
    MultiSelect,
    Select,
    Tag,
    Textarea,
    ToggleSwitch,
    TaskEditorComponent,
  ],
  template: `
    <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      <h1 class="mb-1 text-xl font-bold text-gray-900 sm:text-2xl dark:text-gray-100">
        Personal Assistant
      </h1>
      <p class="mb-4 text-sm text-gray-500 sm:mb-6 dark:text-gray-400">Your Home away from Home</p>

      <div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3" cdkDropListGroup>
        <!-- Left column: Draggable sections -->
        <div
          class="flex flex-col gap-4 sm:gap-6 lg:col-span-2"
          cdkDropList
          #leftList="cdkDropList"
          [cdkDropListData]="leftSections()"
          [cdkDropListConnectedTo]="[rightList]"
          (cdkDropListDropped)="onSectionDrop($event)"
        >
          @for (section of leftSections(); track section) {
            @switch (section) {
              @case ('tasks') {
                <section cdkDrag>
                  <div class="mb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <i
                        class="pi pi-bars cursor-grab text-xs text-gray-300 dark:text-gray-600"
                        cdkDragHandle
                      ></i>
                      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        <i class="pi pi-check-square mr-2 text-green-500"></i>General Tasks
                      </h2>
                    </div>
                    <p-button
                      icon="pi pi-plus"
                      label="New Task"
                      size="small"
                      (onClick)="openNewTask()"
                    />
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
              }
              @case ('initiatives') {
                @if (initiativeGroups().length) {
                  <section cdkDrag>
                    <div class="mb-3 flex items-center gap-2">
                      <i
                        class="pi pi-bars cursor-grab text-xs text-gray-300 dark:text-gray-600"
                        cdkDragHandle
                      ></i>
                      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        <i class="pi pi-flag mr-2 text-purple-500"></i>Initiative Tasks
                      </h2>
                    </div>
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
                              <span
                                class="flex-1 truncate text-sm text-gray-900 dark:text-gray-100"
                                >{{ task.title }}</span
                              >
                              <span class="text-xs text-gray-400">{{ task.status }}</span>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </section>
                }
              }
              @case ('projects') {
                @if (projectGroups().length) {
                  <section cdkDrag>
                    <div class="mb-3 flex items-center gap-2">
                      <i
                        class="pi pi-bars cursor-grab text-xs text-gray-300 dark:text-gray-600"
                        cdkDragHandle
                      ></i>
                      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        <i class="pi pi-briefcase mr-2 text-indigo-500"></i>Project Tasks
                      </h2>
                    </div>
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
                              <span
                                class="flex-1 truncate text-sm text-gray-900 dark:text-gray-100"
                                >{{ task.title }}</span
                              >
                              <span class="text-xs text-gray-400">{{ task.status }}</span>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </section>
                }
              }
              @case ('todo') {
                <section cdkDrag>
                  <div class="mb-3 flex items-center gap-2">
                    <i
                      class="pi pi-bars cursor-grab text-xs text-gray-300 dark:text-gray-600"
                      cdkDragHandle
                    ></i>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      <i class="pi pi-list-check mr-2 text-teal-500"></i>To-Do List
                    </h2>
                  </div>
                  <div
                    class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div class="mb-3 flex items-center gap-2">
                      <input
                        pInputText
                        class="flex-1"
                        placeholder="Add a to-do..."
                        [formControl]="newTodoControl"
                        (keydown.enter)="addTodo()"
                      />
                      <p-button
                        icon="pi pi-plus"
                        [rounded]="true"
                        size="small"
                        (onClick)="addTodo()"
                        ariaLabel="Add to-do"
                      />
                    </div>
                    @if (todos().length === 0) {
                      <p class="text-center text-sm text-gray-400">No to-dos yet.</p>
                    }
                    <div class="flex flex-col gap-1">
                      @for (todo of todos(); track todo.id) {
                        <div
                          class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-750"
                        >
                          <p-checkbox
                            [binary]="true"
                            [ngModel]="todo.completed"
                            (onChange)="toggleTodo(todo)"
                          />
                          <span
                            class="flex-1 text-sm"
                            [class.text-gray-400]="todo.completed"
                            [class.line-through]="todo.completed"
                            [class.text-gray-900]="!todo.completed"
                            [class.dark:text-gray-100]="!todo.completed"
                            >{{ todo.title }}</span
                          >
                          <p-button
                            icon="pi pi-trash"
                            [text]="true"
                            severity="danger"
                            size="small"
                            (onClick)="deleteTodo(todo.id)"
                            ariaLabel="Delete to-do"
                          />
                        </div>
                      }
                    </div>
                  </div>
                </section>
              }
              @case ('reminders') {
                <section cdkDrag>
                  <div class="mb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <i
                        class="pi pi-bars cursor-grab text-xs text-gray-300 dark:text-gray-600"
                        cdkDragHandle
                      ></i>
                      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        <i class="pi pi-bell mr-2 text-pink-500"></i>Personal Reminders
                      </h2>
                    </div>
                    <p-button
                      icon="pi pi-plus"
                      label="New Reminder"
                      size="small"
                      (onClick)="reminderDialogVisible.set(true)"
                    />
                  </div>
                  @if (reminders().length === 0) {
                    <p class="text-sm text-gray-500 dark:text-gray-400">No reminders set.</p>
                  }
                  <div class="flex flex-col gap-2">
                    @for (reminder of reminders(); track reminder.id) {
                      <div
                        class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                        [class.opacity-50]="reminder.sent"
                      >
                        <div>
                          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {{ reminder.title }}
                          </p>
                          <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ reminder.remindAt | date: 'EEE, MMM d, y · h:mm a' }}
                            @if (reminder.sent) {
                              <span class="ml-1 text-green-600">(sent)</span>
                            }
                          </p>
                        </div>
                        <p-button
                          icon="pi pi-trash"
                          [text]="true"
                          severity="danger"
                          size="small"
                          (onClick)="deleteReminder(reminder.id)"
                          ariaLabel="Delete reminder"
                        />
                      </div>
                    }
                  </div>
                </section>
              }
            }
          }
        </div>

        <!-- Right column: Calendar + Emails + Notes (draggable) -->
        <div
          class="flex flex-col gap-4 sm:gap-6"
          cdkDropList
          #rightList="cdkDropList"
          [cdkDropListData]="rightSections()"
          [cdkDropListConnectedTo]="[leftList]"
          (cdkDropListDropped)="onSectionDrop($event)"
        >
          @for (section of rightSections(); track section) {
            @switch (section) {
              @case ('calendar') {
                <section cdkDrag>
                  <div class="mb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <i
                        class="pi pi-bars cursor-grab text-xs text-gray-300 dark:text-gray-600"
                        cdkDragHandle
                      ></i>
                      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        <i class="pi pi-calendar mr-2 text-blue-500"></i>M365 Calendar
                      </h2>
                    </div>
                    <p-button
                      icon="pi pi-plus"
                      label="Add Event"
                      size="small"
                      [outlined]="true"
                      (onClick)="eventDialogVisible.set(true)"
                    />
                  </div>
                  <div
                    class="rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <full-calendar [options]="calendarOptions()" />
                  </div>
                </section>
              }
              @case ('emails') {
                <section cdkDrag>
                  <div class="mb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <i
                        class="pi pi-bars cursor-grab text-xs text-gray-300 dark:text-gray-600"
                        cdkDragHandle
                      ></i>
                      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        <i class="pi pi-envelope mr-2 text-red-500"></i>Emails
                      </h2>
                    </div>
                    <p-button
                      icon="pi pi-refresh"
                      [text]="true"
                      size="small"
                      (onClick)="refreshEmails()"
                      ariaLabel="Refresh emails"
                    />
                  </div>
                  <div
                    class="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    @if (emails().length === 0) {
                      <p class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No recent emails.
                      </p>
                    }
                    <div class="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                      @for (email of emails(); track email.id) {
                        <button
                          type="button"
                          class="flex w-full items-start gap-3 p-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-750"
                          (click)="openEmail(email)"
                        >
                          <div
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                            [class.bg-red-100]="!email.isRead"
                            [class.text-red-600]="!email.isRead"
                            [class.dark:bg-red-900]="!email.isRead"
                            [class.dark:text-red-300]="!email.isRead"
                            [class.bg-gray-100]="email.isRead"
                            [class.text-gray-400]="email.isRead"
                            [class.dark:bg-gray-700]="email.isRead"
                            [class.dark:text-gray-500]="email.isRead"
                          >
                            <i
                              [class]="email.isRead ? 'pi pi-envelope-open' : 'pi pi-envelope'"
                            ></i>
                          </div>
                          <div class="min-w-0 flex-1">
                            <p
                              class="truncate text-sm text-gray-900 dark:text-gray-100"
                              [class.font-semibold]="!email.isRead"
                            >
                              {{ email.subject }}
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                              {{ email.from }}
                              @if (email.hasAttachments) {
                                <i class="pi pi-paperclip ml-1"></i>
                              }
                            </p>
                            <p class="truncate text-xs text-gray-400">{{ email.bodyPreview }}</p>
                            <p class="mt-0.5 text-xs text-gray-400">
                              {{ email.receivedDateTime | date: 'EEE, MMM d · h:mm a' }}
                            </p>
                          </div>
                        </button>
                      }
                    </div>
                  </div>
                </section>
              }
              @case ('notes') {
                <section cdkDrag>
                  <div class="mb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <i
                        class="pi pi-bars cursor-grab text-xs text-gray-300 dark:text-gray-600"
                        cdkDragHandle
                      ></i>
                      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        <i class="pi pi-file-edit mr-2 text-amber-500"></i>Notes
                      </h2>
                    </div>
                    <p-button
                      icon="pi pi-plus"
                      label="New Note"
                      size="small"
                      (onClick)="openNewNote()"
                    />
                  </div>
                  @if (myNotes().length === 0) {
                    <p class="text-sm text-gray-500 dark:text-gray-400">No notes yet.</p>
                  }
                  <div class="flex flex-col gap-2">
                    @for (note of myNotes(); track note.id) {
                      <div
                        class="group relative cursor-pointer rounded-lg border p-3 shadow-sm transition hover:shadow-md dark:border-gray-700"
                        [style.background-color]="note.color || ''"
                        [class.dark:bg-gray-800]="!note.color"
                        (click)="openEditNote(note)"
                        (keydown.enter)="openEditNote(note)"
                        tabindex="0"
                        role="button"
                        [attr.aria-label]="'Edit note: ' + note.title"
                      >
                        <p-button
                          icon="pi pi-trash"
                          [text]="true"
                          severity="danger"
                          size="small"
                          class="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100"
                          (onClick)="onQuickDeleteNote(note, $event)"
                          ariaLabel="Delete note"
                        />
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
              }
            }
          }
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

    <!-- Reminder Dialog -->
    <p-dialog
      header="New Reminder"
      [visible]="reminderDialogVisible()"
      (visibleChange)="reminderDialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: '28rem' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      <form
        [formGroup]="reminderForm"
        (ngSubmit)="onSaveReminder()"
        class="flex flex-col gap-4 pt-2"
      >
        <div class="flex flex-col gap-1">
          <label for="reminderTitle" class="text-sm font-medium">Title *</label>
          <input
            pInputText
            id="reminderTitle"
            formControlName="title"
            placeholder="Reminder title"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="remindAt" class="text-sm font-medium">Remind At *</label>
          <p-datepicker
            id="remindAt"
            formControlName="remindAt"
            [showTime]="true"
            [showIcon]="true"
            dateFormat="yy-mm-dd"
            appendTo="body"
          />
        </div>
        <div class="flex justify-end gap-2 border-t pt-3">
          <p-button
            label="Cancel"
            severity="secondary"
            [outlined]="true"
            (onClick)="reminderDialogVisible.set(false)"
          />
          <p-button label="Save" type="submit" [disabled]="reminderForm.invalid" />
        </div>
      </form>
    </p-dialog>

    <!-- Calendar Event Dialog -->
    <p-dialog
      header="Add Calendar Event"
      [visible]="eventDialogVisible()"
      (visibleChange)="eventDialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: '28rem' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      <form [formGroup]="eventForm" (ngSubmit)="onSaveEvent()" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label for="eventSubject" class="text-sm font-medium">Subject *</label>
          <input
            pInputText
            id="eventSubject"
            formControlName="subject"
            placeholder="Event subject"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="eventStart" class="text-sm font-medium">Start *</label>
            <p-datepicker
              id="eventStart"
              formControlName="start"
              [showTime]="true"
              [showIcon]="true"
              dateFormat="yy-mm-dd"
              appendTo="body"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="eventEnd" class="text-sm font-medium">End *</label>
            <p-datepicker
              id="eventEnd"
              formControlName="end"
              [showTime]="true"
              [showIcon]="true"
              dateFormat="yy-mm-dd"
              appendTo="body"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 border-t pt-3">
          <p-button
            label="Cancel"
            severity="secondary"
            [outlined]="true"
            (onClick)="eventDialogVisible.set(false)"
          />
          <p-button
            label="Create"
            type="submit"
            [disabled]="eventForm.invalid"
            [loading]="eventSaving()"
          />
        </div>
      </form>
    </p-dialog>

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

    <!-- Email Viewer Dialog -->
    <p-dialog
      [header]="viewingEmail()?.subject || 'Email'"
      [visible]="emailDialogVisible()"
      (visibleChange)="emailDialogVisible.set($event)"
      [modal]="true"
      [style]="{ width: '48rem', 'max-height': '80vh' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      @if (viewingEmail(); as email) {
        <div class="flex flex-col gap-4 pt-2">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {{ email.from }}
                <span class="font-normal text-gray-500">&lt;{{ email.fromEmail }}&gt;</span>
              </p>
              <p class="text-xs text-gray-400">
                {{ email.receivedDateTime | date: 'EEEE, MMMM d, y · h:mm a' }}
                @if (email.hasAttachments) {
                  <i class="pi pi-paperclip ml-1"></i>
                }
              </p>
            </div>
            <a
              [href]="email.webLink"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >Open in Outlook</a
            >
          </div>
          @if (emailLoading()) {
            <div class="flex items-center justify-center py-8">
              <i class="pi pi-spinner pi-spin mr-2"></i> Loading...
            </div>
          } @else {
            <div
              class="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              [innerHTML]="emailBody()"
            ></div>
          }

          <!-- Reply Section -->
          <div class="border-t border-gray-200 pt-3 dark:border-gray-700">
            <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Reply</label
            >
            <textarea
              pTextarea
              class="w-full"
              rows="4"
              placeholder="Type your reply..."
              [formControl]="emailReplyControl"
            ></textarea>
            <div class="mt-2 flex justify-end gap-2">
              <p-button
                label="Send Reply"
                icon="pi pi-send"
                size="small"
                [disabled]="!emailReplyControl.value.trim()"
                [loading]="emailReplying()"
                (onClick)="onReplyEmail()"
              />
            </div>
          </div>
        </div>
      }
    </p-dialog>
  `,
})
export class PersonalAssistantComponent implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly noteService = inject(NoteService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly reminderService = inject(ReminderService);
  private readonly todoService = inject(TodoService);

  private readonly SECTION_ORDER_KEY = 'pa-section-order';

  readonly users = this.userService.users;
  readonly noteColors = NOTE_COLORS;
  readonly reminders = this.reminderService.reminders;
  readonly todos = this.todoService.todos;

  // Task state
  readonly selectedTask = signal<Task | null>(null);
  readonly taskEditorVisible = signal(false);

  // Note state
  readonly noteDialogVisible = signal(false);
  readonly editingNote = signal<Note | null>(null);

  // Reminder state
  readonly reminderDialogVisible = signal(false);

  // Calendar state
  readonly calendarEvents = signal<CalendarEvent[]>([]);
  readonly eventDialogVisible = signal(false);
  readonly eventSaving = signal(false);

  readonly calendarOptions = computed((): CalendarOptions => {
    const events = this.calendarEvents().map((e) => ({
      id: e.id,
      title: e.subject,
      start: e.startTime,
      end: e.endTime,
      url: e.joinUrl || undefined,
      extendedProps: {
        location: e.location,
        isOnlineMeeting: e.isOnlineMeeting,
        joinUrl: e.joinUrl,
      },
    }));
    return {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'timeGridWeek',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridDay,timeGridWeek,dayGridMonth',
      },
      height: 500,
      events,
      nowIndicator: true,
      editable: false,
      selectable: false,
      weekends: true,
      slotMinTime: '07:00:00',
      slotMaxTime: '20:00:00',
      eventClick: (info) => {
        if (info.event.extendedProps['joinUrl']) {
          info.jsEvent.preventDefault();
          window.open(info.event.extendedProps['joinUrl'], '_blank', 'noopener,noreferrer');
        }
      },
      datesSet: (dateInfo) => {
        this.loadCalendarEventsForRange(dateInfo.startStr, dateInfo.endStr);
      },
    };
  });

  // Email state
  readonly emails = signal<MailMessage[]>([]);
  readonly emailDialogVisible = signal(false);
  readonly viewingEmail = signal<MailMessage | null>(null);
  readonly emailBody = signal('');
  readonly emailLoading = signal(false);
  readonly emailReplying = signal(false);
  readonly emailReplyControl = new FormControl('', { nonNullable: true });

  // Draggable section order
  readonly leftSections = signal<string[]>([
    'tasks',
    'initiatives',
    'projects',
    'todo',
    'reminders',
  ]);
  readonly rightSections = signal<string[]>(['calendar', 'emails', 'notes']);

  // To-Do
  readonly newTodoControl = new FormControl('', { nonNullable: true });

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

  readonly generalTasks = computed(() => {
    const uid = this.currentUserId();
    return this.myTasks().filter((t) => !t.projectId && !t.initiativeId && t.createdById === uid);
  });

  readonly initiativeGroups = computed(() => {
    const tasks = this.myTasks().filter((t) => t.initiativeId);
    const groups = new Map<string, { name: string; tasks: Task[] }>();
    for (const task of tasks) {
      const key = task.initiativeId!;
      const existing = groups.get(key);
      if (existing) {
        existing.tasks.push(task);
      } else {
        groups.set(key, { name: task.initiative?.name ?? key, tasks: [task] });
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
        groups.set(key, { name: task.project?.name ?? key, tasks: [task] });
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

  readonly reminderForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    remindAt: new FormControl<Date | null>(null, { validators: [Validators.required] }),
  });

  readonly eventForm = new FormGroup({
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    start: new FormControl<Date | null>(null, { validators: [Validators.required] }),
    end: new FormControl<Date | null>(null, { validators: [Validators.required] }),
  });

  ngOnInit(): void {
    this.userService.loadUsers();
    this.userService.loadCurrentUser();
    this.taskService.loadTasks();
    this.noteService.loadNotes();
    this.reminderService.loadReminders();
    this.todoService.loadTodos();
    this.loadEmails();
    this.restoreSectionOrder();
  }

  // --- Draggable Sections ---

  onSectionDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousContainer === event.container) {
      // Reorder within same column
      const isLeft = event.container.data === this.leftSections();
      const sig = isLeft ? this.leftSections : this.rightSections;
      const arr = [...sig()];
      moveItemInArray(arr, event.previousIndex, event.currentIndex);
      sig.set(arr);
    } else {
      // Transfer between columns
      const prevArr = [...event.previousContainer.data];
      const currArr = [...event.container.data];
      transferArrayItem(prevArr, currArr, event.previousIndex, event.currentIndex);

      const isPrevLeft = event.previousContainer.data === this.leftSections();
      if (isPrevLeft) {
        this.leftSections.set(prevArr);
        this.rightSections.set(currArr);
      } else {
        this.rightSections.set(prevArr);
        this.leftSections.set(currArr);
      }
    }
    this.saveSectionOrder();
  }

  private saveSectionOrder(): void {
    const order = { left: this.leftSections(), right: this.rightSections() };
    localStorage.setItem(this.SECTION_ORDER_KEY, JSON.stringify(order));
  }

  private restoreSectionOrder(): void {
    const saved = localStorage.getItem(this.SECTION_ORDER_KEY);
    if (saved) {
      try {
        const order = JSON.parse(saved);
        if (order.left) this.leftSections.set(order.left);
        if (order.right) this.rightSections.set(order.right);
      } catch {
        // Ignore invalid JSON
      }
    }
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

  // --- To-Do ---

  addTodo(): void {
    const title = this.newTodoControl.value.trim();
    if (!title) return;
    this.todoService.addTodo(title).pipe(take(1)).subscribe();
    this.newTodoControl.reset();
  }

  toggleTodo(item: TodoItem): void {
    this.todoService.toggleTodo(item).pipe(take(1)).subscribe();
  }

  deleteTodo(id: string): void {
    this.todoService.deleteTodo(id).pipe(take(1)).subscribe();
  }

  // --- Reminders ---

  onSaveReminder(): void {
    if (this.reminderForm.invalid) return;
    const raw = this.reminderForm.getRawValue();
    this.reminderService
      .createReminder({
        title: raw.title,
        remindAt: raw.remindAt!.toISOString(),
      })
      .pipe(take(1))
      .subscribe(() => {
        this.reminderDialogVisible.set(false);
        this.reminderForm.reset();
      });
  }

  deleteReminder(id: string): void {
    this.reminderService.deleteReminder(id).pipe(take(1)).subscribe();
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

  onQuickDeleteNote(note: Note, event: Event): void {
    event.stopPropagation();
    this.noteService.deleteNote(note.id).pipe(take(1)).subscribe();
  }

  // --- Calendar ---

  onSaveEvent(): void {
    if (this.eventForm.invalid) return;
    const raw = this.eventForm.getRawValue();
    this.eventSaving.set(true);
    // Format as local datetime string (yyyy-MM-ddTHH:mm:ss) without UTC conversion
    const formatLocal = (d: Date): string => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    this.userService
      .createCalendarEvent({
        subject: raw.subject,
        startDateTime: formatLocal(raw.start!),
        endDateTime: formatLocal(raw.end!),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.eventSaving.set(false);
          this.eventDialogVisible.set(false);
          this.eventForm.reset();
          // Reload calendar events for current range
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          this.loadCalendarEventsForRange(start.toISOString(), end.toISOString());
        },
        error: () => this.eventSaving.set(false),
      });
  }

  private loadCalendarEventsForRange(startStr: string, endStr: string): void {
    this.userService.getCalendarEvents(startStr, endStr).subscribe({
      next: (events) => this.calendarEvents.set(events),
      error: () => this.calendarEvents.set([]),
    });
  }

  private loadEmails(): void {
    this.userService.getEmails(20).subscribe({
      next: (messages) => this.emails.set(messages),
      error: () => this.emails.set([]),
    });
  }

  refreshEmails(): void {
    this.loadEmails();
  }

  openEmail(email: MailMessage): void {
    this.viewingEmail.set(email);
    this.emailBody.set('');
    this.emailReplyControl.reset();
    this.emailDialogVisible.set(true);
    this.emailLoading.set(true);

    this.userService
      .getEmail(email.id)
      .pipe(take(1))
      .subscribe({
        next: (full) => {
          this.viewingEmail.set(full);
          this.emailBody.set(full.body ?? full.bodyPreview);
          this.emailLoading.set(false);
          // Mark as read in the email list
          this.emails.update((list) =>
            list.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)),
          );
        },
        error: () => {
          this.emailBody.set(email.bodyPreview);
          this.emailLoading.set(false);
        },
      });
  }

  onReplyEmail(): void {
    const email = this.viewingEmail();
    const comment = this.emailReplyControl.value?.trim();
    if (!email || !comment) return;

    this.emailReplying.set(true);
    this.userService
      .replyToEmail(email.id, comment)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.emailReplying.set(false);
          this.emailReplyControl.reset();
          this.emailDialogVisible.set(false);
          this.loadEmails();
        },
        error: () => this.emailReplying.set(false),
      });
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
