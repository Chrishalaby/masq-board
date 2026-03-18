import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { NavBarComponent } from './shared/nav-bar/nav-bar.component';
import { CallOverlayComponent } from './shared/call-overlay/call-overlay.component';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBarComponent, CallOverlayComponent, Toast],
  template: `
    <p-toast />
    <div class="flex h-screen flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <app-nav-bar />
      <div class="flex-1 overflow-auto">
        <router-outlet />
      </div>
    </div>
    <app-call-overlay />
  `,
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.initialize();
  }
}
