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
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.initialized) return;

    try {
      microsoftTeams.call.startCall({
        targets: [teamsUserId],
        requestedModalities: [microsoftTeams.call.CallModalities.Audio],
      });
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  }

  async startVideoCall(teamsUserId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.initialized) return;

    try {
      microsoftTeams.call.startCall({
        targets: [teamsUserId],
        requestedModalities: [
          microsoftTeams.call.CallModalities.Audio,
          microsoftTeams.call.CallModalities.Video,
        ],
      });
    } catch (error) {
      console.error('Failed to start video call:', error);
    }
  }
}
