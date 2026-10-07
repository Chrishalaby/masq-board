import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

const mocks = vi.hoisted(() => {
  const msalClient = {
    initialize: vi.fn(),
    handleRedirectPromise: vi.fn(),
    getAllAccounts: vi.fn(),
    getActiveAccount: vi.fn(),
    setActiveAccount: vi.fn(),
    acquireTokenSilent: vi.fn(),
    loginPopup: vi.fn(),
  };

  return {
    msalClient,
    PublicClientApplication: vi.fn(function () {
      return msalClient;
    }),
    teams: {
      initialize: vi.fn(),
      getContext: vi.fn(),
      getAuthToken: vi.fn(),
    },
  };
});

vi.mock('@microsoft/teams-js', () => ({
  app: { initialize: mocks.teams.initialize, getContext: mocks.teams.getContext },
  authentication: { getAuthToken: mocks.teams.getAuthToken },
}));

vi.mock('@azure/msal-browser', () => ({
  BrowserCacheLocation: { LocalStorage: 'localStorage' },
  LogLevel: { Error: 0, Warning: 1 },
  PublicClientApplication: mocks.PublicClientApplication,
}));

const account = { name: 'Ada Lovelace', username: 'ada@example.test' };

function jwt(payload: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.msalClient.initialize.mockResolvedValue(undefined);
    mocks.msalClient.handleRedirectPromise.mockResolvedValue(null);
    mocks.msalClient.getAllAccounts.mockReturnValue([]);
    mocks.msalClient.getActiveAccount.mockReturnValue(null);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('inside Microsoft Teams', () => {
    const ssoToken = jwt({
      oid: 'teams-oid',
      preferred_username: 'grace@example.test',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    beforeEach(() => {
      mocks.teams.initialize.mockResolvedValue(undefined);
      mocks.teams.getContext.mockResolvedValue({
        user: { displayName: 'Grace Hopper' },
        page: { subPageId: 'ticket-42' },
      });
      mocks.teams.getAuthToken.mockResolvedValue(ssoToken);
    });

    it('signs in with the Teams SSO token', async () => {
      await service.initialize();

      expect(service.inTeamsContext()).toBe(true);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.displayName()).toBe('Grace Hopper');
      expect(service.userEmail()).toBe('grace@example.test');
      expect(service.teamsOid()).toBe('teams-oid');
      expect(service.teamsSubPageId()).toBe('ticket-42');
      expect(service.teamsAuthError()).toBe('');
      await expect(service.getApiAccessToken()).resolves.toBe(ssoToken);
    });

    it('never creates an MSAL client', async () => {
      await service.initialize();
      await service.getApiAccessToken();
      await service.login();
      await service.logout();

      expect(mocks.PublicClientApplication).not.toHaveBeenCalled();
    });

    it('retries Teams SSO on login after a failed attempt', async () => {
      mocks.teams.getAuthToken.mockRejectedValueOnce(new Error('consent required'));

      await service.initialize();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.teamsAuthError()).toBe('consent required');

      await service.login();

      expect(service.isAuthenticated()).toBe(true);
      expect(service.teamsAuthError()).toBe('');
      expect(mocks.PublicClientApplication).not.toHaveBeenCalled();
    });
  });

  describe('embedded in a host that is not Teams', () => {
    beforeEach(() => {
      vi.stubGlobal('top', {});
      mocks.teams.initialize.mockRejectedValue(new Error('No Parent window found'));
    });

    it('reports the Teams failure without creating an MSAL client', async () => {
      await service.initialize();

      expect(service.inTeamsContext()).toBe(true);
      expect(service.isAuthenticated()).toBe(false);
      expect(service.teamsAuthError()).toContain('No Parent window found');
      expect(mocks.PublicClientApplication).not.toHaveBeenCalled();
    });
  });

  describe('in a standalone browser tab', () => {
    beforeEach(() => {
      mocks.teams.initialize.mockRejectedValue(new Error('No Parent window found'));
    });

    it('gives no API token and loads no MSAL client before initialize has run', async () => {
      await expect(service.getApiAccessToken()).resolves.toBeNull();

      expect(mocks.PublicClientApplication).not.toHaveBeenCalled();
    });

    it('initializes MSAL before handling the redirect and reading accounts', async () => {
      await service.initialize();

      expect(service.inTeamsContext()).toBe(false);
      expect(service.isAuthenticated()).toBe(false);
      const [initialized] = mocks.msalClient.initialize.mock.invocationCallOrder;
      const [redirectHandled] = mocks.msalClient.handleRedirectPromise.mock.invocationCallOrder;
      const [accountsRead] = mocks.msalClient.getAllAccounts.mock.invocationCallOrder;
      expect(initialized).toBeLessThan(redirectHandled);
      expect(redirectHandled).toBeLessThan(accountsRead);
    });

    it('restores the cached account and uses it for silent API tokens', async () => {
      mocks.msalClient.getAllAccounts.mockReturnValue([account]);
      mocks.msalClient.acquireTokenSilent.mockResolvedValue({ accessToken: 'msal-token' });

      await service.initialize();

      expect(mocks.msalClient.setActiveAccount).toHaveBeenCalledWith(account);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.displayName()).toBe('Ada Lovelace');
      expect(service.userEmail()).toBe('ada@example.test');
      await expect(service.getApiAccessToken()).resolves.toBe('msal-token');
      expect(mocks.msalClient.acquireTokenSilent).toHaveBeenCalledWith({
        scopes: environment.msalConfig.apiScopes,
        account,
      });
    });

    it('gives no API token when the silent request fails', async () => {
      mocks.msalClient.getAllAccounts.mockReturnValue([account]);
      mocks.msalClient.acquireTokenSilent.mockRejectedValue(new Error('interaction_required'));

      await service.initialize();

      await expect(service.getApiAccessToken()).resolves.toBeNull();
    });

    it('signs in through the popup with the same MSAL client', async () => {
      mocks.msalClient.loginPopup.mockResolvedValue({ account });

      await service.initialize();
      await service.login();

      expect(mocks.msalClient.loginPopup).toHaveBeenCalledWith({
        scopes: environment.msalConfig.apiScopes,
      });
      expect(mocks.msalClient.setActiveAccount).toHaveBeenCalledWith(account);
      expect(service.isAuthenticated()).toBe(true);
      expect(mocks.PublicClientApplication).toHaveBeenCalledTimes(1);
      expect(mocks.msalClient.initialize).toHaveBeenCalledTimes(1);
    });
  });
});
