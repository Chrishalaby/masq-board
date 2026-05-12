import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Badge } from 'primeng/badge';
import { Button } from 'primeng/button';
import { AuthService } from '../../auth/auth.service';
import { NotificationService } from '../../services/notification.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-nav-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Button, Badge],
  template: `
    <nav
      class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-2 dark:border-gray-700 dark:bg-gray-900"
    >
      <div class="flex items-center gap-6">
        <span class="text-lg font-bold text-indigo-600 dark:text-indigo-400">
          <a routerLink="/" class="hover:opacity-80">MASQ Collaboration Suite</a>
        </span>
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
        <a
          routerLink="/personal-assistant"
          routerLinkActive="text-indigo-600 dark:text-indigo-400 font-semibold"
          class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >Personal Assistant</a
        >
        <a
          routerLink="/notes"
          routerLinkActive="text-indigo-600 dark:text-indigo-400 font-semibold"
          class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >Notes</a
        >
        <a
          routerLink="/departments"
          routerLinkActive="text-indigo-600 dark:text-indigo-400 font-semibold"
          class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >Departments</a
        >
        @if (userService.currentUser()?.isAdmin) {
          <a
            routerLink="/admin"
            routerLinkActive="text-indigo-600 dark:text-indigo-400 font-semibold"
            class="text-sm font-medium text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
            >Admin</a
          >
        }
        @if (showExecDashboard()) {
          <a
            routerLink="/exec-dashboard"
            routerLinkActive="text-indigo-600 dark:text-indigo-400 font-semibold"
            class="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >Dashboard</a
          >
        }
        <a
          routerLink="/notifications"
          routerLinkActive="text-indigo-600 dark:text-indigo-400 font-semibold"
          class="relative text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          aria-label="Notification Center"
        >
          <span>Notifications</span>
          @if (notificationService.unreadCount() > 0) {
            <p-badge [value]="notificationService.unreadCount()" severity="danger" class="ml-1" />
          }
        </a>
      </div>
      <div class="flex items-center gap-3">
        @if (auth.isAuthenticated()) {
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ auth.displayName() }}</span>
          <!-- Sign out button hidden for now
          <p-button
            icon="pi pi-sign-out"
            [rounded]="true"
            [text]="true"
            size="small"
            (onClick)="auth.logout()"
            ariaLabel="Sign out"
          />
          -->
        } @else if (!auth.inTeamsContext()) {
          <p-button label="Sign In" size="small" (onClick)="auth.login()" />
        } @else {
          <span class="text-sm text-gray-500 dark:text-gray-400">Using Teams SSO</span>
        }
      </div>
    </nav>
  `,
})
export class NavBarComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly userService = inject(UserService);
  protected readonly notificationService = inject(NotificationService);

  protected readonly showExecDashboard = computed(() => {
    const user = this.userService.currentUser();
    return user?.isGeneralSupervisor || user?.canAccessExecDashboard || user?.isAdmin;
  });

  ngOnInit(): void {
    this.notificationService.loadNotifications();
  }
}
