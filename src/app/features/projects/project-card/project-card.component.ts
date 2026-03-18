import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Tag } from 'primeng/tag';
import { Project, ProjectStatus } from '../../../models/project.model';

@Component({
  selector: 'app-project-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, Tag],
  template: `
    <div
      class="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
      [class.border-l-4]="project().isHot"
      [class.border-l-red-500]="project().isHot"
      (click)="cardClick.emit(project())"
      role="button"
      [attr.aria-label]="'Open project: ' + project().name"
      tabindex="0"
      (keydown.enter)="cardClick.emit(project())"
      (keydown.space)="cardClick.emit(project()); $event.preventDefault()"
    >
      <div class="mb-2 flex items-start justify-between gap-2">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">{{ project().name }}</h3>
        <div class="flex items-center gap-1">
          @if (project().isHot) {
            <span class="text-sm" title="Hot project">🔥</span>
          }
          <p-tag [value]="project().status" [severity]="statusSeverity()" [rounded]="true" />
        </div>
      </div>

      @if (project().description) {
        <p class="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
          {{ project().description }}
        </p>
      }

      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div class="flex items-center gap-3">
          @if (project().members?.length) {
            <span>👥 {{ project().members!.length }} members</span>
          }
          @if (project().taskCount !== undefined) {
            <span>📋 {{ project().taskCount }} tasks</span>
          }
        </div>
        @if (project().endDate) {
          <span>Due: {{ project().endDate | date: 'mediumDate' }}</span>
        }
      </div>
    </div>
  `,
})
export class ProjectCardComponent {
  readonly project = input.required<Project>();
  readonly cardClick = output<Project>();

  protected readonly statusSeverity = computed(() => {
    const map: Record<ProjectStatus, 'danger' | 'warn' | 'info' | 'success' | 'secondary'> = {
      draft: 'secondary',
      active: 'info',
      'on-hold': 'warn',
      completed: 'success',
      archived: 'danger',
    };
    return map[this.project().status];
  });
}
