import { Injectable, computed, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import * as microsoftTeams from '@microsoft/teams-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly msal = inject(MsalService);

  private readonly activeAccountSignal = signal<AccountInfo | null>(null);
  readonly isAuthenticated = computed(() => !!this.activeAccountSignal());
  readonly activeAccount = this.activeAccountSignal.asReadonly();
  readonly displayName = computed(() => this.activeAccountSignal()?.name ?? '');

  private isTeamsContext = false;

  async initialize(): Promise<void> {
    await this.msal.instance.initialize();
    await this.msal.instance.handleRedirectPromise();

    // Check if we're running inside Microsoft Teams
    try {
      await microsoftTeams.app.initialize();
      this.isTeamsContext = true;
      await this.acquireTeamsToken();
    } catch {
      // Not in Teams context — standard MSAL flow
      this.isTeamsContext = false;
      const accounts = this.msal.instance.getAllAccounts();
      if (accounts.length) {
        this.msal.instance.setActiveAccount(accounts[0]);
        this.activeAccountSignal.set(accounts[0]);
      }
    }
  }

  async login(): Promise<void> {
    if (this.isTeamsContext) {
      await this.acquireTeamsToken();
      return;
    }

    try {
      const result = await this.msal.instance.loginPopup({
        scopes: environment.msalConfig.scopes,
      });
      this.msal.instance.setActiveAccount(result.account);
      this.activeAccountSignal.set(result.account);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  async logout(): Promise<void> {
    await this.msal.instance.logoutPopup();
    this.activeAccountSignal.set(null);
  }

  private async acquireTeamsToken(): Promise<void> {
    try {
      const token = await microsoftTeams.authentication.getAuthToken();
      // Use the Teams SSO token to set the active account
      const accounts = this.msal.instance.getAllAccounts();
      if (accounts.length) {
        this.msal.instance.setActiveAccount(accounts[0]);
        this.activeAccountSignal.set(accounts[0]);
      }
    } catch (error) {
      console.error('Teams SSO token acquisition failed:', error);
    }
  }
}
