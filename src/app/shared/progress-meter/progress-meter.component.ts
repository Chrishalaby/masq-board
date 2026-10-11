import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-progress-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    class: 'block overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'percent()',
    '[attr.aria-valuetext]': 'valueText()',
    '[attr.aria-label]': 'label()',
  },
  template: `
    <div
      class="h-full bg-[var(--p-primary-color)] transition-[width] duration-300"
      [style.width.%]="percent()"
    ></div>
  `,
})
export class ProgressMeterComponent {
  readonly percent = input.required<number>();
  readonly label = input.required<string>();
  readonly valueText = input<string>();
}
