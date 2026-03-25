import { Injectable } from '@angular/core';
import * as microsoftTeams from '@microsoft/teams-js';

@Injectable({ providedIn: 'root' })
export class TeamsCallService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await microsoftTeams.app.initialize();
      this.initialized = true;
    } catch {
      console.warn('Teams SDK not available — calling features disabled');
    }
  }

  async startCall(teamsUserId: string): Promise<void> {
    await this.makeCall(teamsUserId, [microsoftTeams.call.CallModalities.Audio]);
  }

  async startVideoCall(teamsUserId: string): Promise<void> {
    await this.makeCall(teamsUserId, [
      microsoftTeams.call.CallModalities.Audio,
      microsoftTeams.call.CallModalities.Video,
    ]);
  }

  async startScreenShare(teamsUserId: string): Promise<void> {
    await this.makeCall(teamsUserId, [
      microsoftTeams.call.CallModalities.Audio,
      microsoftTeams.call.CallModalities.Video,
    ]);
  }

  private toMri(teamsUserId: string): string {
    if (teamsUserId.startsWith('8:')) return teamsUserId;
    return `8:orgid:${teamsUserId}`;
  }

  private async makeCall(
    teamsUserId: string,
    modalities: microsoftTeams.call.CallModalities[],
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.initialized) return;

    try {
      microsoftTeams.call.startCall({
        targets: [this.toMri(teamsUserId)],
        requestedModalities: modalities,
      });
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  }
}
