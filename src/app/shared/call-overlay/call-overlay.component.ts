import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { TeamsCallService } from '../../services/teams-call.service';

export interface CallInfo {
  targetName: string;
  targetTeamsId: string;
  isVideo: boolean;
}

@Component({
  selector: 'app-call-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  host: {
    '[style.display]': 'active() ? "block" : "none"',
  },
  template: `
    @if (active()) {
      <div
        class="fixed bottom-6 right-6 z-50 flex min-w-64 flex-col gap-3 rounded-2xl bg-gray-900 p-4 text-white shadow-2xl"
        role="dialog"
        aria-label="Active call"
      >
        <div class="flex items-center justify-between">
          <span class="flex items-center gap-2">
            <i [class]="callInfo()!.isVideo ? 'pi pi-video' : 'pi pi-phone'" class="text-lg"></i>
            <span class="font-semibold">{{ callInfo()!.targetName }}</span>
          </span>
          <span class="text-sm text-gray-400">{{ elapsedDisplay() }}</span>
        </div>

        <div class="flex items-center justify-center gap-4">
          <p-button
            [icon]="muted() ? 'pi pi-microphone-slash' : 'pi pi-microphone'"
            [rounded]="true"
            [severity]="muted() ? 'warn' : 'secondary'"
            (onClick)="toggleMute()"
            ariaLabel="Toggle mute"
          />
          <p-button
            icon="pi pi-phone"
            [rounded]="true"
            severity="danger"
            (onClick)="endCall()"
            ariaLabel="End call"
          />
        </div>
      </div>
    }
  `,
})
export class CallOverlayComponent {
  private readonly teamsCallService = inject(TeamsCallService);

  readonly callInfo = signal<CallInfo | null>(null);
  readonly active = computed(() => this.callInfo() !== null);
  readonly muted = signal(false);
  readonly elapsed = signal(0);

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  readonly elapsedDisplay = computed(() => {
    const sec = this.elapsed();
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  async startCall(info: CallInfo): Promise<void> {
    this.callInfo.set(info);
    this.muted.set(false);
    this.elapsed.set(0);
    this.timerInterval = setInterval(() => this.elapsed.update((v) => v + 1), 1000);

    if (info.isVideo) {
      await this.teamsCallService.startVideoCall(info.targetTeamsId);
    } else {
      await this.teamsCallService.startCall(info.targetTeamsId);
    }
  }

  toggleMute(): void {
    this.muted.update((v) => !v);
  }

  endCall(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.callInfo.set(null);
  }
}
