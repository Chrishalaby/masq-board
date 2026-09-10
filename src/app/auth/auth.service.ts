import { Injectable, computed, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import * as microsoftTeams from '@microsoft/teams-js';
import { environment } from '../../environments/environment';

const TOKEN_REFRESH_MARGIN_MS = 60_000;
const TEAMS_INIT_TIMEOUT_MS = 8000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly msal = inject(MsalService);

  private readonly activeAccountSignal = signal<AccountInfo | null>(null);
  private readonly apiAccessTokenSignal = signal<string | null>(null);
  private readonly apiTokenExpiresAtSignal = signal(0);
  private readonly teamsAuthErrorSignal = signal('');
  private readonly teamsAuthenticatedSignal = signal(false);
  private readonly teamsDisplayNameSignal = signal('');
  private readonly teamsEmailSignal = signal('');
  private readonly teamsOidSignal = signal('');
  private readonly isTeamsContextSignal = signal(false);
  private readonly teamsSubPageIdSignal = signal('');

  readonly isAuthenticated = computed(
    () => !!this.activeAccountSignal() || this.teamsAuthenticatedSignal(),
  );
  readonly activeAccount = this.activeAccountSignal.asReadonly();
  readonly displayName = computed(
    () => this.activeAccountSignal()?.name ?? this.teamsDisplayNameSignal(),
  );
  readonly userEmail = computed(
    () => this.activeAccountSignal()?.username ?? this.teamsEmailSignal(),
  );
  readonly teamsOid = this.teamsOidSignal.asReadonly();
  readonly inTeamsContext = this.isTeamsContextSignal.asReadonly();
  readonly teamsSubPageId = this.teamsSubPageIdSignal.asReadonly();
  readonly teamsAuthError = this.teamsAuthErrorSignal.asReadonly();

  async initialize(): Promise<void> {
    await this.msal.instance.initialize();
    await this.msal.instance.handleRedirectPromise();

    // Check if we're running inside Microsoft Teams
    try {
      await this.withTimeout(microsoftTeams.app.initialize(), 'Teams did not respond');
      this.isTeamsContextSignal.set(true);

      const context = await this.withTimeout(
        microsoftTeams.app.getContext(),
        'Teams did not provide the app context',
      );
      this.teamsDisplayNameSignal.set(context.user?.displayName ?? '');
      this.teamsSubPageIdSignal.set(context.page?.subPageId ?? '');
      await this.acquireTeamsToken();
    } catch (error) {
      if (this.isEmbedded()) {
        this.isTeamsContextSignal.set(true);
        this.teamsAuthErrorSignal.set(
          `${error instanceof Error ? error.message : String(error)}. Update Microsoft Teams or close and reopen the app.`,
        );
        console.error('Teams host initialization failed:', error);
        return;
      }

      // Not in Teams context — standard MSAL flow
      this.isTeamsContextSignal.set(false);
      const accounts = this.msal.instance.getAllAccounts();
      if (accounts.length) {
        this.msal.instance.setActiveAccount(accounts[0]);
        this.activeAccountSignal.set(accounts[0]);
      }
    }
  }

  private isEmbedded(): boolean {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }

  private withTimeout<T>(promise: Promise<T>, reason: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${reason} within ${TEAMS_INIT_TIMEOUT_MS / 1000} seconds`)),
          TEAMS_INIT_TIMEOUT_MS,
        ),
      ),
    ]);
  }

  consumeTeamsSubPageId(): string {
    const subPageId = this.teamsSubPageIdSignal();
    this.teamsSubPageIdSignal.set('');
    return subPageId;
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
    this.apiAccessTokenSignal.set(null);
  }

  async getApiAccessToken(): Promise<string | null> {
    if (this.isTeamsContextSignal()) {
      const existingToken = this.apiAccessTokenSignal();
      if (existingToken && this.apiTokenExpiresAtSignal() - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
        return existingToken;
      }

      return this.refreshApiAccessToken();
    }

    const account = this.activeAccountSignal() || this.msal.instance.getActiveAccount();
    if (!account) {
      return null;
    }

    try {
      const result = await this.msal.instance.acquireTokenSilent({
        scopes: environment.msalConfig.apiScopes,
        account,
      });
      return result.accessToken;
    } catch {
      return null;
    }
  }

  async refreshApiAccessToken(): Promise<string | null> {
    if (!this.isTeamsContextSignal()) {
      return this.getApiAccessToken();
    }
    await this.acquireTeamsToken();
    return this.apiAccessTokenSignal();
  }

  private async acquireTeamsToken(): Promise<void> {
    try {
      const ssoToken = await microsoftTeams.authentication.getAuthToken();
      const tokenPayload = this.decodeJwtPayload(ssoToken);
      const loginHint =
        tokenPayload['preferred_username'] || tokenPayload['upn'] || tokenPayload['email'];
      const expiresAt = Number(tokenPayload['exp']) * 1000;

      this.apiAccessTokenSignal.set(ssoToken);
      this.apiTokenExpiresAtSignal.set(
        Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : Date.now() + 5 * 60_000,
      );
      this.teamsAuthErrorSignal.set('');
      this.teamsAuthenticatedSignal.set(true);
      if (tokenPayload['oid']) {
        this.teamsOidSignal.set(tokenPayload['oid']);
      }
      if (loginHint) {
        this.teamsEmailSignal.set(loginHint);
      }
      if (!this.teamsDisplayNameSignal()) {
        this.teamsDisplayNameSignal.set(tokenPayload['name'] || '');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.apiAccessTokenSignal.set(null);
      this.apiTokenExpiresAtSignal.set(0);
      this.teamsAuthenticatedSignal.set(false);
      this.teamsAuthErrorSignal.set(message || 'Unknown error');
      console.error('Teams SSO token acquisition failed:', error);
    }
  }

  private decodeJwtPayload(token: string): Record<string, string> {
    const payload = token.split('.')[1] || '';
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  }
}
