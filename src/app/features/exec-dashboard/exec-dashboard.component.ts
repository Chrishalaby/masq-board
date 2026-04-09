import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-exec-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-4xl px-6 py-12 text-center">
      <div class="mb-4">
        <a routerLink="/" class="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >← Home</a
        >
      </div>
      <div class="rounded-xl border border-dashed border-gray-300 p-16 dark:border-gray-600">
        <i class="pi pi-chart-bar text-5xl text-gray-300 dark:text-gray-600"></i>
        <h1 class="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Exec Dashboard</h1>
        <p class="mt-2 text-gray-500 dark:text-gray-400">
          Coming soon — high-level executive insights and analytics.
        </p>
      </div>
    </div>
  `,
})
export class ExecDashboardComponent {}
