import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { take } from 'rxjs/operators';
import {
  AppNotification,
  NOTIFICATION_CATEGORY_LABELS,
  NotificationCategory,
} from '../../../models/notification.model';
import { Project } from '../../../models/project.model';
import { NotificationService } from '../../../services/notification.service';
import { ProjectService } from '../../../services/project.service';

@Component({
  selector: 'app-notification-center',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  imports: [Button, ProgressSpinner, Tag, Toast],
  template: `
    <p-toast />

    <header
      class="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-700"
    >
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Notification Center</h1>
        @if (unreadCount() > 0) {
          <p-tag [value]="unreadCount() + ' unread'" severity="danger" />
        }
      </div>
      @if (unreadCount() > 0) {
        <p-button
          label="Mark all as read"
          icon="pi pi-check-circle"
          severity="secondary"
          [outlined]="true"
          size="small"
          (onClick)="markAllRead()"
        />
      }
    </header>

    @if (notificationService.loading() || projectService.loading()) {
      <div class="flex justify-center py-16">
        <p-progressspinner strokeWidth="4" [style]="{ width: '2rem', height: '2rem' }" />
      </div>
    } @else if (isEmpty()) {
      <div class="flex flex-col items-center gap-3 py-20 text-gray-400 dark:text-gray-500">
        <i class="pi pi-bell text-4xl"></i>
        <p class="text-sm">You're all caught up — no notifications.</p>
      </div>
    } @else {
      <div class="flex flex-col gap-8 p-6">
        <!-- Apollo Pending Projects section -->
        @if (pendingApolloProjects().length > 0) {
          <section aria-labelledby="apollo-heading">
            <h2
              id="apollo-heading"
              class="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400"
            >
              {{ categoryLabel('apollo-project') }}
            </h2>
            <div class="flex flex-col gap-2">
              @for (project of pendingApolloProjects(); track project.id) {
                <div
                  class="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950"
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="font-medium text-gray-900 dark:text-gray-100">{{
                      project.name
                    }}</span>
                    @if (project.description) {
                      <span class="text-xs text-gray-500 dark:text-gray-400">{{
                        project.description
                      }}</span>
                    }
                    <span class="mt-1 text-xs text-amber-700 dark:text-amber-400"
                      >Apollo ID: {{ project.apolloProjectId }}</span
                    >
                  </div>
                  <div class="flex items-center gap-2">
                    <p-button
                      label="Accept"
                      icon="pi pi-check"
                      size="small"
                      severity="success"
                      [loading]="isAccepting(project.id)"
                      (onClick)="acceptProject(project)"
                    />
                    <p-button
                      label="Dismiss"
                      icon="pi pi-times"
                      size="small"
                      severity="secondary"
                      [outlined]="true"
                      [loading]="isDismissing(project.id)"
                      (onClick)="dismissProject(project)"
                    />
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- Regular notification categories -->
        @for (entry of notificationGroups(); track entry.category) {
          <section [attr.aria-labelledby]="entry.category + '-heading'">
            <h2
              [id]="entry.category + '-heading'"
              class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              {{ categoryLabel(entry.category) }}
            </h2>
            <div class="flex flex-col gap-2">
              @for (notification of entry.items; track notification.id) {
                <div
                  class="flex items-start justify-between rounded-lg border px-4 py-3 transition-colors"
                  [class]="
                    notification.status === 'unread'
                      ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                  "
                >
                  <div class="flex flex-col gap-0.5">
                    <span
                      class="font-medium text-gray-900 dark:text-gray-100"
                      [class.font-semibold]="notification.status === 'unread'"
                      >{{ notification.title }}</span
                    >
                    @if (notification.body) {
                      <span class="text-sm text-gray-600 dark:text-gray-400">{{
                        notification.body
                      }}</span>
                    }
                    <span class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{
                      formatDate(notification.createdAt)
                    }}</span>
                  </div>
                  <div class="flex shrink-0 items-center gap-1 pl-4">
                    @if (notification.status === 'unread') {
                      <p-button
                        icon="pi pi-eye"
                        [text]="true"
                        size="small"
                        severity="secondary"
                        ariaLabel="Mark as read"
                        (onClick)="markRead(notification)"
                      />
                    }
                    <p-button
                      icon="pi pi-times"
                      [text]="true"
                      size="small"
                      severity="secondary"
                      ariaLabel="Dismiss notification"
                      (onClick)="dismiss(notification)"
                    />
                  </div>
                </div>
              }
            </div>
          </section>
        }
      </div>
    }
  `,
})
export class NotificationCenterComponent implements OnInit {
  protected readonly notificationService = inject(NotificationService);
  protected readonly projectService = inject(ProjectService);
  private readonly messageService = inject(MessageService);

  /** IDs of projects currently being accepted */
  private readonly _accepting = signal<Set<string>>(new Set());
  /** IDs of projects currently being dismissed */
  private readonly _dismissing = signal<Set<string>>(new Set());

  readonly unreadCount = this.notificationService.unreadCount;

  readonly pendingApolloProjects = computed(() =>
    this.projectService.projects().filter((p) => p.isPendingApproval),
  );

  readonly notificationGroups = computed(() => {
    const map = this.notificationService.byCategory();
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  });

  readonly isEmpty = computed(
    () => this.pendingApolloProjects().length === 0 && this.notificationGroups().length === 0,
  );

  ngOnInit(): void {
    this.notificationService.loadNotifications();
    this.projectService.loadProjects();
  }

  categoryLabel(category: NotificationCategory): string {
    return NOTIFICATION_CATEGORY_LABELS[category];
  }

  isAccepting(projectId: string): boolean {
    return this._accepting().has(projectId);
  }

  isDismissing(projectId: string): boolean {
    return this._dismissing().has(projectId);
  }

  acceptProject(project: Project): void {
    this._accepting.update((s) => new Set([...s, project.id]));
    this.projectService
      .acceptApolloProject(project.id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this._accepting.update((s) => {
            const next = new Set(s);
            next.delete(project.id);
            return next;
          });
          this.messageService.add({
            severity: 'success',
            summary: 'Project Accepted',
            detail: `"${project.name}" has been created as a full project.`,
            life: 4000,
          });
        },
        error: () => {
          this._accepting.update((s) => {
            const next = new Set(s);
            next.delete(project.id);
            return next;
          });
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to accept project. Please try again.',
            life: 5000,
          });
        },
      });
  }

  dismissProject(project: Project): void {
    this._dismissing.update((s) => new Set([...s, project.id]));
    this.projectService
      .dismissApolloProject(project.id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this._dismissing.update((s) => {
            const next = new Set(s);
            next.delete(project.id);
            return next;
          });
        },
        error: () => {
          this._dismissing.update((s) => {
            const next = new Set(s);
            next.delete(project.id);
            return next;
          });
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to dismiss project.',
            life: 5000,
          });
        },
      });
  }

  markRead(notification: AppNotification): void {
    this.notificationService.markAsRead(notification.id).pipe(take(1)).subscribe();
  }

  markAllRead(): void {
    this.notificationService.markAllRead().pipe(take(1)).subscribe();
  }

  dismiss(notification: AppNotification): void {
    this.notificationService.dismiss(notification.id).pipe(take(1)).subscribe();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
