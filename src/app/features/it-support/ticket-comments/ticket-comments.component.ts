import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { take } from 'rxjs/operators';
import { ItTicketComment } from '../../../models/it-ticket.model';
import { User } from '../../../models/user.model';
import { ItSupportService } from '../../../services/it-support.service';
import { UserService } from '../../../services/user.service';
import { MentionTextareaComponent } from '../../../shared/mention-textarea/mention-textarea.component';

interface BodySegment {
  readonly text: string;
  readonly isMention: boolean;
}

interface RenderedComment extends ItTicketComment {
  readonly segments: BodySegment[];
  readonly initials: string;
}

@Component({
  selector: 'app-ticket-comments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, Button, ProgressSpinner, MentionTextareaComponent],
  template: `
    <section
      class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
      aria-labelledby="commentsHeading"
    >
      <h2
        id="commentsHeading"
        class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
      >
        Comments
        @if (comments().length > 0) {
          <span class="ml-1 font-normal normal-case">({{ comments().length }})</span>
        }
      </h2>

      @if (loading()) {
        <div class="flex justify-center py-8">
          <p-progressspinner strokeWidth="4" [style]="{ width: '1.75rem', height: '1.75rem' }" />
        </div>
      } @else {
        <ol class="mb-5 flex flex-col gap-4">
          @for (comment of renderedComments(); track comment.id) {
            <li
              [id]="'comment-' + comment.id"
              class="flex gap-3 rounded-lg p-2 transition-colors"
              [class]="
                comment.id === highlightedId()
                  ? 'bg-indigo-50 ring-2 ring-indigo-400 dark:bg-indigo-950 dark:ring-indigo-500'
                  : ''
              "
            >
              <span
                class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
                aria-hidden="true"
                >{{ comment.initials }}</span
              >
              <div class="min-w-0 flex-1">
                <p class="flex flex-wrap items-baseline gap-2">
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{
                    comment.author?.displayName || comment.authorName
                  }}</span>
                  <time
                    [attr.datetime]="comment.createdAt"
                    class="text-xs text-gray-500 dark:text-gray-400"
                    >{{ comment.createdAt | date: 'medium' }}</time
                  >
                </p>
                @if (comment.body) {
                  <p
                    class="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200"
                  >
                    @for (segment of comment.segments; track $index) {
                      @if (segment.isMention) {
                        <span
                          class="rounded bg-indigo-100 px-1 font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                          >{{ segment.text }}</span
                        >
                      } @else {
                        <span>{{ segment.text }}</span>
                      }
                    }
                  </p>
                }
                @if (comment.attachments.length > 0) {
                  <ul class="mt-2 flex flex-wrap gap-2" aria-label="Comment attachments">
                    @for (file of comment.attachments; track file.url) {
                      <li>
                        <a
                          [href]="file.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex max-w-xs items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-blue-600 hover:underline dark:border-gray-600 dark:bg-gray-900 dark:text-blue-400"
                        >
                          <i
                            [class]="isImage(file.name) ? 'pi pi-image' : 'pi pi-file'"
                            aria-hidden="true"
                          ></i>
                          <span class="truncate">{{ file.name }}</span>
                        </a>
                      </li>
                    }
                  </ul>
                }
              </div>
            </li>
          } @empty {
            <li class="text-sm text-gray-500 dark:text-gray-400">
              No comments yet. Start the conversation below.
            </li>
          }
        </ol>

        <div class="border-t border-gray-200 pt-4 dark:border-gray-700">
          <label for="newComment" class="mb-1 block text-sm font-medium">Add a comment</label>
          <app-mention-textarea
            inputId="newComment"
            placeholder="Write a comment"
            [users]="users()"
            [value]="draft()"
            [disabled]="posting()"
            (valueChange)="draft.set($event)"
            (mentionsChange)="mentions.set($event)"
            (submitShortcut)="post()"
          />

          @if (files().length > 0) {
            <ul class="mt-2 flex flex-col gap-1" aria-label="Files to attach">
              @for (file of files(); track file.name + file.size; let i = $index) {
                <li
                  class="flex items-center justify-between gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <span class="truncate">
                    <i class="pi pi-paperclip mr-2 text-gray-400" aria-hidden="true"></i
                    >{{ file.name }}
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

          <div class="mt-3 flex items-center justify-between gap-2">
            <input
              #fileInput
              type="file"
              multiple
              class="hidden"
              aria-label="Attach files to the comment"
              (change)="onFilesSelected($event)"
            />
            <p-button
              type="button"
              label="Attach"
              icon="pi pi-paperclip"
              severity="secondary"
              [outlined]="true"
              size="small"
              (onClick)="fileInput.click()"
            />
            <p-button
              type="button"
              label="Comment"
              icon="pi pi-send"
              [disabled]="!canPost()"
              [loading]="posting()"
              (onClick)="post()"
            />
          </div>
        </div>
      }
    </section>
  `,
})
export class TicketCommentsComponent implements OnInit {
  private readonly itSupportService = inject(ItSupportService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly composer = viewChild(MentionTextareaComponent);

  readonly ticketId = input.required<string>();
  readonly highlightCommentId = input<string | null>(null);

  readonly comments = signal<ItTicketComment[]>([]);
  readonly loading = signal(true);
  readonly posting = signal(false);
  readonly draft = signal('');
  readonly mentions = signal<User[]>([]);
  readonly files = signal<File[]>([]);
  readonly highlightedId = signal<string | null>(null);

  readonly users = this.userService.users;

  readonly canPost = computed(
    () => !this.posting() && (this.draft().trim().length > 0 || this.files().length > 0),
  );

  readonly renderedComments = computed<RenderedComment[]>(() =>
    this.comments().map((comment) => ({
      ...comment,
      initials: this.initials(comment.author?.displayName || comment.authorName),
      segments: this.toSegments(comment),
    })),
  );

  constructor() {
    effect(() => {
      const target = this.highlightCommentId();
      const loaded = this.comments().length > 0;
      if (!target || !loaded) return;

      untracked(() => {
        this.highlightedId.set(target);
        setTimeout(() => {
          document
            .getElementById(`comment-${target}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    });
  }

  ngOnInit(): void {
    if (this.users().length === 0) {
      this.userService.loadUsers();
    }
    this.load();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    if (selected.length > 0) {
      this.files.update((current) => [...current, ...selected]);
    }
    input.value = '';
  }

  removeFile(index: number): void {
    this.files.update((current) => current.filter((_, i) => i !== index));
  }

  post(): void {
    if (!this.canPost()) return;

    this.posting.set(true);
    this.itSupportService
      .addComment(this.ticketId(), {
        body: this.draft().trim(),
        mentionIds: this.mentions().map((user) => user.id),
        files: this.files(),
      })
      .pipe(take(1))
      .subscribe({
        next: (comment) => {
          this.comments.update((current) => [...current, comment]);
          this.draft.set('');
          this.mentions.set([]);
          this.files.set([]);
          this.composer()?.reset();
          this.posting.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Comment posted',
            life: 2500,
          });
        },
        error: () => this.posting.set(false),
      });
  }

  isImage(name: string): boolean {
    return /\.(png|jpe?g|gif|webp|bmp|svg|heic)$/i.test(name);
  }

  private load(): void {
    this.loading.set(true);
    this.itSupportService
      .getComments(this.ticketId())
      .pipe(take(1))
      .subscribe({
        next: (comments) => {
          this.comments.set(comments);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private initials(name: string): string {
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  }

  private toSegments(comment: ItTicketComment): BodySegment[] {
    const names = (comment.mentions ?? [])
      .map((user) => user.displayName)
      .filter((name): name is string => !!name)
      .sort((a, b) => b.length - a.length);

    if (names.length === 0 || !comment.body) {
      return [{ text: comment.body, isMention: false }];
    }

    const pattern = new RegExp(
      `@(?:${names.map((name) => this.escapeRegExp(name)).join('|')})`,
      'g',
    );
    const segments: BodySegment[] = [];
    let lastIndex = 0;

    for (const match of comment.body.matchAll(pattern)) {
      const start = match.index ?? 0;
      if (start > lastIndex) {
        segments.push({ text: comment.body.slice(lastIndex, start), isMention: false });
      }
      segments.push({ text: match[0], isMention: true });
      lastIndex = start + match[0].length;
    }
    if (lastIndex < comment.body.length) {
      segments.push({ text: comment.body.slice(lastIndex), isMention: false });
    }
    return segments;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
