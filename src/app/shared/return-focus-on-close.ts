import { DOCUMENT } from '@angular/common';
import { effect, inject, Signal } from '@angular/core';

export function returnFocusOnClose(visible: Signal<boolean>): () => void {
  const document = inject(DOCUMENT);
  let trigger: HTMLElement | null = null;

  effect(() => {
    if (!visible()) return;
    const active = document.activeElement;
    trigger = active instanceof HTMLElement && active !== document.body ? active : null;
  });

  return () => {
    const target = trigger;
    trigger = null;
    if (target?.isConnected) target.focus();
  };
}
