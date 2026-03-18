import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-nav-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Button],
  template: `
    <nav
      class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-2 dark:border-gray-700 dark:bg-gray-900"
    >
      <div class="flex items-center gap-6">
        <span class="text-lg font-bold text-indigo-600 dark:text-indigo-400">Masq Board</span>
        <a
          routerLink="/projects"
          routerLinkActive="text-indigo-600 dark:text-indigo-400 font-semibold"
          class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >Projects</a
        >
        <a
          routerLink="/tasks"
          routerLinkActive="text-indigo-600 dark:text-indigo-400 font-semibold"
          class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >Tasks</a
        >
      </div>
      <div class="flex items-center gap-3">
        @if (auth.isAuthenticated()) {
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ auth.displayName() }}</span>
          <p-button
            icon="pi pi-sign-out"
            [rounded]="true"
            [text]="true"
            size="small"
            (onClick)="auth.logout()"
            ariaLabel="Sign out"
          />
        } @else {
          <p-button label="Sign In" size="small" (onClick)="auth.login()" />
        }
      </div>
    </nav>
  `,
})
export class NavBarComponent {
  protected readonly auth = inject(AuthService);
}
