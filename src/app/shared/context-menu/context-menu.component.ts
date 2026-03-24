import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';
import { Task } from '../../models/task.model';
import { User } from '../../models/user.model';
import { TeamsCallService } from '../../services/teams-call.service';

export interface ContextMenuTarget {
  task?: Task;
  user?: User;
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
  private currentUser = signal<User | null>(null);

  readonly menuItems = signal<MenuItem[]>([
    {
      label: 'Call',
      icon: 'pi pi-phone',
      command: () => this.callTarget(),
    },
    {
      label: 'Video Call',
      icon: 'pi pi-video',
      command: () => this.videoCallTarget(),
    },
    {
      label: 'Share Screen',
      icon: 'pi pi-desktop',
      command: () => this.shareScreenTarget(),
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
    this.currentUser.set(target.user ?? null);
    this.targetEl.set(target.element);
  }

  openForUser(user: User, element: HTMLElement, event: MouseEvent): void {
    this.currentUser.set(user);
    this.currentTask.set(null);
    this.targetEl.set(element);
  }

  private getTeamsId(): string | null {
    const user = this.currentUser();
    if (user?.teamsId) return user.teamsId;
    const task = this.currentTask();
    return task?.assignee?.teamsId ?? null;
  }

  private callTarget(): void {
    const teamsId = this.getTeamsId();
    if (teamsId) {
      this.teamsCallService.startCall(teamsId);
    }
  }

  private videoCallTarget(): void {
    const teamsId = this.getTeamsId();
    if (teamsId) {
      this.teamsCallService.startVideoCall(teamsId);
    }
  }

  private shareScreenTarget(): void {
    const teamsId = this.getTeamsId();
    if (teamsId) {
      this.teamsCallService.startScreenShare(teamsId);
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
