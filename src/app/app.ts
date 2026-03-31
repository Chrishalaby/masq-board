import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { AuthService } from './auth/auth.service';
import { UserService } from './services/user.service';
import { CallOverlayComponent } from './shared/call-overlay/call-overlay.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, /* NavBarComponent, */ CallOverlayComponent, Toast],
  template: `
    <p-toast />
    <div class="flex h-screen flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <!-- <app-nav-bar /> -->
      <div class="flex-1 overflow-auto">
        <router-outlet />
      </div>
    </div>
    <app-call-overlay />
  `,
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  async ngOnInit(): Promise<void> {
    document.documentElement.classList.add('dark');
    await this.auth.initialize();
    this.userService.loadCurrentUser();
  }
}
