import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';
import { Task } from '../../models/task.model';
import { TeamsCallService } from '../../services/teams-call.service';

export interface ContextMenuTarget {
  task?: Task;
  element: HTMLElement;
  event: MouseEvent;
}

@Component({
  selector: 'app-context-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContextMenu],
  template: ` <p-contextmenu [model]="menuItems()" [target]="targetEl()" /> `,
})
export class ContextMenuComponent {
  private readonly teamsCallService = inject(TeamsCallService);

  readonly viewDetails = output<Task>();
  readonly targetEl = signal<HTMLElement | null>(null);

  private currentTask = signal<Task | null>(null);

  readonly menuItems = signal<MenuItem[]>([
    {
      label: 'Call Assignee',
      icon: 'pi pi-phone',
      command: () => this.callAssignee(),
    },
    {
      label: 'Share Screen',
      icon: 'pi pi-desktop',
      command: () => this.shareScreen(),
    },
    { separator: true },
    {
      label: 'View Details',
      icon: 'pi pi-eye',
      command: () => {
        const t = this.currentTask();
        if (t) this.viewDetails.emit(t);
      },
    },
    {
      label: 'Copy Link',
      icon: 'pi pi-link',
      command: () => this.copyLink(),
    },
  ]);

  open(target: ContextMenuTarget): void {
    this.currentTask.set(target.task ?? null);
    this.targetEl.set(target.element);
  }

  private callAssignee(): void {
    const task = this.currentTask();
    if (task?.assignee?.teamsId) {
      this.teamsCallService.startCall(task.assignee.teamsId);
    }
  }

  private shareScreen(): void {
    const task = this.currentTask();
    if (task?.assignee?.teamsId) {
      this.teamsCallService.startVideoCall(task.assignee.teamsId);
    }
  }

  private copyLink(): void {
    const task = this.currentTask();
    if (task) {
      const url = `${window.location.origin}/tasks?id=${encodeURIComponent(task.id)}`;
      navigator.clipboard.writeText(url);
    }
  }
}
