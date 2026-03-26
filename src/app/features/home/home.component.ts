import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  styles: `
    :host {
      display: block;
      position: relative;
      min-height: 100%;
      overflow: hidden;
    }

    .gradient-bg {
      position: fixed;
      inset: 0;
      z-index: 0;
      background: linear-gradient(
        135deg,
        rgba(99, 102, 241, 0.08) 0%,
        rgba(139, 92, 246, 0.06) 25%,
        rgba(59, 130, 246, 0.05) 50%,
        rgba(16, 185, 129, 0.04) 75%,
        rgba(99, 102, 241, 0.08) 100%
      );
      background-size: 400% 400%;
      animation: gradientShift 20s ease infinite;
    }

    .gradient-orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.12;
      z-index: 0;
    }

    .orb-1 {
      width: 600px;
      height: 600px;
      top: -150px;
      right: -100px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.4), transparent 70%);
      animation: orbFloat1 25s ease-in-out infinite;
    }

    .orb-2 {
      width: 500px;
      height: 500px;
      bottom: -100px;
      left: -80px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.35), transparent 70%);
      animation: orbFloat2 30s ease-in-out infinite;
    }

    .orb-3 {
      width: 400px;
      height: 400px;
      top: 40%;
      left: 50%;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%);
      animation: orbFloat3 22s ease-in-out infinite;
    }

    @keyframes gradientShift {
      0%,
      100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
    }

    @keyframes orbFloat1 {
      0%,
      100% {
        transform: translate(0, 0) scale(1);
      }
      33% {
        transform: translate(-40px, 60px) scale(1.05);
      }
      66% {
        transform: translate(30px, -30px) scale(0.95);
      }
    }

    @keyframes orbFloat2 {
      0%,
      100% {
        transform: translate(0, 0) scale(1);
      }
      33% {
        transform: translate(50px, -40px) scale(1.08);
      }
      66% {
        transform: translate(-30px, 20px) scale(0.92);
      }
    }

    @keyframes orbFloat3 {
      0%,
      100% {
        transform: translate(-50%, 0) scale(1);
      }
      50% {
        transform: translate(-50%, -50px) scale(1.1);
      }
    }

    .content {
      position: relative;
      z-index: 1;
    }
  `,
  template: `
    <div class="gradient-bg" aria-hidden="true"></div>
    <div class="gradient-orb orb-1" aria-hidden="true"></div>
    <div class="gradient-orb orb-2" aria-hidden="true"></div>
    <div class="gradient-orb orb-3" aria-hidden="true"></div>

    <div class="content mx-auto max-w-4xl px-6 py-12">
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
            class="group rounded-xl border border-gray-200 bg-white/80 p-6 backdrop-blur-sm transition-all hover:border-indigo-400 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800/80 dark:hover:border-indigo-500"
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
