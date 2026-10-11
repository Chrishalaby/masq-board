import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { App } from './app';
import { AuthService } from './auth/auth.service';
import { UserService } from './services/user.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1>Routed page</h1>`,
})
class RoutedPage {}

function createAuthStub() {
  return {
    inTeamsContext: signal(false),
    isAuthenticated: signal(false),
    teamsAuthError: signal(''),
    initialize: vi.fn<() => Promise<void>>(),
    login: vi.fn<() => Promise<void>>(),
  };
}

describe('App', () => {
  let auth: ReturnType<typeof createAuthStub>;
  let users: { loadCurrentUser: ReturnType<typeof vi.fn<() => void>> };

  async function render(): Promise<ComponentFixture<App>> {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture;
  }

  function banner(fixture: ComponentFixture<App>): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
  }

  function failTeamsSignIn(message: string): void {
    auth.inTeamsContext.set(true);
    auth.isAuthenticated.set(false);
    auth.teamsAuthError.set(message);
  }

  beforeEach(() => {
    auth = createAuthStub();
    auth.initialize.mockResolvedValue(undefined);
    auth.login.mockResolvedValue(undefined);
    users = { loadCurrentUser: vi.fn<() => void>() };
    document.documentElement.classList.remove('dark');

    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([{ path: '', component: RoutedPage }]),
        MessageService,
        { provide: AuthService, useValue: auth },
        { provide: UserService, useValue: users },
      ],
    });
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  describe('shell', () => {
    it('renders routed pages inside a single main landmark', async () => {
      const fixture = await render();
      await TestBed.inject(Router).navigateByUrl('/');
      await fixture.whenStable();

      const landmarks = (fixture.nativeElement as HTMLElement).querySelectorAll('main');
      expect(landmarks).toHaveLength(1);
      expect(landmarks[0].querySelector('router-outlet')).not.toBeNull();
      expect(landmarks[0].querySelector('h1')?.textContent).toBe('Routed page');
    });

    it('switches the document to the dark theme', async () => {
      await render();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('waits for auth to initialize before loading the current user', async () => {
      let finishInitialize = (): void => undefined;
      auth.initialize.mockReturnValue(
        new Promise<void>((resolve) => {
          finishInitialize = resolve;
        }),
      );

      await render();

      expect(auth.initialize).toHaveBeenCalledTimes(1);
      expect(users.loadCurrentUser).not.toHaveBeenCalled();

      finishInitialize();

      await vi.waitFor(() => expect(users.loadCurrentUser).toHaveBeenCalledTimes(1));
    });
  });

  describe('Teams sign-in error banner', () => {
    it.each([
      {
        situation: 'outside Teams',
        inTeams: false,
        authenticated: false,
        error: 'consent required',
      },
      {
        situation: 'once the user is signed in',
        inTeams: true,
        authenticated: true,
        error: 'consent required',
      },
      { situation: 'when Teams reported no error', inTeams: true, authenticated: false, error: '' },
    ])('stays hidden $situation', async ({ inTeams, authenticated, error }) => {
      auth.inTeamsContext.set(inTeams);
      auth.isAuthenticated.set(authenticated);
      auth.teamsAuthError.set(error);

      const fixture = await render();

      expect(banner(fixture)).toBeNull();
    });

    it('shows the Teams error when sign-in failed inside Teams', async () => {
      failTeamsSignIn('consent required');

      const fixture = await render();

      expect(banner(fixture)?.textContent).toContain('Teams could not sign you in.');
      expect(banner(fixture)?.textContent).toContain('consent required');
    });

    it('appears when the error is reported after the shell has rendered', async () => {
      const fixture = await render();
      expect(banner(fixture)).toBeNull();

      failTeamsSignIn('Teams did not respond');
      await fixture.whenStable();

      expect(banner(fixture)?.textContent).toContain('Teams did not respond');
    });

    it('calls auth.login() when "Try again" is clicked', async () => {
      failTeamsSignIn('consent required');
      const fixture = await render();

      const tryAgain = banner(fixture)?.querySelector('button');
      expect(tryAgain?.textContent).toContain('Try again');
      tryAgain?.click();

      expect(auth.login).toHaveBeenCalledTimes(1);
    });

    it('disappears and loads the current user once a retry signs the user in', async () => {
      failTeamsSignIn('consent required');
      auth.login.mockImplementation(async () => {
        auth.isAuthenticated.set(true);
        auth.teamsAuthError.set('');
      });
      const fixture = await render();
      users.loadCurrentUser.mockClear();

      await fixture.componentInstance.retrySignIn();
      await fixture.whenStable();

      expect(banner(fixture)).toBeNull();
      expect(users.loadCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('stays with the new error and loads no user when the retry fails', async () => {
      failTeamsSignIn('consent required');
      auth.login.mockImplementation(async () => auth.teamsAuthError.set('still blocked'));
      const fixture = await render();
      users.loadCurrentUser.mockClear();

      await fixture.componentInstance.retrySignIn();
      await fixture.whenStable();

      expect(banner(fixture)?.textContent).toContain('still blocked');
      expect(users.loadCurrentUser).not.toHaveBeenCalled();
    });
  });
});
