import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { AuthService } from './auth/auth.service';
import { UserService } from './services/user.service';
import { CallOverlayComponent } from './shared/call-overlay/call-overlay.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, /* NavBarComponent, */ CallOverlayComponent, Toast, Button],
  template: `
    <p-toast />
    <div class="flex h-screen flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <!-- <app-nav-bar /> -->
      @if (auth.inTeamsContext() && !auth.isAuthenticated() && auth.teamsAuthError()) {
        <div
          role="alert"
          class="flex flex-wrap items-center gap-3 border-b border-red-300 bg-red-50 px-6 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
        >
          <span class="flex-1">
            <strong>Teams could not sign you in.</strong>
            {{ auth.teamsAuthError() }} — if this keeps happening, send this message to IT.
          </span>
          <p-button
            label="Try again"
            size="small"
            severity="danger"
            [outlined]="true"
            (onClick)="retrySignIn()"
          />
        </div>
      }
      <div class="flex-1 overflow-auto">
        <router-outlet />
      </div>
    </div>
    <app-call-overlay />
  `,
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  async ngOnInit(): Promise<void> {
    document.documentElement.classList.add('dark');
    await this.auth.initialize();
    this.userService.loadCurrentUser();
  }

  async retrySignIn(): Promise<void> {
    await this.auth.login();
    if (this.auth.isAuthenticated()) {
      this.userService.loadCurrentUser();
    }
  }
}
