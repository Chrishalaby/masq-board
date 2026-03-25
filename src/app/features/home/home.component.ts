import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-4xl px-6 py-12">
      <div class="mb-10 text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Welcome{{ auth.displayName() ? ', ' + auth.displayName() : '' }}
        </h1>
        <p class="mt-2 text-gray-500 dark:text-gray-400">What would you like to work on?</p>
      </div>

      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        @for (card of cards; track card.route) {
          <a
            [routerLink]="card.route"
            class="group rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-indigo-400 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500"
          >
            <div
              class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
              [class]="card.bgClass"
            >
              <i [class]="card.icon"></i>
            </div>
            <h2
              class="mb-1 text-lg font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400"
            >
              {{ card.title }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ card.description }}</p>
          </a>
        }
      </div>
    </div>
  `,
})
export class HomeComponent {
  protected readonly auth = inject(AuthService);

  readonly cards = [
    {
      title: 'Projects',
      description: 'View and manage projects, members, and integrations.',
      route: '/projects',
      icon: 'pi pi-briefcase',
      bgClass: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300',
    },
    {
      title: 'Tasks',
      description: 'Track tasks on the board or in a table view.',
      route: '/tasks',
      icon: 'pi pi-check-square',
      bgClass: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
    },
    {
      title: 'Notes',
      description: 'Private and shared notes for your team.',
      route: '/notes',
      icon: 'pi pi-file-edit',
      bgClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300',
    },
  ];
}
