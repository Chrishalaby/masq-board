import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Chip } from 'primeng/chip';
import { Dialog } from 'primeng/dialog';
import { ProgressBar } from 'primeng/progressbar';
import { Tag } from 'primeng/tag';
import { Task, TaskPriority } from '../../../models/task.model';

@Component({
  selector: 'app-task-detail-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, Dialog, Tag, Chip, ProgressBar],
  template: `
    <p-dialog
      header="Task Details"
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [style]="{ width: '44rem' }"
      [dismissableMask]="true"
      [draggable]="false"
    >
      @if (task(); as t) {
        <div class="flex flex-col gap-5 pt-2">
          <!-- Header: Title & Priority -->
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ t.title }}</h2>
            <p-tag [value]="t.priority" [severity]="prioritySeverity()" [rounded]="true" />
          </div>

          <!-- Status -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Status:</span>
              <p-tag [value]="t.status" [severity]="statusSeverity()" [rounded]="true" />
            </div>
            @if (t.isRecurring) {
              <span
                class="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300"
              >
                🔁 Recurring
              </span>
            }
          </div>

          <!-- Assignees -->
          @if (t.assignees?.length) {
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Assignees</span>
              <div class="flex flex-wrap gap-2">
                @for (a of t.assignees; track a.userId) {
                  <p-chip [label]="a.user?.displayName || a.userId">
                    @if (a.role) {
                      <span class="ml-1 text-xs text-gray-400">({{ a.role }})</span>
                    }
                  </p-chip>
                }
              </div>
            </div>
          }

          <!-- Project / Initiative -->
          <div class="grid grid-cols-2 gap-4">
            @if (t.project) {
              <div class="flex flex-col gap-0.5">
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Project</span>
                <span class="text-sm text-indigo-600 dark:text-indigo-400">
                  📁 {{ t.project.name }}
                </span>
              </div>
            }
            @if (t.initiative) {
              <div class="flex flex-col gap-0.5">
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Initiative</span>
                <span class="text-sm text-purple-600 dark:text-purple-400">
                  🚩 {{ t.initiative.name }}
                </span>
              </div>
            }
          </div>

          <!-- Dates -->
          <div class="grid grid-cols-2 gap-4">
            @if (t.startDate) {
              <div class="flex flex-col gap-0.5">
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</span>
                <span class="text-sm text-gray-900 dark:text-gray-100">
                  {{ t.startDate | date: 'mediumDate' }}
                </span>
              </div>
            }
            @if (t.dueDate) {
              <div class="flex flex-col gap-0.5">
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</span>
                <span class="text-sm text-gray-900 dark:text-gray-100">
                  {{ t.dueDate | date: 'mediumDate' }}
                </span>
              </div>
            }
          </div>

          <!-- Description -->
          @if (t.description) {
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Description</span>
              <p class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {{ t.description }}
              </p>
            </div>
          }

          <!-- Milestones -->
          @if (t.milestoneAchieved || t.currentMilestone || t.nextMilestone) {
            <div class="grid grid-cols-3 gap-3">
              @if (t.milestoneAchieved) {
                <div
                  class="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
                >
                  <span class="text-xs font-medium text-green-600 dark:text-green-400"
                    >Achieved</span
                  >
                  <p class="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                    {{ t.milestoneAchieved }}
                  </p>
                </div>
              }
              @if (t.currentMilestone) {
                <div
                  class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
                >
                  <span class="text-xs font-medium text-blue-600 dark:text-blue-400">Current</span>
                  <p class="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                    {{ t.currentMilestone }}
                  </p>
                </div>
              }
              @if (t.nextMilestone) {
                <div
                  class="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20"
                >
                  <span class="text-xs font-medium text-amber-600 dark:text-amber-400">Next</span>
                  <p class="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                    {{ t.nextMilestone }}
                  </p>
                </div>
              }
            </div>
          }

          <!-- Delay Risk -->
          @if (t.delayRisk) {
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Delay Risk</span>
              <span class="text-sm text-red-600 dark:text-red-400">⚠️ {{ t.delayRisk }}</span>
            </div>
          }

          <!-- Labels -->
          @if (t.labels?.length) {
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Labels</span>
              <div class="flex flex-wrap gap-1">
                @for (label of t.labels; track label.id || label.name) {
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-medium"
                    [style.background-color]="(label.color || '#3B82F6') + '20'"
                    [style.color]="label.color || '#3B82F6'"
                  >
                    {{ label.name }}
                  </span>
                }
              </div>
            </div>
          }

          <!-- Checklist -->
          @if (checklistProgress(); as progress) {
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Checklist</span>
                <span class="text-xs text-gray-500">{{ progress.done }}/{{ progress.total }}</span>
              </div>
              <p-progressBar [value]="progress.percent" [style]="{ height: '8px' }" />
              <div class="flex flex-col gap-1">
                @for (item of t.checklist; track $index) {
                  <div class="flex items-center gap-2 text-sm">
                    <i
                      [class]="
                        item.completed
                          ? 'pi pi-check-circle text-green-500'
                          : 'pi pi-circle text-gray-300'
                      "
                    ></i>
                    <span
                      [class.line-through]="item.completed"
                      [class.text-gray-400]="item.completed"
                      class="text-gray-700 dark:text-gray-300"
                    >
                      {{ item.title }}
                    </span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Dependencies -->
          @if (t.dependencies?.length) {
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Dependencies</span>
              <div class="flex flex-col gap-1">
                @for (dep of t.dependencies; track dep.id) {
                  <div
                    class="flex items-center gap-2 rounded bg-gray-50 px-3 py-1.5 text-sm dark:bg-gray-800"
                  >
                    <span>🔗</span>
                    <span class="text-gray-700 dark:text-gray-300">
                      {{ dep.dependsOn?.title || dep.dependsOnTaskId }}
                    </span>
                    <span class="text-xs text-gray-400">({{ dep.type }})</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Linked Files -->
          @if (t.linkedFiles?.length) {
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Files</span>
              <div class="flex flex-col gap-1">
                @for (url of t.linkedFiles; track url; let i = $index) {
                  <a
                    [href]="url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <i class="pi pi-file"></i>
                    {{ fileNameAt(t, i) }}
                  </a>
                }
              </div>
            </div>
          }
        </div>
      }
    </p-dialog>
  `,
})
export class TaskDetailViewComponent {
  readonly task = input<Task | null>(null);
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  protected readonly prioritySeverity = computed(() => {
    const map: Record<TaskPriority, 'danger' | 'warn' | 'info' | 'success'> = {
      urgent: 'danger',
      high: 'warn',
      medium: 'info',
      low: 'success',
    };
    return this.task() ? map[this.task()!.priority] : 'info';
  });

  protected readonly statusSeverity = computed(() => {
    const t = this.task();
    if (!t) return 'info' as const;
    const map: Record<string, 'danger' | 'warn' | 'info' | 'success' | 'secondary'> = {
      'not-started': 'secondary',
      'on-hold': 'warn',
      'in-progress': 'info',
      completed: 'success',
    };
    return map[t.status] ?? 'info';
  });

  protected readonly checklistProgress = computed(() => {
    const checklist = this.task()?.checklist;
    if (!checklist?.length) return null;
    const done = checklist.filter((c) => c.completed).length;
    return { done, total: checklist.length, percent: Math.round((done / checklist.length) * 100) };
  });

  protected urlLabel(url: string): string {
    try {
      return new URL(url).hostname + new URL(url).pathname.split('/').pop();
    } catch {
      return url;
    }
  }

  protected fileNameAt(task: Task, index: number): string {
    const names = task.linkedFileNames;
    if (names?.[index]) return names[index];
    return this.urlLabel(task.linkedFiles?.[index] ?? '');
  }
}
