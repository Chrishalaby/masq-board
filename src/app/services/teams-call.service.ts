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
    await this.openCallLink(teamsUserId, false);
  }

  async startVideoCall(teamsUserId: string): Promise<void> {
    await this.openCallLink(teamsUserId, true);
  }

  async startScreenShare(teamsUserId: string): Promise<void> {
    await this.openCallLink(teamsUserId, true);
  }

  private async openCallLink(teamsUserId: string, withVideo: boolean): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.initialized) return;

    const deepLink = `https://teams.microsoft.com/l/call/0/0?users=${encodeURIComponent(teamsUserId)}&withVideo=${withVideo}&source=desktopclient`;
    try {
      await microsoftTeams.app.openLink(deepLink);
    } catch (error) {
      console.error('Failed to open call link:', error);
    }
  }
}
