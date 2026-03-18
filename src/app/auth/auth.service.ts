import { Injectable, computed, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import * as microsoftTeams from '@microsoft/teams-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly msal = inject(MsalService);

  private readonly activeAccountSignal = signal<AccountInfo | null>(null);
  private readonly teamsAuthenticatedSignal = signal(false);
  private readonly teamsDisplayNameSignal = signal('');
  private readonly isTeamsContextSignal = signal(false);

  readonly isAuthenticated = computed(
    () => !!this.activeAccountSignal() || this.teamsAuthenticatedSignal(),
  );
  readonly activeAccount = this.activeAccountSignal.asReadonly();
  readonly displayName = computed(
    () => this.activeAccountSignal()?.name ?? this.teamsDisplayNameSignal(),
  );
  readonly inTeamsContext = this.isTeamsContextSignal.asReadonly();

  async initialize(): Promise<void> {
    await this.msal.instance.initialize();
    await this.msal.instance.handleRedirectPromise();
    console.info('[Auth] initialize:start', {
      existingAccounts: this.msal.instance.getAllAccounts().length,
    });

    // Check if we're running inside Microsoft Teams
    try {
      await microsoftTeams.app.initialize();
      this.isTeamsContextSignal.set(true);

      const context = await microsoftTeams.app.getContext();
      this.teamsDisplayNameSignal.set(context.user?.displayName ?? '');
      console.info('[Auth] Teams context detected', {
        displayName: context.user?.displayName ?? '',
        loginHint: context.user?.loginHint ?? '',
      });
      await this.acquireTeamsToken();
    } catch {
      // Not in Teams context — standard MSAL flow
      this.isTeamsContextSignal.set(false);
      const accounts = this.msal.instance.getAllAccounts();
      console.info('[Auth] Browser context detected', { accounts: accounts.length });
      if (accounts.length) {
        this.msal.instance.setActiveAccount(accounts[0]);
        this.activeAccountSignal.set(accounts[0]);
        console.info('[Auth] Active account restored', { username: accounts[0].username });
      }
    }
  }

  async login(): Promise<void> {
    if (this.isTeamsContextSignal()) {
      await this.acquireTeamsToken();
      return;
    }

    try {
      const result = await this.msal.instance.loginPopup({
        scopes: environment.msalConfig.apiScopes,
      });
      this.msal.instance.setActiveAccount(result.account);
      this.activeAccountSignal.set(result.account);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  async logout(): Promise<void> {
    if (this.isTeamsContextSignal()) {
      // Can't sign out from within Teams — the Teams shell manages auth
      return;
    }
    await this.msal.instance.logoutPopup();
    this.activeAccountSignal.set(null);
  }

  private async acquireTeamsToken(): Promise<void> {
    try {
      const ssoToken = await microsoftTeams.authentication.getAuthToken();
      const tokenPayload = this.decodeJwtPayload(ssoToken);
      const loginHint =
        tokenPayload['preferred_username'] || tokenPayload['upn'] || tokenPayload['email'];
      console.info('[Auth] Teams getAuthToken succeeded', {
        hasSsoToken: !!ssoToken,
        loginHint,
      });

      this.teamsAuthenticatedSignal.set(true);
      if (!this.teamsDisplayNameSignal()) {
        this.teamsDisplayNameSignal.set(tokenPayload['name'] || '');
      }

      // Use ssoSilent to acquire an MSAL token using the Teams SSO context
      const result = await this.msal.instance.ssoSilent({
        scopes: environment.msalConfig.apiScopes,
        loginHint,
      });
      console.info('[Auth] ssoSilent resolved', {
        hasAccount: !!result?.account,
        username: result?.account?.username ?? null,
      });

      if (result?.account) {
        this.msal.instance.setActiveAccount(result.account);
        this.activeAccountSignal.set(result.account);
        return;
      }
    } catch (error) {
      // Keep Teams session active even if MSAL silent token acquisition fails.
      // This avoids opening auth popups/tabs inside Teams.
      console.error('[Auth] Teams silent auth failed', error);
    }
  }

  private decodeJwtPayload(token: string): Record<string, string> {
    const payload = token.split('.')[1] || '';
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  }
}
