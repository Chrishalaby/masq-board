import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { Button } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { User } from '../../models/user.model';
import { TeamsCallService } from '../../services/teams-call.service';

@Component({
  selector: 'app-call-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Popover, Button],
  template: `
    <p-popover #pop>
      <div class="flex items-center gap-2">
        <span class="mr-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ currentUser()?.displayName }}
        </span>
        <p-button
          icon="pi pi-phone"
          [rounded]="true"
          [text]="true"
          severity="success"
          size="small"
          pTooltip="Call"
          tooltipPosition="top"
          (onClick)="call()"
          aria-label="Audio call"
        />
        <p-button
          icon="pi pi-video"
          [rounded]="true"
          [text]="true"
          severity="info"
          size="small"
          pTooltip="Video Call"
          tooltipPosition="top"
          (onClick)="videoCall()"
          aria-label="Video call"
        />
        <p-button
          icon="pi pi-desktop"
          [rounded]="true"
          [text]="true"
          severity="warn"
          size="small"
          pTooltip="Share Screen"
          tooltipPosition="top"
          (onClick)="shareScreen()"
          aria-label="Share screen"
        />
      </div>
    </p-popover>
  `,
})
export class CallPopoverComponent {
  private readonly teamsCallService = inject(TeamsCallService);
  private readonly popover = viewChild<Popover>('pop');

  readonly currentUser = signal<User | null>(null);

  show(user: User, event: MouseEvent): void {
    this.currentUser.set(user);
    this.popover()?.show(event);
  }

  hide(): void {
    this.popover()?.hide();
  }

  protected call(): void {
    const id = this.currentUser()?.teamsId;
    if (id) this.teamsCallService.startCall(id);
  }

  protected videoCall(): void {
    const id = this.currentUser()?.teamsId;
    if (id) this.teamsCallService.startVideoCall(id);
  }

  protected shareScreen(): void {
    const id = this.currentUser()?.teamsId;
    if (id) this.teamsCallService.startScreenShare(id);
  }
}
